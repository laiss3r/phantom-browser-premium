import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {fixture} from './helpers';import {parseProxyImport} from '../src/shared/proxy-import';import {dispatch,type HostActions} from '../src/main/ipc';import {Database} from '../src/main/database';import {Service} from '../src/main/service';
let f:Awaited<ReturnType<typeof fixture>>;
beforeEach(async()=>{f=await fixture();});afterEach(async()=>{vi.restoreAllMocks();await f.cleanup();});
const host:HostActions={confirmDelete:async()=>false,confirmBackup:async()=>false,saveBackup:async()=>undefined,openBackup:async()=>undefined,openStorage:async()=>{}};
it('parses supported formats, IPv6 and encoded credentials without returning invalid source lines',()=>{
 const rows=parseProxyImport('localhost:8080\n\nproxy.example:3128:user:pass:word\nhttps://u%40x:p%3Ass@proxy.example:8443\n[::1]:1080\nsocks5://[::1]:1080');expect(rows).toHaveLength(5);expect(rows.every(r=>r.ok)).toBe(true);
 if(rows[1]?.ok)expect(rows[1].input.password).toBe('pass:word');if(rows[2]?.ok)expect(rows[2].input.username).toBe('u@x');if(rows[3]?.ok)expect(rows[3].input.host).toBe('::1');expect(rows[1]?.line).toBe(3);
});
it.each(['https://user:private-secret@proxy.example/path','socks5://user:private-secret@localhost:1080','http://private-secret:8080:wrong','http://localhost:0','localhost:65536','http://u:%XX@localhost:8080','ftp://localhost:21','http://localhost:8080?token=private-secret'])('rejects unsupported or malformed list input without leaking secrets: %s',input=>{const rows=parseProxyImport(input);expect(rows[0]?.ok).toBe(false);expect(JSON.stringify(rows)).not.toContain('private-secret');});
it('bounds import size and physical lines',()=>{expect(()=>parseProxyImport('x'.repeat(65537))).toThrow('64 KiB');expect(()=>parseProxyImport('\n'.repeat(100))).toThrow('100 lines');expect(parseProxyImport(' \r\n ')).toEqual([]);});
it('imports atomically, protects credentials and keeps snapshots and database free of plaintext secrets',async()=>{
 expect(await f.service.importProxies('localhost:8080:controlled-user:private-secret\n[::1]:8081')).toEqual({imported:2});const proxies=f.service.snapshot().proxies;expect(proxies).toHaveLength(2);expect(proxies.filter(p=>p.hasCredentials)).toHaveLength(1);expect(JSON.stringify(proxies)).not.toContain('private-secret');expect(fs.readFileSync(f.db.file).includes(Buffer.from('private-secret'))).toBe(false);
 const secret=f.db.rows('SELECT secret FROM proxies WHERE id=?',[proxies.find(p=>p.hasCredentials)!.id])[0]!.secret as Uint8Array;expect(await f.secrets.open(Buffer.from(secret))).toContain('private-secret');
});
it('rejects a mixed list or mid-batch credential protection failure without partial inserts',async()=>{
 await expect(f.service.importProxies('localhost:8080\ninvalid')).rejects.toThrow('invalid');expect(f.service.snapshot().proxies).toEqual([]);
 const seal=f.secrets.seal;let calls=0;f.secrets.seal=async v=>{if(++calls===2)throw Error('controlled DPAPI failure');return seal(v);};await expect(f.service.importProxies('localhost:8080:u:p\nlocalhost:8081:u:p')).rejects.toThrow('no plaintext');expect(f.service.snapshot().proxies).toEqual([]);
});
it('rolls back the whole imported list if durable storage fails',async()=>{vi.spyOn(f.db,'persist').mockImplementationOnce(()=>{throw Error('disk full');});await expect(f.service.importProxies('localhost:8080\nlocalhost:8081')).rejects.toThrow('disk full');expect(f.service.snapshot().proxies).toEqual([]);});
it('assigns, replaces and removes only the relationship; preserves session files and metadata',async()=>{
 const p=f.service.create({name:'Work',group:'QA',notes:'Keep notes',description:'Keep description',tags:['qa'],startupUrls:['https://example.com']});fs.writeFileSync(path.join(p.directory,'session-sentinel'),'keep');const a=await f.service.proxySave(undefined,{name:'A',host:'localhost',port:8080,protocol:'http'}),b=await f.service.proxySave(undefined,{name:'B',host:'localhost',port:8081,protocol:'http'});
 for(const id of [a,b,null]){f.service.assignProxy(p.id,id);const changed=f.service.profile(p.id);expect(changed.proxyId).toBe(id);for(const key of ['name','directory','group','notes','tags','description','startupUrls','config'] as const)expect(changed[key]).toEqual(p[key]);expect(fs.readFileSync(path.join(p.directory,'session-sentinel'),'utf8')).toBe('keep');}
 expect(()=>f.service.assignProxy(p.id,randomUUID())).toThrow('not found');f.service.running.set(p.id,{launchId:'controlled',closing:false,electronPid:process.pid,browserMayExist:false});try{expect(()=>f.service.assignProxy(p.id,a)).toThrow('Stop');}finally{f.service.running.clear();}
});
it('preserves group through duplicate and encrypted backup/restore, and metadata across database restart',async()=>{
 const p=f.service.create({name:'Grouped',group:'QA'});expect((await f.service.duplicate(p.id)).group).toBe('QA');const file=path.join(f.root,'group.phantom.jwe');await f.service.backup(p.id,file,'controlled-long-password');await f.service.restore(file,'controlled-long-password');expect(f.service.profiles().every(v=>v.group==='QA')).toBe(true);
 await f.service.shutdown();f.db.close();f.db=await Database.open(path.join(f.root,'test.sqlite'));f.service=new Service(f.db,f.root,f.secrets,true);expect(f.service.profile(p.id).group).toBe('QA');
});
it('returns explicit created IDs and requires native deletion confirmation at IPC boundary',async()=>{
 const created=await dispatch(f.service,{action:'create',input:{name:'IPC'}},host);expect(created.ok&&created.result).toEqual({profileId:f.service.profiles()[0]!.id});const saved=await dispatch(f.service,{action:'proxySave',input:{name:'IPC proxy',protocol:'http',host:'localhost',port:8080}},host);const id=f.service.snapshot().proxies[0]!.id;expect(saved.ok&&saved.result).toEqual({proxyId:id});expect((await dispatch(f.service,{action:'proxyDelete',id},host)).ok).toBe(false);expect(f.service.snapshot().proxies).toHaveLength(1);expect((await dispatch(f.service,{action:'proxyDelete',id},{...host,confirmProxyDelete:async()=>true})).ok).toBe(true);expect(f.service.snapshot().proxies).toHaveLength(0);
});
