import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {randomUUID,createHash} from 'node:crypto';
import {spawn,type ChildProcess} from 'node:child_process';
import {x as extract} from 'tar';
import manifests from './tor-runtime-manifests.json' with {type:'json'};
import {countrySchema} from '../shared/connection';
export interface FreeRoutes {ensure(country:string):Promise<number>;close():Promise<void>;restart?(country:string):Promise<number>}
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
export function torManifest(platform=process.platform,arch=process.arch){
 if(arch!=='x64'||!(platform in manifests.platforms))throw Error('Free Tor routing supports Windows x64 and Linux x64 only.');
 return manifests.platforms[platform as keyof typeof manifests.platforms];
}
export function verifyTorRuntime(root:string,platform=process.platform){
 const manifest=torManifest(platform);
 for(const [name,digest] of Object.entries(manifest.files)){
  const file=path.join(root,name);if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()||hash(fs.readFileSync(file))!==digest)throw Error('Free Tor runtime integrity check failed. Remove only the network-runtime cache to repair; never delete profiles.');
 }
 return path.join(root,manifest.executable);
}
export async function installTorRuntime(root:string,fetcher:typeof fetch=fetch){
 const manifest=torManifest();if(fs.existsSync(root)){verifyTorRuntime(root);return;}
 fs.mkdirSync(path.dirname(root),{recursive:true,mode:0o700});const stage=root+'.'+randomUUID()+'.partial',archive=stage+'.tar.gz';
 const response=await fetcher(manifest.url,{redirect:'error',signal:AbortSignal.timeout(60000)});
 if(!response.ok||!response.body)throw Error('Free Tor download unavailable. Check your network and Retry; no account is needed.');
 const reader=response.body.getReader();const digest=createHash('sha256');let size=0;const fd=fs.openSync(archive,'wx',0o600);
 try{
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>64*1024*1024)throw Error('Free Tor download exceeded its safety limit');digest.update(value);fs.writeSync(fd,value);}}finally{fs.closeSync(fd);await reader.cancel().catch(()=>{});}
  if(digest.digest('hex')!==manifest.sha256)throw Error('Free Tor download checksum mismatch; nothing was executed.');
  fs.mkdirSync(stage,{mode:0o700});const allowed=new Set(Object.keys(manifest.files));
  await extract({file:archive,cwd:stage,strict:true,preservePaths:false,preserveOwner:false,noMtime:true,filter:(name,entry)=>'type' in entry&&entry.type==='File'&&allowed.has(name)});
  const exe=verifyTorRuntime(stage);if(process.platform!=='win32')fs.chmodSync(exe,0o700);fs.renameSync(stage,root);
 }finally{fs.rmSync(archive,{force:true});fs.rmSync(stage,{force:true,recursive:true});}
}
interface Route {ready:Promise<number>;child?:ChildProcess;exited?:Promise<void>}
// One process per country, bounded to three. No system Tor process is adopted,
// authenticated or killed. Country choice never becomes direct on failure.
export class TorRoutes implements FreeRoutes {
 private routes=new Map<string,Route>();private closed=false;private installation?:Promise<void>;
 constructor(private root:string,private inUse:(country:string)=>boolean){}
 private async stop(route:Route){if(route.child&&route.child.exitCode===null&&route.child.signalCode===null){route.child.kill();await Promise.race([route.exited,new Promise<void>(resolve=>setTimeout(resolve,3000))]);if(route.child.exitCode===null&&route.child.signalCode===null)route.child.kill('SIGKILL');await route.exited;}}
 async ensure(country:string){
  countrySchema.parse(country);if(this.closed)throw Error('Application is shutting down');
  const existing=this.routes.get(country);if(existing)return existing.ready;
  if(this.routes.size>=3){const idle=[...this.routes].find(([c])=>!this.inUse(c));if(!idle)throw Error('Three free Tor country routes are active. Stop a profile before choosing another country.');await this.stop(idle[1]);this.routes.delete(idle[0]);}
  const route:Route={ready:Promise.resolve(0)};this.routes.set(country,route);
  route.ready=this.start(country,route).catch(async(error)=>{await this.stop(route);if(this.routes.get(country)===route)this.routes.delete(country);if(error instanceof Error&&/^Free Tor (runtime integrity check failed|download)/.test(error.message))throw error;throw Error('Free Tor country route unavailable. The network may block Tor or this country may have no suitable exit. Retry or use another country. No direct fallback was used.');});return route.ready;
 }
 private async start(country:string,route:Route){
  const runtime=path.join(this.root,'network-runtime','tor-'+manifests.version+'-'+process.platform);
  this.installation??=installTorRuntime(runtime).catch(e=>{this.installation=undefined;throw e;});await this.installation;
  if(this.closed)throw Error('Application is shutting down');const exe=verifyTorRuntime(runtime);
  const listener=net.createServer();await new Promise<void>((resolve,reject)=>{listener.once('error',reject);listener.listen(0,'127.0.0.1',resolve);});const port=(listener.address() as net.AddressInfo).port;await new Promise<void>(resolve=>listener.close(()=>resolve()));
  const data=path.join(this.root,'tor-sessions',randomUUID());fs.mkdirSync(data,{recursive:true,mode:0o700});fs.writeFileSync(path.join(data,'torrc'),'',{mode:0o600});
  const args=['-f',path.join(data,'torrc'),'--DataDirectory',data,'--SocksPort',`127.0.0.1:${port}`,'--GeoIPFile',path.join(runtime,'data/geoip'),'--GeoIPv6File',path.join(runtime,'data/geoip6'),'--ExitNodes',`{${country.toLowerCase()}}`,'--StrictNodes','1','--ClientOnly','1','--SafeLogging','1','--AvoidDiskWrites','1','--__OwningControllerProcess',String(process.pid),'--Log','notice stdout'];
  const child=spawn(exe,args,{stdio:['ignore','pipe','pipe'],windowsHide:true,cwd:path.dirname(exe)});route.child=child;child.stdout?.on('data',()=>{});
  route.exited=new Promise<void>(resolve=>child.once('close',()=>{if(this.routes.get(country)===route)this.routes.delete(country);try{fs.rmSync(data,{recursive:true,force:true});}catch{/* retain only this owned cache on cleanup failure */}resolve();}));
  await new Promise<void>((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Tor bootstrap timed out')),120000);let log='';
   const done=(error?:Error)=>{clearTimeout(timer);child.stdout?.removeListener('data',onData);child.removeListener('error',onError);child.removeListener('exit',onExit);if(error)reject(error);else resolve();};
   const onData=(chunk:Buffer)=>{log=(log+chunk.toString('utf8')).slice(-16384);if(log.includes('Bootstrapped 100%'))done();};const onError=()=>done(Error('Tor could not start'));const onExit=()=>done(Error('Tor exited before bootstrap'));
   child.stdout?.on('data',onData);child.stderr?.on('data',()=>{});child.once('error',onError);child.once('exit',onExit);
  });
  if(this.closed||child.exitCode!==null)throw Error('Tor is not running');return port;
 }
 async restart(country:string){if(this.inUse(country))throw Error('Stop every profile sharing this country route before replacing it.');const route=this.routes.get(country);if(route)await this.stop(route);this.routes.delete(country);return this.ensure(country);}
 async close(){this.closed=true;await Promise.allSettled([...this.routes.values()].map(r=>this.stop(r)));this.routes.clear();}
}
