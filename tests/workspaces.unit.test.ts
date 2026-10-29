import {beforeEach, afterEach, it, expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {fixture} from './helpers';
import {configSchema, requestSchema} from '../src/shared/schema';
let f: Awaited<ReturnType<typeof fixture>>;
beforeEach(async () => {f = await fixture();});
afterEach(async () => {await f.cleanup();});
it('stores description, startup URLs and homepage independently and copies them', async () => {
  const p = f.service.create({name: 'Workspace', description: 'QA profile', startupUrls: ['http://localhost/a', 'http://localhost/b'], homepage: 'http://localhost/home'});
  expect(p.description).toBe('QA profile'); expect(p.startupUrls).toHaveLength(2);
  const copy = await f.service.duplicate(p.id); expect(copy.homepage).toBe(p.homepage); expect(copy.directory).not.toBe(p.directory);
});
it('archives and restores metadata without deleting the profile directory', async () => {
  const p = f.service.create({name: 'Archive'}); fs.writeFileSync(path.join(p.directory, 'keep'), 'session');
  f.service.archive(p.id, true); expect(f.service.profile(p.id).archivedAt).not.toBe(null);
  await expect(f.service.launch(p.id)).rejects.toThrow('archived'); f.service.archive(p.id, false);
  expect(f.service.profile(p.id).archivedAt).toBe(null); expect(fs.readFileSync(path.join(p.directory, 'keep'), 'utf8')).toBe('session');
});
it('accepts bounded DPR, explicit geolocation consent and documented WebRTC policy', () => {
  expect(configSchema.safeParse({deviceScaleFactor: 1.5, geolocationPermission: 'allow', geolocation: {latitude: -0.3, longitude: 36}, webrtcPolicy: 'disable-non-proxied-udp'}).success).toBe(true);
  expect(configSchema.safeParse({deviceScaleFactor: 9}).success).toBe(false);
  expect(configSchema.safeParse({geolocationPermission: 'allow'}).success).toBe(false);
});
it('strictly validates new archive and bounded automation actions', () => {
  const p = f.service.create({name: 'Actions'});
  expect(requestSchema.safeParse({action: 'archive', id: p.id}).success).toBe(true);
  expect(requestSchema.safeParse({action: 'automate', id: p.id, steps: [{action: 'url'}, {action: 'delay', milliseconds: 50}]}).success).toBe(true);
  expect(requestSchema.safeParse({action: 'automate', id: p.id, steps: [{action: 'delay', milliseconds: 999999}]}).success).toBe(false);
});
it('does not commit credentials if a profile starts while DPAPI encryption is pending', async()=>{
 await f.service.proxySave(undefined,{name:'Race',protocol:'http',host:'localhost',port:8080});
 const proxy=f.service.snapshot().proxies[0]!,p=f.service.create({name:'Race profile',proxyId:proxy.id});
 const seal=f.secrets.seal;f.secrets.seal=async value=>{const bytes=await seal(value);f.service.running.set(p.id,{launchId:'race-test',closing:false,electronPid:process.pid,browserMayExist:false});return bytes;};
 try{await expect(f.service.proxySave(proxy.id,{name:'Changed',protocol:'http',host:'localhost',port:8081,username:'test',password:'test'})).rejects.toThrow('Stop assigned');expect(f.service.snapshot().proxies[0]!.port).toBe(8080);}finally{f.service.running.clear();}
});
it('loads v0.1.1 JSON metadata without a destructive migration and keeps legacy startup settings',()=>{
 const p=f.service.create({name:'Legacy',launchUrl:'https://example.com'});const legacy:Record<string,unknown>={...p};
 for(const key of ['description','homepage','startupUrls','restoreSession','archivedAt','lastUsed'])delete legacy[key];
 f.db.transaction(()=>f.db.run('UPDATE profiles SET data=? WHERE id=?',[JSON.stringify(legacy),p.id]));
 const loaded=f.service.profile(p.id);expect(loaded.startupUrls).toEqual([]);expect(loaded.archivedAt).toBe(null);expect(loaded.launchUrl).toBe('https://example.com');expect(fs.existsSync(loaded.directory)).toBe(true);
});
it('blocks contradictory custom user agents before launching or acquiring locks',async()=>{
 const p=f.service.create({name:'Contradiction',config:{userAgent:'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Safari/605.1.15'}});
 await expect(f.service.launch(p.id)).rejects.toThrow('Chromium major');expect(f.service.running.size).toBe(0);expect(fs.existsSync(path.join(p.directory,'.phantom-lock'))).toBe(false);
});

it('accepts only the explicit experimental WebGL policy and leaves legacy profiles on native default',()=>{
 expect(configSchema.parse({}).webglPolicy).toBeUndefined();
 expect(configSchema.parse({webglPolicy:'limit-html-canvas'}).webglPolicy).toBe('limit-html-canvas');
 for(const value of ['spoof','disable-all',true,42])expect(configSchema.safeParse({webglPolicy:value}).success).toBe(false);
});
