import {z} from 'zod';
import {countrySchema} from '../shared/connection';
export class ProviderError extends Error {
 constructor(readonly kind:'authentication-required'|'connection-failed',message:string){super(message);}
}
export type ProviderEndpoint={id:string;host:string;port:number;username:string;password:string;country:string};
export interface ProxyProvider {list(token:string,country?:string):Promise<{endpoints:ProviderEndpoint[];truncated:boolean}>}
export type ProviderTransport=(url:string,init:RequestInit)=>Promise<Response>;
export const publicIPv4=z.ipv4().refine(ip=>{const [a=0,b=0,c=0]=ip.split('.').map(Number);return a>0&&a<224&&a!==10&&a!==127&&!(a===169&&b===254)&&!(a===172&&b>=16&&b<=31)&&!(a===192&&(b===168||(b===0&&(c===0||c===2))))&&!(a===100&&b>=64&&b<=127)&&!(a===198&&(b===18||b===19||(b===51&&c===100)))&&!(a===203&&b===0&&c===113);},'Provider endpoint must be a public IPv4 address');
const endpointSchema=z.object({id:z.string().min(1).max(100),proxy_address:publicIPv4,port:z.number().int().min(1).max(65535),username:z.string().max(256),password:z.string().max(1024),country_code:countrySchema,valid:z.boolean()});
const pageSchema=z.object({count:z.number().int().nonnegative(),next:z.string().nullable(),results:z.array(z.unknown()).max(100)});
export async function boundedJson(response:Response,limit=1048576):Promise<unknown>{
 if(!response.body)throw Error('Empty response');const reader=response.body.getReader();let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw Error('Response too large');chunks.push(value);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}finally{await reader.cancel().catch(()=>{});}
}
// Fixed HTTPS origin; no provider-supplied URLs, downloads, redirects or purchase mutations.
export class WebshareProvider implements ProxyProvider {
 constructor(private transport:ProviderTransport=fetch,private timeoutMs=8000){}
 async list(token:string,country?:string){
  if(!/^[A-Za-z0-9._-]{8,256}$/.test(token))throw new ProviderError('authentication-required','Enter a valid Webshare API token in Settings.');
  if(country)countrySchema.parse(country);const endpoints:ProviderEndpoint[]=[];let truncated=false;
  try{
   for(let page=1;page<=5;page++){
    const url=new URL('https://proxy.webshare.io/api/v2/proxy/list/');url.searchParams.set('mode','direct');url.searchParams.set('page',String(page));url.searchParams.set('page_size','100');if(country)url.searchParams.set('country_code__in',country);
    const signal=AbortSignal.timeout(this.timeoutMs);const response=await this.transport(url.href,{headers:{Authorization:`Token ${token}`,Accept:'application/json'},signal,redirect:'error'});
    if(response.status===401||response.status===403)throw new ProviderError('authentication-required','Webshare authentication or plan access failed. Check the API token and direct-proxy subscription.');
    if(!response.ok)throw new ProviderError('connection-failed',response.status===429?'Webshare rate limit reached. Wait, then retry.':'Webshare is unavailable. Check your plan or retry later.');
    const data=pageSchema.parse(await boundedJson(response));
    for(const raw of data.results){const row=endpointSchema.safeParse(raw);if(!row.success||!row.data.valid)continue;const p=row.data;if(country&&p.country_code!==country)continue;endpoints.push({id:p.id,host:p.proxy_address,port:p.port,username:p.username,password:p.password,country:p.country_code});}
    truncated=!!data.next;if(!data.next)break;
   }
   return {endpoints,truncated};
  }catch(e){if(e instanceof ProviderError)throw e;throw new ProviderError('connection-failed','Webshare timed out or returned invalid data. Retry; provider details and secrets withheld.');}
 }
}
