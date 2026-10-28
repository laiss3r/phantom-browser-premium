import {z} from 'zod';
import {configSchema,proxySchema} from '../shared/schema';
import {countrySchema,locatedCreateSchema,type Connection} from '../shared/connection';
import {WebshareProvider,ProviderError,publicIPv4,type ProxyProvider} from './proxy-provider';
import type {Service,Secrets} from './service';
const observedSchema=z.object({error:z.literal(false).optional(),reserved:z.literal(false).optional(),ip:z.union([publicIPv4,z.ipv6().refine(v=>/^[23][a-f0-9]{3}:/i.test(v)&&!/^2001:db8:/i.test(v),'Expected a global unicast IP')]),country_code:countrySchema,timezone:z.string().min(1).max(80).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}}),languages:z.string().min(2).max(300)});
export class LocationWorkflow {
 provider:ProxyProvider=new WebshareProvider();
 private preparing=false;
 constructor(private service:Service,private secrets:Secrets){}
 configured(){return this.service.db.rows("SELECT provider FROM provider_secrets WHERE provider='webshare'").length>0;}
 async saveToken(token:string){return this.saveSecret('webshare',token);}
 async saveGeoKey(token:string|null){if(token===null){this.service.db.transaction(()=>this.service.db.run("DELETE FROM provider_secrets WHERE provider='ipapi'"));return;}return this.saveSecret('ipapi',token);}
 private async saveSecret(provider:string,token:string){
  if(!/^[A-Za-z0-9._-]{8,256}$/.test(token))throw Error('Invalid API token format; do not paste proxy passwords here.');
  let bytes:Buffer;try{bytes=await this.service.bounded(this.secrets.seal(token),5000);}catch{throw Error('Windows DPAPI unavailable; API token was not saved. No plaintext fallback.');}
  if(!this.service.acceptingUpdates())throw Error('Application is shutting down');
  this.service.db.transaction(()=>this.service.db.run('INSERT OR REPLACE INTO provider_secrets VALUES(?,?)',[provider,bytes]));
 }
 private async geoUrl(){
  const row=this.service.db.rows("SELECT secret FROM provider_secrets WHERE provider='ipapi'")[0];
  if(!row){if(this.service.production)throw Error('Geolocation subscription key required');return 'https://ipapi.co/json/';}
  const key=await this.service.bounded(this.secrets.open(Buffer.from(row.secret as Uint8Array)),5000);
  if(!/^[A-Za-z0-9._-]{8,256}$/.test(key))throw Error('Invalid geolocation key');
  return 'https://ipapi.co/json/?key='+encodeURIComponent(key);
 }
 removeToken(){this.service.db.transaction(()=>this.service.db.run("DELETE FROM provider_secrets WHERE provider='webshare'"));}
 private async token(){const row=this.service.db.rows("SELECT secret FROM provider_secrets WHERE provider='webshare'")[0];if(!row)throw new ProviderError('authentication-required','Authentication required: configure your Webshare API token in Settings.');try{return await this.service.bounded(this.secrets.open(Buffer.from(row.secret as Uint8Array)),5000);}catch{throw new ProviderError('authentication-required','Windows DPAPI could not unlock the provider token. Re-enter it in Settings.');}}
 async countries(){const result=await this.provider.list(await this.token());return {configured:true,countries:[...new Set(result.endpoints.map(p=>p.country))].sort(),truncated:result.truncated};}
 async prepare(country:string,excludeProxyId?:string){
  countrySchema.parse(country);if(this.preparing)throw Error('A location connection is already being prepared. Wait for it to finish.');this.preparing=true;
  try{
   const old=excludeProxyId?this.service.snapshot().proxies.find(p=>p.id===excludeProxyId):undefined;
   const result=await this.provider.list(await this.token(),country);
   const endpoint=result.endpoints.find(p=>p.id!==old?.providerEndpointId);
   if(!endpoint)throw Error(old?'No replacement direct endpoint is available in that country. Retry the existing connection or add endpoints to your plan.':'No usable direct endpoint is available for this country in your default Webshare plan.');
   // Provider inventory is not a connection test. Credentials use the existing DPAPI path.
   let id:string|undefined;
   // Reuse an identical encrypted endpoint even when another profile uses it.
   // Changed provider credentials create a new record: never mutate an active/shared connection.
   const candidates=this.service.snapshot().proxies.filter(p=>p.providerEndpointId===endpoint.id&&p.provider==='Webshare').slice(-10).reverse();
   for(const candidate of candidates){
    const options=await this.service.bounded(this.service.proxyOptions(candidate.id),5000);
    if(options?.server===`http://${endpoint.host}:${endpoint.port}`&&options.username===endpoint.username&&options.password===endpoint.password){id=candidate.id;break;}
   }
   id??=await this.service.proxySave(undefined,{name:`Webshare · ${country}`,provider:'Webshare',region:country,protocol:'http',host:endpoint.host,port:endpoint.port,username:endpoint.username,password:endpoint.password});
   const row=this.service.snapshot().proxies.find(p=>p.id===id)!;
   this.service.db.transaction(()=>this.service.db.run('UPDATE proxies SET data=? WHERE id=?',[JSON.stringify({...row,country,providerEndpointId:endpoint.id}),id]));
   const connection=await this.verify(id,country);return {proxyId:id,connection};
  }finally{this.preparing=false;}
 }
 async verify(id:string,requestedCountry:string|null,endpoint?:string):Promise<Connection>{
  if(requestedCountry)countrySchema.parse(requestedCountry);
  const started=performance.now();let result:Connection={state:'connection-failed',requestedCountry,ip:null,country:null,timezone:null,locale:null,checkedAt:new Date().toISOString(),message:'Connection failed. Check endpoint availability, proxy credentials and provider traffic, then Retry.'};
  try{
   const data=await this.service.probeProxyJson(id,endpoint??await this.geoUrl());
   const observed=observedSchema.safeParse(data);
   if(!observed.success){result={...result,state:'location-unavailable',message:'Location service returned incomplete or rate-limited data. Connection/location is not verified; retry later.'};}
   else{
    const d=observed.data;const locales=d.languages.split(',').map(s=>s.trim());const locale=locales.find(s=>{try{return !!new Intl.Locale(s).language;}catch{return false;}});
    if(!locale)throw Error('Missing locale');
    result={state:requestedCountry&&d.country_code!==requestedCountry?'location-mismatch':'connected',requestedCountry,ip:d.ip,country:d.country_code,timezone:d.timezone,locale,checkedAt:new Date().toISOString(),message:requestedCountry&&d.country_code!==requestedCountry?'Observed IP country does not match the requested country. Replace the endpoint or contact the provider.':'Connected: HTTPS probe succeeded; country is an approximate IP-geolocation observation, not GPS or leak certification.'};
   }
  }catch(e){if(e instanceof Error&&e.message==='Geolocation subscription key required')result={...result,state:'location-unavailable',message:'A production ipapi.co subscription key is required in Settings. No unlicensed production trial fallback is used.'};if(e instanceof Error&&e.message==='PROXY_AUTHENTICATION_REQUIRED')result={...result,state:'authentication-required',message:'Proxy authentication failed. Refresh the provider token/endpoint credentials and retry.'};}
  if(!this.service.acceptingUpdates())throw Error('Application is shutting down');
  const row=this.service.db.rows('SELECT data FROM proxies WHERE id=?',[id])[0];if(!row)throw Error('Proxy no longer exists');const p=proxySchema.parse(JSON.parse(String(row.data)));
  this.service.db.transaction(()=>this.service.db.run('UPDATE proxies SET data=? WHERE id=?',[JSON.stringify({...p,connection:result,lastTest:result.checkedAt,latencyMs:Math.round(performance.now()-started),result:`${result.state==='connected'?'Connected':result.state} — ${result.ip??'IP unavailable'} · ${result.country??'country unavailable'}`}),id]));
  return result;
 }
 async create(input:unknown){
  const v=locatedCreateSchema.parse(input);const proxy=this.service.snapshot().proxies.find(p=>p.id===v.proxyId);
  if(!proxy||proxy.country!==v.country||proxy.provider!=='Webshare')throw Error('Connect a provider endpoint for the selected country first.');
  const c=proxy.connection;
  if(!c||c.state!=='connected'||c.requestedCountry!==v.country||Date.now()-Date.parse(c.checkedAt)>300000)throw Error('Connection is unverified, failed, mismatched or older than five minutes. Retry before creating.');
  const config=configSchema.parse({locale:v.locale??c.locale,timezoneId:v.timezoneId??c.timezone,viewport:{width:1280,height:800},screen:{width:1920,height:1080},deviceScaleFactor:1,geolocationPermission:'deny',webrtcPolicy:'default'});
  return this.service.create({name:v.name,requestedCountry:v.country,autoLocation:true,proxyId:v.proxyId,config,...(v.startupUrl?{startupUrls:[v.startupUrl]}:{})});
 }
 async verifyProfile(id:string){const p=this.service.profile(id);if(!p.proxyId)throw Error('No proxy is configured for this profile.');return this.verify(p.proxyId,p.requestedCountry);}
 async reconnect(id:string){
  const p=this.service.profile(id);if(!p.requestedCountry)throw Error('This profile has no requested provider country.');
  this.service.assertLocationIdle(id);const result=await this.prepare(p.requestedCountry,p.proxyId??undefined);
  // Do not replace the working relationship on failure. User browser overrides are retained.
  this.service.assertLocationIdle(id);if(result.connection.state==='connected')this.service.assignProxy(id,result.proxyId);
  return result;
 }
}
