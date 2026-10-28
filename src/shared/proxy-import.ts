import {proxyInput} from './schema';
import {z} from 'zod';
export type ProxyImportLine={line:number;ok:true;input:z.infer<typeof proxyInput>}|{line:number;ok:false;error:string};
// Pure parser shared by preview/backend. Never return raw invalid lines or credentials in errors.
export function parseProxyImport(text:string):ProxyImportLine[]{
 if(text.length>65536)throw Error('Proxy list exceeds 64 KiB');
 const lines=text.split(/\r?\n/);if(lines.length>100)throw Error('Import at most 100 lines at a time');
 return lines.flatMap((source,index):ProxyImportLine[]=>{
  const value=source.trim();if(!value)return [];
  try{
   let host:string,port:number,username:string|undefined,password:string|undefined,protocol='http';
   if(value.includes('://')){
    const url=new URL(value);protocol=url.protocol.slice(0,-1);
    if(url.pathname!=='/'&&url.pathname!==''||url.search||url.hash)throw Error();
    host=url.hostname;port=url.port?Number(url.port):(protocol==='https'?443:protocol==='http'?80:0);username=url.username?decodeURIComponent(url.username):undefined;password=url.password?decodeURIComponent(url.password):undefined;
   }else{
    const match=value.match(/^(\[[^\]]+\]|[^:]+):(\d+)(?::([^:]*):(.*))?$/);if(!match)throw Error();
    host=match[1]!;port=Number(match[2]);username=match[3];password=match[4];
   }
   const input=proxyInput.parse({name:`Imported proxy ${index+1}`,protocol,host,port,...(username!==undefined?{username}:{}),...(password!==undefined?{password}:{})});return [{line:index+1,ok:true,input}];
  }catch{return [{line:index+1,ok:false,error:'Invalid host, port or format; SOCKS5 authentication is unsupported.'}];}
 });
}
