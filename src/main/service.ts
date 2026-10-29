import {minimizeDiagnosticHistory} from './diagnostic-privacy';
import {countryName} from '../shared/countries';
import {LocationWorkflow} from './location-workflow';
import {parseProxyImport} from '../shared/proxy-import';
import {proxyHostSchema} from '../shared/schema';
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID, createHash} from 'node:crypto';
import {isIP} from 'node:net';
import {gzipSync, gunzipSync} from 'node:zlib';
import {chromium, type BrowserContext, type Browser, type Page} from 'playwright';
import {z} from 'zod';
import {observeFingerprint} from './fingerprint-observation';
import {fingerprintCapabilities} from '../shared/fingerprint-capabilities';
import {fingerprintIssues, observedFingerprintIssues} from './fingerprint';
import {encryptBackup, decryptBackup} from './encrypted-backup';
import {Database} from './database';
import {runAutomation, type Job} from './automation';
import {requestSchema} from '../shared/schema';
import {ownedProcesses, scanProcesses} from './process-ownership';
import {verifyRuntime} from '../shared/runtime-integrity';
import linuxManifest from '../../scripts/runtime-manifests/linux-x64-chromium-156.0.8078.4.json' with {type: 'json'};
import windowsManifest from '../../scripts/runtime-manifests/win32-x64-chromium-156.0.8078.4.json' with {type: 'json'};
import {configSchema, profileInput, profileSchema, proxyInput, proxySchema, type Profile, type Snapshot, type Request, type BrowserConfig} from '../shared/schema';

export interface Secrets {
  seal(value: string): Promise<Buffer>;
  open(value: Buffer): Promise<string>;
}

export type LockState = 'acquiring' | 'starting' | 'running' | 'stopping' | 'released';

export interface LockMeta {
  format: 'phantom-lock';
  version: 1;
  electronPid: number;
  chromiumPid?: number;
  profileId: string;
  launchId: string;
  state: LockState;
  createdAt: string;
  updatedAt: string;
  browserMayExist?: boolean;
  chromiumBirth?: string;
}

interface Runtime {
  context?: BrowserContext;
  launchId: string;
  closing: boolean;
  pid?: number;
  electronPid: number;
  ready?: Promise<BrowserContext>;
  stopping?: Promise<void>;
  browserMayExist?: boolean;
  closed?: boolean;
  settling?: Promise<void>;
  recoveryRequired?: boolean;
}

export const BACKUP_LIMITS = {archive: 400 * 1024 * 1024, decompressed: 400 * 1024 * 1024, total: 256 * 1024 * 1024, file: 64 * 1024 * 1024, count: 50000};

const manifestSchema = z.strictObject({
  format: z.literal('phantom-backup'),
  version: z.literal(1),
  engine: z.string().max(200),
  profile: profileInput,
  files: z.array(z.strictObject({
    name: z.string().max(1024),
    size: z.number().int().min(0).max(BACKUP_LIMITS.file),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    data: z.string().max(Math.ceil(BACKUP_LIMITS.file / 3) * 4),
  })).max(BACKUP_LIMITS.count),
});

const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
const now = () => new Date().toISOString();

export class Service {
  readonly locations:LocationWorkflow;
  acceptingUpdates(){return !this.shuttingDown&&!this.closedForUpdates;}
  assertLocationIdle(id:string){this.assertIdle(id);}
  readonly running = new Map<string, Runtime>();
  readonly jobs = new Map<string, Job>();
  private busy = new Set<string>();
  private probeSlots=0;
  private probeBrowsers=new Set<Browser>();
  private logs: Snapshot['logs'] = [];
  private shuttingDown = false;
  private closedForUpdates = false;
  private shutdownWork?: Promise<void>;

  constructor(readonly db: Database, readonly root: string, private secrets: Secrets, private headless = false,readonly production=false) {
    this.locations=new LocationWorkflow(this,secrets);
    fs.mkdirSync(path.join(root, 'profiles'), {recursive: true});
    fs.mkdirSync(path.join(root, 'reports'), {recursive: true});
    this.recoverOrphans();
    // A persisted pending probe belongs to the previous process, not this one.
    for(const row of this.db.rows('SELECT id,data FROM proxies')){
      const p=proxySchema.parse(JSON.parse(String(row.data)));
      if(p.connection?.state==='connecting')this.db.transaction(()=>this.db.run('UPDATE proxies SET data=? WHERE id=?',[JSON.stringify({...p,connection:{...p.connection,state:'connection-failed',ip:null,country:null,timezone:null,locale:null,checkedAt:now(),message:'Previous connection test was interrupted. Retry to verify the route.'}}),String(row.id)]));
    }
    for (const p of this.profiles()) {
      if (!fs.existsSync(this.directory(p.id))) {
        this.log(`Missing storage directory for profile ${p.id}`);
      }
    }
  }

  log(message: string) {
    this.logs.unshift({time: now(), message});
    this.logs = this.logs.slice(0, 300);
    try {fs.appendFileSync(path.join(this.root, 'application.log'), JSON.stringify({time: now(), message}) + '\n', {mode: 0o600});
    const log = path.join(this.root, 'application.log');
    if (fs.statSync(log).size > 2_000_000) {
      fs.renameSync(log, log + '.previous');
    }} catch { /* logging must not break lifecycle cleanup */ }
  }

  directory(id: string) {
    return path.join(this.root, 'profiles', z.uuid().parse(id));
  }

  profiles(): Profile[] {
    return this.db.rows('SELECT data FROM profiles').map(r => {
      const p = profileSchema.parse(JSON.parse(String(r.data)));
      return {...p, status: this.running.get(p.id)?.recoveryRequired ? 'error' : this.running.has(p.id) ? this.running.get(p.id)?.closing ? 'stopping' : this.running.get(p.id)?.context ? 'running' : 'starting' : p.lastError ? 'error' : 'stopped'};
    });
  }

  profile(id: string) {
    const p = this.profiles().find(p => p.id === id);
    if (!p) throw Error('Profile not found');
    return p;
  }

  private save(p: Profile) {
    this.db.transaction(() => {
      this.db.run('INSERT INTO profiles(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', [p.id, JSON.stringify(p)]);
      this.db.run('DELETE FROM profile_tags WHERE profile_id=?', [p.id]);
      for (const tag of new Set(p.tags)) {
        this.db.run('INSERT INTO profile_tags VALUES(?,?)', [p.id, tag]);
      }
    });
  }

  private patch(id: string, fields: Partial<Profile>) {
    if (this.closedForUpdates) return;
    this.save({...this.profile(id), ...fields, updatedAt: now()});
  }

  create(input: unknown) {
    if (this.shuttingDown) throw Error('Application is shutting down');
    const v = profileInput.parse(input);
    if (v.proxyId && !this.db.rows('SELECT id FROM proxies WHERE id=?', [v.proxyId]).length) {
      throw Error('Proxy not found');
    }
    const id = randomUUID();
    fs.mkdirSync(this.directory(id));
    const p: Profile = {
      ...v,requestedCountryName:v.requestedCountry?countryName(v.requestedCountry):null,requestedCountry:v.requestedCountry??null,autoLocation:v.autoLocation??false,group:v.group??'', restoreSession:v.restoreSession??false, description:v.description??'', homepage:v.homepage??'', startupUrls:v.startupUrls??[], archivedAt:null, lastUsed:null, id, createdAt: now(), updatedAt: now(), lastLaunch: null,
      engineVersion: 'Not launched', lastError: null, status: 'stopped',
      directory: this.directory(id),
    };
    try {
      this.save(p);
      return p;
    } catch (e) {
      fs.rmSync(this.directory(id), {recursive: true, force: true});
      throw e;
    }
  }

  archive(id: string, archived: boolean) {
    this.assertIdle(id);
    this.patch(id, {archivedAt: archived ? now() : null});
    this.log(`Profile ${id} ${archived ? 'archived' : 'unarchived'}`);
  }

  async home(id: string) {
    const p = this.profile(id);
    if (!p.homepage) throw Error('Configure a homepage first');
    try{await this.page(id).goto(p.homepage, {timeout:15000, waitUntil:'domcontentloaded'});}catch{throw Error('Homepage navigation failed; sensitive details withheld');}
    this.patch(id, {lastUsed:now()});
  }

  edit(id: string, input: unknown) {
    this.assertIdle(id);
    const v = profileInput.parse(input);
    if (v.proxyId && !this.db.rows('SELECT id FROM proxies WHERE id=?', [v.proxyId]).length) {
      throw Error('Proxy not found');
    }
    const country=v.requestedCountry===undefined?this.profile(id).requestedCountry:v.requestedCountry;
    this.patch(id, {...v,requestedCountry:country,requestedCountryName:country?countryName(country):null});
  }

  private assertIdle(id: string, allowLock = false) {
    this.profile(id);
    if (this.shuttingDown || this.running.has(id) || this.busy.has(id) || (!allowLock && fs.existsSync(path.join(this.directory(id), '.phantom-lock')))) {
      throw Error('Stop the profile and wait for pending operations first');
    }
  }

  async duplicate(id: string) {
    this.assertIdle(id);
    this.busy.add(id);
    let copy: Profile | undefined;
    try {
      const p = this.profile(id);
      copy = this.create({...profileInput.parse(pickInput(p)), name: p.name + ' (copy)'});
      fs.cpSync(this.directory(id), this.directory(copy.id), {
        recursive: true,
        filter: source => !['.phantom-lock', '.phantom-recovery', 'SingletonLock', 'SingletonSocket', 'SingletonCookie'].includes(path.basename(source)) && !fs.lstatSync(source).isSymbolicLink(),
      });
      return copy;
    } catch (e) {
      if (copy) {
        this.db.transaction(() => this.db.run('DELETE FROM profiles WHERE id=?', [copy!.id]));
        fs.rmSync(this.directory(copy.id), {recursive: true, force: true});
      }
      throw e;
    } finally {
      this.busy.delete(id);
    }
  }

  delete(id: string, confirmed: boolean) {
    if (!confirmed) throw Error('Deletion requires explicit user confirmation');
    this.assertIdle(id);
    const dir = this.directory(id);
    const trash = dir + '.deleted';
    if (fs.existsSync(dir)) fs.renameSync(dir, trash);
    try {
      this.db.transaction(() => this.db.run('DELETE FROM profiles WHERE id=?', [id]));
    } catch (e) {
      if (fs.existsSync(trash)) fs.renameSync(trash, dir);
      throw e;
    }
    fs.rmSync(trash, {recursive: true, force: true});
    this.log(`Deleted profile ${id}`);
  }

  private readLock(id: string): LockMeta {
    const file = path.join(this.directory(id), '.phantom-lock', 'metadata.json');
    if (fs.lstatSync(path.dirname(file)).isSymbolicLink() || fs.lstatSync(file).isSymbolicLink()) throw Error('Profile is locked: unsafe metadata');
    if (fs.statSync(file).size > 16384) throw Error('Profile lock metadata exceeds safety limit');
    const schema = z.strictObject({format: z.literal('phantom-lock'), version: z.literal(1), electronPid: z.number().int().positive(), chromiumPid: z.number().int().positive().optional(), profileId: z.literal(id), launchId: z.uuid(), state: z.enum(['acquiring', 'starting', 'running', 'stopping', 'released']), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(), browserMayExist: z.boolean().optional(), chromiumBirth: z.string().optional()});
    return schema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
  }

  private isProcessAlive(pid: number): boolean {
    try {process.kill(pid, 0); return true;} catch (e) {return (e as NodeJS.ErrnoException).code !== 'ESRCH';}
  }

  private recoverable(id: string): boolean {
    const dir = this.directory(id);
    const lock = path.join(dir, '.phantom-lock');
    if (fs.lstatSync(lock).isSymbolicLink()) return false;
    try {
      const meta = this.readLock(id);
      if (this.isProcessAlive(meta.electronPid)) return false;
      // Neither a dead Electron PID nor a missing Chromium PID proves browser exit.
      const processes = ownedProcesses(meta.launchId, dir, chromium.executablePath());
      if (!processes || processes.length) return false;
      if (meta.chromiumPid && this.isProcessAlive(meta.chromiumPid)) return false;
      return meta.browserMayExist !== undefined || meta.state === 'acquiring' || meta.state === 'released';
    } catch {
      // Legacy PID locks can be recovered only with a successful OS scan and no
      // browser using this user-data-dir. Incomplete metadata is not a legacy lock.
      const legacy = path.join(lock, 'pid');
      if (fs.existsSync(path.join(lock, 'metadata.json')) || !fs.existsSync(legacy) || fs.lstatSync(legacy).isSymbolicLink()) return false;
      const pid = Number(fs.readFileSync(legacy, 'utf8').trim());
      const processes = scanProcesses();
      return Number.isSafeInteger(pid) && pid > 0 && !this.isProcessAlive(pid) && processes !== null && !processes.some(p => p.command.includes(dir)) && !['SingletonLock', 'SingletonCookie', 'SingletonSocket'].some(n => fs.existsSync(path.join(dir, n)));
    }
  }

  private acquire(id: string, launchId: string) {
    const dir = this.directory(id);
    if (fs.lstatSync(dir).isSymbolicLink() || !fs.lstatSync(dir).isDirectory()) throw Error('Profile storage is inaccessible or unsafe');
    const gate = path.join(dir, '.phantom-recovery');
    try {fs.mkdirSync(gate);} catch {throw Error('Profile is locked by another operation');}
    try {
      const lockDir = path.join(dir, '.phantom-lock');
      if (fs.existsSync(lockDir)) {
        if (!this.recoverable(id)) throw Error('Profile is locked; browser ownership or exit could not be verified');
        fs.rmSync(lockDir, {recursive: true});
      }
      fs.mkdirSync(lockDir);
      const meta: LockMeta = {format: 'phantom-lock', version: 1, electronPid: process.pid, profileId: id, launchId, state: 'acquiring', createdAt: now(), updatedAt: now(), browserMayExist: false};
      try {fs.writeFileSync(path.join(lockDir, 'metadata.json'), JSON.stringify(meta), {flag: 'wx', mode: 0o600});}
      catch {fs.rmSync(lockDir, {recursive: true, force: true}); throw Error('Unable to persist profile lock');}
    } finally {fs.rmSync(gate, {recursive: true, force: true});}
  }

  private updateLock(id: string, r: Runtime, state: LockState) {
    const meta = this.readLock(id);
    if (meta.launchId !== r.launchId || meta.electronPid !== process.pid) throw Error('Profile lock ownership changed');
    const owned = ownedProcesses(r.launchId, this.directory(id), chromium.executablePath());
    meta.chromiumPid = r.pid;
    meta.chromiumBirth = owned?.find(p => p.pid === r.pid)?.birth;
    meta.browserMayExist = r.browserMayExist ?? false;
    meta.state = state; meta.updatedAt = now();
    const file = path.join(this.directory(id), '.phantom-lock', 'metadata.json');
    const tmp = file + '.' + randomUUID() + '.partial';
    try {fs.writeFileSync(tmp, JSON.stringify(meta), {flag: 'wx', mode: 0o600}); fs.renameSync(tmp, file);}
    finally {fs.rmSync(tmp, {force: true});}
  }

  private release(id: string, r: Runtime) {
    try {
      const meta = this.readLock(id);
      if (meta.launchId !== r.launchId || meta.electronPid !== process.pid) {this.patch(id,{lastError:'Browser lock ownership changed; lock retained for manual recovery.'});this.log(`Profile ${id} lock ownership changed; retained`);return;}
      fs.rmSync(path.join(this.directory(id), '.phantom-lock'), {recursive: true});
    } catch {this.patch(id,{lastError:'Browser lock could not be released safely; manual recovery required.'});this.log(`Profile ${id} lock retained; manual recovery may be required`);}
  }

  private recoverOrphans() {
    for (const p of this.profiles()) {
      const lock = path.join(this.directory(p.id), '.phantom-lock');
      if (!fs.existsSync(lock)) {
        this.db.transaction(() => this.db.run("UPDATE launches SET ended_at=?,outcome='interrupted' WHERE profile_id=? AND ended_at IS NULL", [now(), p.id]));
        continue;
      }
      this.db.transaction(() => this.db.run("UPDATE launches SET outcome='recovery_required' WHERE profile_id=? AND ended_at IS NULL", [p.id]));
      // Do not race another acquiring service. Startup only diagnoses; acquisition
      // performs stale cleanup under the per-profile recovery gate.
      this.patch(p.id, {lastError: 'Existing browser lock requires ownership verification before launch.'});
    }
  }

  private verifyBrowserRuntime() {
    try {
      const executable = chromium.executablePath();
      verifyRuntime(path.dirname(path.dirname(executable)), process.platform === 'win32' ? windowsManifest : linuxManifest);
    } catch {throw Error('Chromium runtime integrity verification failed. Repair the application runtime before launching.');}
  }

  async proxyOptions(id: string | null) {
    if (!id) return undefined;
    const row = this.db.rows('SELECT data,secret FROM proxies WHERE id=?', [id])[0];
    if (!row) throw Error('Assigned proxy is missing');
    const p = proxySchema.parse(JSON.parse(String(row.data)));
    let credentials: {username?: string; password?: string} = {};
    try {if (row.secret) credentials = z.object({username: z.string().optional(), password: z.string().optional()}).parse(JSON.parse(await this.secrets.open(Buffer.from(row.secret as Uint8Array))));}
    catch {throw Error('Secure credential decryption unavailable; no plaintext fallback');}
    const host=proxyHostSchema.parse(p.host); // validate retained legacy records too
    return {
      server: `${p.protocol}://${host.includes(':') ? '[' + host + ']' : host}:${p.port}`,
      ...credentials,
    };
  }

  async launch(id: string): Promise<BrowserContext> {
    this.assertIdle(id, true);
    const p = this.profile(id);
    if (p.archivedAt) throw Error('Restore the archived profile before launching');
    if (this.running.size >= this.maxConcurrent()) throw Error('Concurrent profile limit reached; change Settings if resources permit');
    configSchema.parse(p.config);
    const issues=fingerprintIssues(p.config,process.platform,linuxManifest.version);
    if(issues.length)throw Error(issues.join('; '));
    const r: Runtime = {launchId: randomUUID(), closing: false, electronPid: process.pid, browserMayExist: false};
    this.acquire(id, r.launchId);
    this.running.set(id, r);
    r.ready = this.startBrowser(id, p, r);
    return r.ready;
  }

  private async startBrowser(id: string, p: Profile, r: Runtime): Promise<BrowserContext> {
    let countryError:string|undefined;
    try {
      this.db.transaction(() => {this.db.run("UPDATE launches SET ended_at=?,outcome='recovered' WHERE profile_id=? AND ended_at IS NULL", [now(), id]); this.db.run('INSERT INTO launches VALUES(?,?,?,NULL,NULL)', [r.launchId, id, now()]);});
      this.verifyBrowserRuntime();
      if(p.autoLocation&&p.requestedCountry){
        if(!p.proxyId){countryError='Country-managed profile has no proxy. Reconnect before launching.';throw Error('Country verification failed');}
        const connection=await this.locations.verify(p.proxyId,p.requestedCountry);
        if(connection.state!=='connected'){countryError=connection.message;throw Error('Country verification failed');}
      }
      const proxy = await this.proxyOptions(p.proxyId);
      if (r.closing || this.shuttingDown) throw Error('Launch cancelled');
      r.browserMayExist = true;
      this.updateLock(id, r, 'starting');
      const context = await chromium.launchPersistentContext(this.directory(id), {
        headless: this.headless, chromiumSandbox: !this.headless,
        ignoreDefaultArgs: ['--password-store=basic', '--use-mock-keychain'],
        proxy, ...this.options(p.config), acceptDownloads: false, timeout: 30000,
        executablePath: chromium.executablePath(), args: [`--phantom-launch-id=${r.launchId}`, ...(p.restoreSession?['--restore-last-session']:[]), ...(p.config.webrtcPolicy === 'disable-non-proxied-udp' ? ['--force-webrtc-ip-handling-policy=disable_non_proxied_udp'] : []), ...(p.config.webglPolicy === 'limit-html-canvas' ? ['--disable-webgl'] : [])],
      });
      r.context = context;
      context.on('close', () => {r.closed = true; r.settling = this.settleExit(id, r, r.closing ? 'stopped' : 'closed'); void r.settling.catch(() => {});});
      const browser = context.browser();
      if (browser?.close) {
        const close = browser.close.bind(browser);
        browser.close = async options => {await close(options); if (r.settling) await r.settling;};
      }
      try {
        const session = await context.browser()!.newBrowserCDPSession();
        try {const info = await session.send('SystemInfo.getProcessInfo'); r.pid = info.processInfo.find(p => p.type === 'browser')?.id;}
        finally {await session.detach();}
      } catch { /* OS ownership scan below is independent of CDP */ }
      const owned = ownedProcesses(r.launchId, this.directory(id), chromium.executablePath());
      r.pid = owned?.find(p => p.pid === r.pid)?.pid ?? owned?.[0]?.pid;
      this.updateLock(id, r, 'running');
      if (r.closing || this.shuttingDown) {await this.closeRuntime(id, r); throw Error('Launch cancelled');}
      this.patch(id, {engineVersion: context.browser()?.version() ?? 'Unknown', lastLaunch: now(), lastUsed:now(), lastError: null});
      const page = context.pages()[0] ?? await context.newPage();
      const restoredSession = p.restoreSession && context.pages().some(tab=>!['about:blank','chrome://newtab/'].includes(tab.url()));
      const urls = restoredSession ? [] : p.startupUrls.length ? p.startupUrls : p.launchUrl ? [p.launchUrl] : p.homepage ? [p.homepage] : [];
      for (const [index,url] of urls.entries()) {
        if (r.closing || this.shuttingDown) throw Error('Launch cancelled');
        const tab = index === 0 ? page : await context.newPage();
        await tab.goto(url, {waitUntil:'domcontentloaded', timeout:15000});
      }
      if (r.closing || this.shuttingDown || r.closed) throw Error('Launch cancelled');
      this.log(`Launched profile ${id}`);
      return context;
    } catch {
      if (r.context && !r.closed) await this.closeRuntime(id, r).catch(() => {});
      this.finished(id, r, r.closing ? 'cancelled' : 'failed');
      this.patch(id, {lastError: countryError??'Browser launch failed or was cancelled. Check runtime integrity, storage, proxy and destination availability.'});
      this.log(`Launch failed for profile ${id}`);
      throw Error(countryError??'Browser launch failed; see profile error. No credentials were logged.');
    }
  }

  private options(c: BrowserConfig) {
    return {
      viewport: c.viewport,
      deviceScaleFactor: c.deviceScaleFactor ?? 1,
      screen: c.screen,
      locale: c.locale,
      timezoneId: c.timezoneId,
      colorScheme: c.colorScheme,
      reducedMotion: c.reducedMotion,
      extraHTTPHeaders: c.doNotTrack === 'request' ? {'DNT':'1'} : undefined,
      userAgent: c.userAgent,
      geolocation: c.geolocation,
      permissions: c.geolocation && c.geolocationPermission === 'allow' ? ['geolocation'] : [],
    };
  }

  private finished(id: string, r: Runtime, outcome: string) {
    if (this.closedForUpdates || this.running.get(id) !== r) return;
    const owned = r.browserMayExist ? ownedProcesses(r.launchId, this.directory(id), chromium.executablePath()) : [];
    const provenExit = owned !== null && owned.length === 0;
    if (!provenExit || (r.pid && this.isProcessAlive(r.pid))) return;
    this.running.delete(id);
    this.patch(id, {lastUsed:now()});
    this.release(id, r);
    this.db.transaction(() => this.db.run('UPDATE launches SET ended_at=?,outcome=? WHERE id=? AND ended_at IS NULL', [now(), outcome, r.launchId]));
    const job = this.jobs.get(id); if (job?.running) job.cancelled = true;
    this.log(`Profile ${id} ${outcome}`);
  }

  async bounded<T>(work: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {return await Promise.race([work, new Promise<never>((_, reject) => {timer = setTimeout(() => reject(Error('Browser operation timed out; lock retained')), ms);})]);}
    finally {if (timer) clearTimeout(timer);}
  }

  private async closeRuntime(id: string, r: Runtime) {
    r.closing = true;
    try {this.updateLock(id, r, 'stopping');} catch { /* retain changed/missing lock */ }
    if (r.context && !r.closed) await this.bounded(r.context.close(), 5000);
    await this.settleExit(id, r, 'stopped');
  }

  private async settleExit(id: string, r: Runtime, outcome: string) {
    // Transport close and OS process exit can be slightly separated.
    const deadline = Date.now() + 1000;
    for (let i = 0; i < 20 && Date.now() <= deadline && this.running.get(id) === r; i++) {
      this.finished(id, r, outcome);
      if (this.running.get(id) === r) await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (this.running.get(id) === r) {
      r.recoveryRequired = true;
      this.patch(id, {lastError: 'Browser exit unknown; profile lock retained for safe recovery'});
      throw Error('Browser exit unknown; profile lock retained for safe recovery');
    }
  }

  async stop(id: string) {
    const r = this.running.get(id); if (!r) return;
    if (r.stopping) return r.stopping;
    r.closing = true;
    const job = this.jobs.get(id); if (job?.running) job.cancelled = true;
    r.stopping = (async () => {
      if (!r.context && r.ready) await this.bounded(r.ready.catch(() => undefined), 35000);
      if (this.running.get(id) === r) await this.closeRuntime(id, r);
    })();
    try {await r.stopping;} catch {r.recoveryRequired = true; this.patch(id, {lastError: 'Browser close failed or timed out; lock retained.'}); throw Error('Browser close failed or timed out; lock retained.');} finally {r.stopping = undefined;}
  }

  async shutdown() {
    if (this.shutdownWork) return this.shutdownWork;
    this.shuttingDown = true;
    this.shutdownWork = this.bounded(Promise.allSettled([...this.running.keys()].map(id => this.stop(id)).concat([...this.probeBrowsers].map(async browser=>{await this.bounded(browser.close(),5000);this.probeBrowsers.delete(browser);}))).then(results => {const failed=results.filter(r=>r.status==='rejected').length;if(failed)this.log(`Shutdown incomplete: ${failed} browser close operation(s) failed; uncertain locks retained`);}), 41000).catch(() => {this.log('Shutdown deadline reached; uncertain browser locks retained');}).finally(async () => {await this.locations.close();this.closedForUpdates = true;});
    return this.shutdownWork;
  }

  private async prepareProxySave(id: string | undefined, input: unknown) {
    const p = proxyInput.parse(input);
    const key = id ?? randomUUID();
    const old = id ? this.db.rows('SELECT data,secret FROM proxies WHERE id=?', [id])[0] : undefined;
    if (id && !old) throw Error('Proxy not found');
    if (this.profiles().some(v => v.proxyId === key && this.running.has(v.id))) {
      throw Error('Stop assigned profiles before editing a proxy');
    }
    if (p.protocol === 'socks5' && !p.username && !p.password && old?.secret && p.username === undefined && p.password === undefined) throw Error('Clear stored credentials before switching to SOCKS5');
    const explicit = p.username !== undefined || p.password !== undefined;
    let secret = old?.secret ?? null;
    if (explicit) {
      if (!p.username && !p.password) secret = null;
      else {
        try {secret = await this.bounded(this.secrets.seal(JSON.stringify({username: p.username, password: p.password})), 5000);}
        catch {throw Error('Windows DPAPI unavailable; credentials were not saved and no plaintext fallback was used');}
      }
    }
    if(this.shuttingDown)throw Error('Application is shutting down');
    if(this.profiles().some(v=>v.proxyId===key&&this.running.has(v.id)))throw Error('Stop assigned profiles before editing a proxy');
    const data = {
      id: key,
      name: p.name,
      region:p.region??'', provider:p.provider??'',notes:p.notes??'',latencyMs:null,
      protocol: p.protocol,
      host: p.host,
      port: p.port,
      hasCredentials: !!secret,
      lastTest: null,
      result: null,
    };
    return {key,data,secret};
  }

  async proxySave(id:string|undefined,input:unknown){
    const {key,data,secret}=await this.prepareProxySave(id,input);
    this.db.transaction(()=>this.db.run('INSERT OR REPLACE INTO proxies VALUES(?,?,?)',[key,JSON.stringify(data),secret]));
    return key;
  }

  async importProxies(text:string){
    const lines=parseProxyImport(text);if(!lines.length)throw Error('Paste at least one proxy');
    if(lines.some(line=>!line.ok))throw Error('Fix invalid import lines before saving; no proxies were imported');
    const prepared:Awaited<ReturnType<Service['prepareProxySave']>>[]=[];
    for(const line of lines)if(line.ok)prepared.push(await this.prepareProxySave(undefined,line.input));
    if(this.shuttingDown)throw Error('Application is shutting down');
    this.db.transaction(()=>{for(const {key,data,secret} of prepared)this.db.run('INSERT INTO proxies VALUES(?,?,?)',[key,JSON.stringify(data),secret]);});
    return {imported:prepared.length};
  }

  assignProxy(id:string,proxyId:string|null){
    this.assertIdle(id);
    if(proxyId&&!this.db.rows('SELECT id FROM proxies WHERE id=?',[proxyId]).length)throw Error('Proxy not found');
    this.patch(id,{proxyId});
  }

  async focus(id:string){await this.page(id).bringToFront();}


  proxyDelete(id: string) {
    if (this.profiles().some(p => p.proxyId === id)) {
      throw Error('Unassign this proxy from profiles first');
    }
    this.db.transaction(() => this.db.run('DELETE FROM proxies WHERE id=?', [id]));
  }

  async probeProxyJson(id:string,endpoint:string):Promise<unknown>{
    if(!this.acceptingUpdates())throw Error('Application is shutting down');
    if(this.probeSlots>=2)throw Error('Two connection tests are already active. Wait, then retry.');
    this.probeSlots++;
    try{return await this.runProxyProbe(id,endpoint);}finally{this.probeSlots--;}
  }
  private async runProxyProbe(id:string,endpoint:string):Promise<unknown>{
    this.verifyBrowserRuntime();
    const browser=await chromium.launch({headless:true,chromiumSandbox:!this.headless,proxy:await this.bounded(this.proxyOptions(id),5000),timeout:20000,executablePath:chromium.executablePath()});
    this.probeBrowsers.add(browser);
    let value:unknown,cleanupFailed=false;
    try{
      if(!this.acceptingUpdates())throw Error('Application is shutting down');
      const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();
      const expected=new URL(endpoint).href;let authenticationRejected=false;
      await page.route('**/*',route=>route.request().url()===expected?route.continue():route.abort());
      const session=await context.newCDPSession(page);await session.send('Network.enable');
      session.on('Network.responseReceivedExtraInfo',event=>{if(event.statusCode===407)authenticationRejected=true;});
      page.on('response',response=>{if(response.status()===407)authenticationRejected=true;});
      let response;
      try{response=await page.goto(endpoint,{timeout:15000});}catch(e){if(authenticationRejected||e instanceof Error&&/ERR_(INVALID_AUTH_CREDENTIALS|PROXY_AUTH|PROXY_AUTH_REQUESTED)/.test(e.message))throw Error('PROXY_AUTHENTICATION_REQUIRED',{cause:e});throw Error('Proxy connection failed',{cause:e});}
      if(response?.status()===407)throw Error('PROXY_AUTHENTICATION_REQUIRED');
      if(!response?.ok())throw Error('Proxy probe HTTP failure');
      const body=await response.body();if(body.length>65536)throw Error('Proxy probe response too large');
      value=JSON.parse(body.toString('utf8'));
    }finally{try{await this.bounded(browser.close(),5000);this.probeBrowsers.delete(browser);}catch{cleanupFailed=true;}}
    if(cleanupFailed)throw Error('Test browser cleanup could not be confirmed');return value;
  }

  async proxyTest(id: string, endpoint = 'https://api.ipify.org?format=json') {
    const started = performance.now();
    let observedIp:string|null=null;
    let result = 'Connection failed (credentials and raw errors withheld)';
    try {
      await this.locations.ensureTorProxy(id);
      const body = z.object({ip: z.string().refine(value=>isIP(value)!==0,'Invalid IP literal')}).parse(await this.probeProxyJson(id,endpoint));
      observedIp=body.ip;result = `Connected — public IP ${body.ip}`;
    } catch {
      /* controlled redacted failure */
    }
    const row = this.db.rows('SELECT data FROM proxies WHERE id=?', [id])[0];
    if (!row) throw Error('Proxy not found');
    const p = proxySchema.parse(JSON.parse(String(row.data)));
    this.db.transaction(() => this.db.run('UPDATE proxies SET data=? WHERE id=?', [JSON.stringify({...p,connection:{state:observedIp?'connected':'connection-failed',requestedCountry:null,ip:observedIp,country:null,timezone:null,locale:null,checkedAt:now(),message:observedIp?'IP connectivity verified. Exit country not verified; run a location test.':result}, lastTest: now(), result, latencyMs:Math.round(performance.now()-started)}), id]));
    return result;
  }

  page(id: string): Page {
    const context = this.running.get(id)?.context;
    if (!context) throw Error('Launch the profile first');
    const page = context.pages()[0];
    if (!page) throw Error('No browser tab is open');
    return page;
  }

  async diagnose(id: string) {
    const page=this.page(id),expected=this.profile(id).config,runtime=this.running.get(id);
    let observed:Awaited<ReturnType<typeof observeFingerprint>>;
    try{observed=await this.bounded(observeFingerprint(page),6000);}catch{throw Error('Fingerprint observation failed or timed out; page details withheld');}
    if(!runtime||this.running.get(id)!==runtime||runtime.closing)throw Error('Fingerprint observation cancelled because the profile stopped');
    const inconsistencies=observedFingerprintIssues(expected,observed,process.platform,linuxManifest.version);
    let policyArgumentObserved:boolean|null=null,webglArgumentObserved:boolean|null=null;
    const identities=ownedProcesses(runtime.launchId,this.directory(id),chromium.executablePath());
    const identity=identities?.find(p=>p.pid===runtime.pid)??identities?.[0];
    if(identity){policyArgumentObserved=/(?:^|[\s"])--force-webrtc-ip-handling-policy=disable_non_proxied_udp(?:$|[\s"])/.test(identity.command);webglArgumentObserved=/(?:^|[\s"])--disable-webgl(?:$|[\s"])/.test(identity.command);}
    if(expected.webrtcPolicy==='disable-non-proxied-udp'&&policyArgumentObserved===false)inconsistencies.push('Configured WebRTC launch argument not observed');
    if(expected.webglPolicy==='limit-html-canvas'&&webglArgumentObserved===false)inconsistencies.push('Configured WebGL launch argument not observed');
    if(expected.webglPolicy==='limit-html-canvas'&&observed.webglContexts.htmlCanvas==='available')inconsistencies.push('WebGL still available on diagnostic HTML canvas despite requested limit');
    const limitations=['Native hardware/graphics/canvas/audio/font/media behavior is measured, not spoofed; the optional WebGL limit is partial, not identity masking','Canvas/audio hashes and native details are fingerprint identifiers: keep local diagnostic data private','Local ICE uses no STUN/TURN and records no candidate addresses; public DNS/WebRTC leak protection is not certified',
      'The requested UDP policy is not a firewall: Linux loopback STUN still sent UDP with an HTTP proxy; public/Windows STUN behavior remains unverified','HTML-canvas WebGL limit is experimental; OffscreenCanvas and workers may still expose WebGL. Context checks do not prove fingerprint protection', 'Do Not Track is a request header, not a guarantee that sites honor it; the JavaScript property is measured separately and the header is not verified by diagnostics', 'Client hints and permission policies can be unavailable on insecure or restricted origins; unavailable is not a successful verification'];
    const result={expected,observed,inconsistencies,capabilities:fingerprintCapabilities,launchPolicy:{requested:expected.webrtcPolicy??'default',nonProxiedUDPArgumentObserved:policyArgumentObserved,webglRequested:expected.webglPolicy??'default',webglArgumentObserved},limitations,processId:this.running.get(id)?.pid??null};
    this.db.transaction(()=>this.db.run('INSERT INTO diagnostics VALUES(?,?,?,?)',[randomUUID(),id,now(),JSON.stringify(minimizeDiagnosticHistory(result))]));
    return result;
  }

  async automate(id: string, steps: Extract<Request, {action: 'automate'}>['steps']) {
    const validated = requestSchema.parse({action: 'automate', id, steps});
    if (validated.action !== 'automate') throw Error('Invalid automation request');
    if (this.jobs.get(id)?.running) throw Error('An automation job is already running');
    const page = this.page(id);
    const job: Job = {running: true, message: 'Running', cancelled: false};
    this.jobs.set(id, job);
    job.done = runAutomation(page, validated.steps, path.join(this.root, 'reports'), id, job);
    return job.done;
  }

  async automationStop(id: string) {
    const job = this.jobs.get(id);
    if (job?.running) {
      job.cancelled = true;
      job.message = 'Stopping';
      await this.stop(id);
    }
  }

  maxConcurrent() {
    return Number(this.db.rows("SELECT value FROM settings WHERE key='maxConcurrent'")[0]?.value ?? 3);
  }

  settings(max: number) {
    this.db.transaction(() => this.db.run("INSERT OR REPLACE INTO settings VALUES('maxConcurrent',?)", [String(max)]));
  }

  snapshot(): Snapshot {
    return {
      profiles: this.profiles(),
      proxies: this.db.rows('SELECT data FROM proxies').map(r => proxySchema.parse(JSON.parse(String(r.data)))),
      logs: this.logs,
      backups: this.db.rows('SELECT * FROM backups ORDER BY created_at DESC LIMIT 200').map(r => ({id: String(r.id), profileId: String(r.profile_id), createdAt: String(r.created_at), path: String(r.path), checksum: String(r.checksum)})),
      diagnostics: this.db.rows('SELECT * FROM diagnostics ORDER BY created_at DESC LIMIT 100').map(r => ({profileId: String(r.profile_id), createdAt: String(r.created_at), result: JSON.parse(String(r.data)) as z.infer<ReturnType<typeof z.json>>})),
      jobs: [...this.jobs].map(([profileId, j]) => ({profileId, running: j.running, message: j.message})),
      settings: {maxConcurrent: this.maxConcurrent()},
      engine: `Playwright Chromium ${chromium.executablePath().split(path.sep).slice(-3).join('/')}`,
    };
  }

  async backup(id: string, destination: string, password?: string) {
    this.assertIdle(id);
    this.busy.add(id);
    try {
      assertSafeParents(this.directory(id));
      const target = path.resolve(destination);
      assertSafeParents(path.dirname(target));
      const profiles = path.resolve(this.root, 'profiles');
      if ((!path.relative(profiles, target).startsWith('..' + path.sep) && path.relative(profiles, target) !== '..' && !path.isAbsolute(path.relative(profiles, target))) || [this.db.file, path.join(this.root, 'application.log')].some(p => process.platform === 'win32' ? p.toLowerCase() === target.toLowerCase() : p === target)) throw Error('Unsafe backup destination');
      if (fs.existsSync(target) && (!fs.lstatSync(target).isFile() || fs.lstatSync(target).isSymbolicLink())) throw Error('Unsafe backup destination');
      const p = this.profile(id);
      const files: z.infer<typeof manifestSchema>['files'] = [];
      let total = 0;
      const walk = (dir: string) => {
        for (const item of fs.readdirSync(dir, {withFileTypes: true})) {
          if (['.phantom-lock', '.phantom-recovery', 'SingletonLock', 'SingletonCookie', 'SingletonSocket', 'Cache', 'Code Cache', 'GPUCache'].includes(item.name)) continue;
          const full = path.join(dir, item.name);
          if (item.isSymbolicLink()) throw Error('Symbolic links cannot be backed up');
          if (item.isDirectory()) walk(full);
          else if (item.isFile()) {
            const stat = fs.lstatSync(full);
            if (stat.size > BACKUP_LIMITS.file || files.length >= BACKUP_LIMITS.count) throw Error('Backup file or count exceeds safety limit');
            total += stat.size;
            if (total > BACKUP_LIMITS.total) throw Error('Backup exceeds 256 MiB safety limit; clear browser caches first');
            const bytes = readBoundedFile(full, BACKUP_LIMITS.file);
            if (bytes.length !== stat.size) throw Error('Profile changed during backup');
            files.push({name: path.relative(this.directory(id), full).split(path.sep).join('/'), size: bytes.length, sha256: hash(bytes), data: bytes.toString('base64')});
          } else throw Error('Unsupported profile file type');
        }
      };
      walk(this.directory(id));
      const manifest: z.infer<typeof manifestSchema> = {
        format: 'phantom-backup',
        version: 1,
        engine: p.engineVersion,
        profile: {...pickInput(p), proxyId: null},
        files,
      };
      const json = JSON.stringify(manifest);
      if (Buffer.byteLength(json) > BACKUP_LIMITS.decompressed) throw Error('Backup manifest exceeds safety limit');
      const compressed = gzipSync(json);
      const bytes = password === undefined ? compressed : await encryptBackup(compressed,password);
      if(this.shuttingDown)throw Error('Application is shutting down');
      if (bytes.length > BACKUP_LIMITS.archive) throw Error('Backup archive exceeds safety limit');
      const tmp = target + '.' + randomUUID() + '.partial';
      try {
        fs.writeFileSync(tmp, bytes, {mode: 0o600, flag: 'wx'});
        fs.renameSync(tmp, target);
      } finally {fs.rmSync(tmp, {force: true});}
      this.db.transaction(() => this.db.run('INSERT INTO backups VALUES(?,?,?,?,?)', [randomUUID(), id, now(), target, hash(bytes)]));
      return destination;
    } finally {
      this.busy.delete(id);
    }
  }

  async restore(source: string, password?: string) {
    assertSafeParents(source);
    if (!fs.lstatSync(source).isFile() || fs.lstatSync(source).size > BACKUP_LIMITS.archive) throw Error('Backup archive too large or unsupported');
    const input = readBoundedFile(source, BACKUP_LIMITS.archive);
    const isGzip = input[0]===0x1f && input[1]===0x8b;
    if(!isGzip&&!input.subarray(0,64).toString('ascii').startsWith('eyJ'))throw Error('Corrupt or unsupported backup');
    if (!isGzip && password===undefined) throw Error('Encrypted backup requires a password');
    if (isGzip && password!==undefined) throw Error('This backup is unencrypted; choose the unencrypted restore option');
    const compressed = isGzip ? input : await decryptBackup(input,password!);
    let manifest: z.infer<typeof manifestSchema>;
    try {
      manifest = manifestSchema.parse(JSON.parse(gunzipSync(compressed, {maxOutputLength: BACKUP_LIMITS.decompressed}).toString('utf8')));
    } catch {
      throw Error('Corrupt or unsupported backup');
    }
    const savedMajor=manifest.engine.match(/^(\d+)\./)?.[1];
    if(savedMajor&&Number(savedMajor)>Number(linuxManifest.version.split('.')[0]))throw Error('Backup uses a newer Chromium version; refusing an unsafe browser-data downgrade');
    const names = new Set<string>();
    let total = 0;
    if (manifest.files.length > BACKUP_LIMITS.count) throw Error('Backup file count exceeds safety limit');
    for (const f of manifest.files) {
      if (f.size > BACKUP_LIMITS.file) throw Error('Backup file exceeds safety limit');
      if (!safeArchivePath(f.name) || names.has(f.name.toLowerCase())) throw Error('Unsafe or duplicate archive path');
      const normalized = f.name.normalize('NFC').toLowerCase();
      if (names.has(normalized)) throw Error('Unsafe or duplicate archive path');
      names.add(normalized);
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(f.data)) throw Error('Backup checksum or encoding mismatch');
      const data = Buffer.from(f.data, 'base64');
      if (data.toString('base64') !== f.data) throw Error('Backup checksum or encoding mismatch');
      total += data.length;
      if (total > BACKUP_LIMITS.total || data.length !== f.size || hash(data) !== f.sha256) throw Error('Backup checksum or size mismatch');
    }
    for (const name of names) {let parent = path.posix.dirname(name); while (parent !== '.') {if (names.has(parent)) throw Error('Unsafe archive file/directory collision'); parent = path.posix.dirname(parent);}}
    const p = this.create({...manifest.profile, proxyId: null, name: manifest.profile.name.slice(0, 89) + ' (restored)'});
    try {
      for (const file of manifest.files) {
        const dest = path.join(this.directory(p.id), file.name);
        fs.mkdirSync(path.dirname(dest), {recursive: true});
        assertSafeParents(path.dirname(dest));
        fs.writeFileSync(dest, Buffer.from(file.data, 'base64'), {mode: 0o600, flag: 'wx'});
      }
      this.patch(p.id, {engineVersion: manifest.engine, notes: p.notes.slice(0, 3800) + '\nRestored backup. Browser-version compatibility and OS-bound cookie decryption must be checked before use.'});
      return p;
    } catch (e) {
      try {this.db.transaction(() => this.db.run('DELETE FROM profiles WHERE id=?', [p.id]));} finally {fs.rmSync(this.directory(p.id), {recursive: true, force: true});}
      throw e;
    }
  }
}

function pickInput(p: Profile) {
  return {name: p.name,requestedCountry:p.requestedCountry,autoLocation:p.autoLocation,group:p.group, restoreSession:p.restoreSession, description:p.description, homepage:p.homepage, startupUrls:p.startupUrls, notes: p.notes, tags: p.tags, config: p.config, proxyId: p.proxyId, launchUrl: p.launchUrl};
}

export function safeArchivePath(name: string) {
  return !!name && !name.includes('\\') && !name.startsWith('/') && !name.includes(':') && name.split('/').every(p => p !== '.' && p !== '..' && p !== '' && !/[. ]$/.test(p) && !/[<>|?*]/.test(p) && ![...p].some(c => c.charCodeAt(0) < 32) && !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(p)) && !name.split('/').some(p => ['.phantom-lock', '.phantom-recovery', 'singletonlock', 'singletonsocket', 'singletoncookie'].includes(p.toLowerCase()));
}

function assertSafeParents(input: string) {
  for (let p = path.resolve(input); ; p = path.dirname(p)) {
    if (fs.lstatSync(p).isSymbolicLink()) throw Error('Symbolic-link paths are not supported');
    if (p === path.dirname(p)) break;
  }
}

function readBoundedFile(file: string, limit: number): Buffer {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    if (!fs.fstatSync(fd).isFile() || fs.fstatSync(fd).size > limit) throw Error('File exceeds safety limit');
    const parts: Buffer[] = []; let total = 0;
    for (;;) {
      const buffer = Buffer.alloc(Math.min(1024 * 1024, limit + 1 - total));
      const size = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (!size) break;
      total += size; if (total > limit) throw Error('File exceeds safety limit');
      parts.push(buffer.subarray(0, size));
    }
    return Buffer.concat(parts, total);
  } finally {fs.closeSync(fd);}
}
