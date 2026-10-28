import {test, expect, _electron as electron} from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('installed Windows application launches its bundled browser offline', async () => {
  test.skip(process.platform !== 'win32' || !process.env.PHANTOM_INSTALLED_EXE, 'Requires installed Windows application');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phantom-installed-'));
  const app = await electron.launch({executablePath: process.env.PHANTOM_INSTALLED_EXE!, args: [`--user-data-dir=${root}`]});
  try {
    const page = await app.firstWindow();
    await expect(page.getByRole('heading', {name: 'Dashboard', exact: true})).toBeVisible();
    await page.context().setOffline(true);
    const created = await page.evaluate(() => window.phantom!.request({action: 'create', input: {name: 'Installed offline smoke', notes: '', tags: [], config: {version: 1, viewport: {width: 1280, height: 720}, locale: 'en-US', timezoneId: 'UTC', colorScheme: 'dark', reducedMotion: 'no-preference'}, proxyId: null, launchUrl: ''}}));
    expect(created.ok).toBe(true);
    if (!created.ok) throw Error(created.error);
    const id = created.snapshot.profiles[0]!.id;
    const launched = await page.evaluate(id => window.phantom!.request({action: 'launch', id}), id);
    expect(launched.ok).toBe(true);
    if (!launched.ok) throw Error(launched.error);
    expect(launched.snapshot.profiles[0]!.status).toBe('running');
    expect((await page.evaluate(id => window.phantom!.request({action: 'stop', id}), id)).ok).toBe(true);
    const about = path.join(path.dirname(process.env.PHANTOM_INSTALLED_EXE!), 'resources', 'browser-runtime', 'chromium-1248', 'chrome-win64', 'ABOUT');
    const original = fs.readFileSync(about);
    try {
      fs.appendFileSync(about, 'tampered');
      const rejected = await page.evaluate(id => window.phantom!.request({action: 'launch', id}), id);
      expect(rejected.ok).toBe(false);
      const state = await page.evaluate(() => window.phantom!.request({action: 'snapshot'}));
      expect(state.ok && state.snapshot.profiles.every(p => p.status !== 'running')).toBe(true);
    } finally {fs.writeFileSync(about, original);}
    const repaired = await page.evaluate(id => window.phantom!.request({action: 'launch', id}), id);
    expect(repaired.ok).toBe(true);
    expect((await page.evaluate(id => window.phantom!.request({action: 'stop', id}), id)).ok).toBe(true);

  } finally {
    await app.close();
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('installed packaged browser measures coherent persisted fingerprints and native behavior',async({browserName},testInfo)=>{
 expect(browserName).toBe('chromium');
 test.skip(process.platform!=='win32'||!process.env.PHANTOM_INSTALLED_EXE,'Requires installed Windows application');
 const {default:http}=await import('node:http');const {profileInput}=await import('../src/shared/schema');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'phantom-installed-fingerprint-'));let headers:import('node:http').IncomingHttpHeaders|undefined;
 const server=http.createServer((req,res)=>{if(req.url==='/')headers=req.headers;res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Controlled packaged diagnostic</title><p>Local diagnostics only</p>');});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const app=await electron.launch({executablePath:process.env.PHANTOM_INSTALLED_EXE!,args:[`--user-data-dir=${root}`]});
 try{
  expect(await app.evaluate(({app})=>app.isPackaged)).toBe(true);const page=await app.firstWindow();
  const input=profileInput.parse({name:'Packaged observed identity',launchUrl:origin,config:{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',locale:'en-GB',timezoneId:'Africa/Nairobi',viewport:{width:1000,height:700},screen:{width:1400,height:900},deviceScaleFactor:1.25,geolocationPermission:'allow',geolocation:{latitude:0,longitude:0},webrtcPolicy:'disable-non-proxied-udp'}});
  const create=await page.evaluate(input=>window.phantom!.request({action:'create',input}),input);expect(create.ok).toBe(true);if(!create.ok)throw Error(create.error);const id=create.snapshot.profiles[0]!.id;
  const request=async(action:'launch'|'diagnose'|'stop')=>{const reply=await page.evaluate(({action,id})=>window.phantom!.request({action,id}),{action,id});expect(reply.ok).toBe(true);if(!reply.ok)throw Error(reply.error);return reply;};
  await request('launch');const first=(await request('diagnose')).result as unknown as Awaited<ReturnType<import('../src/main/service').Service['diagnose']>>;
  expect(first.inconsistencies).toEqual([]);expect(first.observed.devicePixelRatio).toBe(1.25);expect(first.observed.language).toBe('en-GB');expect(first.observed.timezone).toBe('Africa/Nairobi');expect(first.observed.screen).toEqual({width:1400,height:900});expect(first.observed.permissions.geolocation).toBe('granted');
  expect(first.observed.clientHints?.platform).toBe('Windows');expect(first.observed.highEntropyClientHints?.fullVersionList?.some(b=>b.version.startsWith('156.'))).toBe(true);expect(first.observed.canvas.sha256).toMatch(/^[a-f0-9]{64}$/);expect(first.observed.audio.sha256).toMatch(/^[a-f0-9]{64}$/);expect(first.observed.permissions.camera).not.toBe('granted');expect(first.observed.permissions.microphone).not.toBe('granted');
  expect(first.observed.webRTC.status).toBe('observed-local-only');expect(first.launchPolicy.nonProxiedUDPArgumentObserved).toBe(true);expect(headers?.['user-agent']).toBe(input.config.userAgent);expect(headers?.['sec-ch-ua-platform']).toContain('Windows');
  await request('stop');await request('launch');const second=(await request('diagnose')).result as unknown as typeof first;expect(second.inconsistencies).toEqual([]);expect(second.observed.canvas.sha256).toBe(first.observed.canvas.sha256);expect(second.observed.audio.sha256).toBe(first.observed.audio.sha256);expect(second.observed.highEntropyClientHints).toEqual(first.observed.highEntropyClientHints);await request('stop');
  const {processId:ignored,...evidence}=second;void ignored;fs.writeFileSync(testInfo.outputPath('installed-fingerprint.json'),JSON.stringify({source:'actual installed Windows EXE and bundled Chromium',result:evidence},null,2));
 }finally{await app.close();await new Promise<void>(resolve=>server.close(()=>resolve()));fs.rmSync(root,{recursive:true,force:true});}
});

test('installed Electron termination preserves session data and ownership-aware browser recovery',async()=>{
 test.skip(process.platform!=='win32'||!process.env.PHANTOM_INSTALLED_EXE,'Requires installed Windows application');
 const {ownedProcesses}=await import('../src/main/process-ownership');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'phantom-installed-crash-')),executable=process.env.PHANTOM_INSTALLED_EXE!,browserExecutable=path.join(path.dirname(executable),'resources','browser-runtime','chromium-1248','chrome-win64','chrome.exe');
 const args=[`--user-data-dir=${root}`];let app=await electron.launch({executablePath:executable,args});let saved:{id:string;directory:string;launchId:string;chromiumPid?:number}|undefined;
 try{
  let page=await app.firstWindow();const created=await page.evaluate(()=>window.phantom!.request({action:'create',input:{name:'Crash persistence',notes:'preserved after manager termination',tags:[],proxyId:null,launchUrl:'',config:{version:1,viewport:{width:1280,height:720},locale:'en-US',timezoneId:'UTC',colorScheme:'dark',reducedMotion:'no-preference'}}}));if(!created.ok)throw Error(created.error);const p=created.snapshot.profiles[0]!;
  const launched=await page.evaluate(id=>window.phantom!.request({action:'launch',id}),p.id);expect(launched.ok).toBe(true);const lock=JSON.parse(fs.readFileSync(path.join(p.directory,'.phantom-lock','metadata.json'),'utf8'));
  // The Windows launcher's child PID need not be the attached Electron main PID.
  // Authenticate the actual manager through its attached main context, native exe,
  // isolated app-data path and OS identity before terminating that exact process.
  const manager=await app.evaluate(({app})=>({pid:process.pid,executable:process.execPath,root:app.getPath('userData')}));
  expect(path.resolve(manager.executable).toLowerCase()).toBe(path.resolve(executable).toLowerCase());expect(path.resolve(manager.root).toLowerCase()).toBe(path.resolve(root).toLowerCase());expect(lock.electronPid).toBe(manager.pid);
  const {scanProcesses}=await import('../src/main/process-ownership');const identity=scanProcesses()?.find(x=>x.pid===manager.pid);expect(identity).toBeDefined();expect(path.resolve(identity!.executable).toLowerCase()).toBe(path.resolve(executable).toLowerCase());expect(identity!.command.toLowerCase()).toContain(root.toLowerCase());
  saved={id:p.id,directory:p.directory,launchId:lock.launchId,chromiumPid:lock.chromiumPid};
  process.kill(manager.pid,'SIGKILL');await expect.poll(()=>{try{process.kill(manager.pid,0);return false;}catch(e){return (e as NodeJS.ErrnoException).code==='ESRCH';}},{timeout:15000}).toBe(true);
  app=await electron.launch({executablePath:executable,args});page=await app.firstWindow();const snapshot=await page.evaluate(()=>window.phantom!.request({action:'snapshot'}));expect(snapshot.ok).toBe(true);if(!snapshot.ok)throw Error(snapshot.error);expect(snapshot.snapshot.profiles.find(x=>x.id===p.id)?.notes).toBe('preserved after manager termination');
  const identities=ownedProcesses(saved.launchId,p.directory,browserExecutable);expect(identities).not.toBe(null);const retry=await page.evaluate(id=>window.phantom!.request({action:'launch',id}),p.id);
  if(identities?.length){expect(retry.ok).toBe(false);expect(fs.existsSync(path.join(p.directory,'.phantom-lock'))).toBe(true);}else if(retry.ok){expect(retry.snapshot.profiles.find(x=>x.id===p.id)?.status).toBe('running');expect((await page.evaluate(id=>window.phantom!.request({action:'stop',id}),p.id)).ok).toBe(true);}else{expect(retry.error).toContain('locked');}
 }finally{
  await app.close().catch(()=>{});
  if(saved){const owned=ownedProcesses(saved.launchId,saved.directory,browserExecutable),rootBrowser=owned?.find(x=>x.pid===saved!.chromiumPid);if(rootBrowser){process.kill(rootBrowser.pid,'SIGTERM');await expect.poll(()=>ownedProcesses(saved!.launchId,saved!.directory,browserExecutable),{timeout:15000}).toEqual([]);}}
  fs.rmSync(root,{recursive:true,force:true});
 }
});

test('installed Windows country table contains the new build, real persisted proxy observations and offline country flags',async()=>{
 test.skip(process.platform!=='win32'||!process.env.PHANTOM_INSTALLED_EXE,'Requires installed Windows application');
 const {checkCountryTable}=await import('./country-table-check');await checkCountryTable(test.info(),process.env.PHANTOM_INSTALLED_EXE);
});
