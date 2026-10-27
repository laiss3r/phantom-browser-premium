import {it,expect} from 'vitest';
import {proxyInput} from '../src/shared/schema';
import {fixture} from './helpers';
it('rejects malformed proxy addresses before saving or launching',()=>{
 for(const host of ['[::1','::1]','[127.0.0.1]','localhost:8080','999.1.2.3','127.1','2130706433','a..b','-proxy.example','proxy-.example',':','[]'])expect(proxyInput.safeParse({name:'Invalid',protocol:'http',host,port:8080}).success,host).toBe(false);
});
it('normalizes plain/bracketed IPv6 and emits exactly one pair of URL brackets',async()=>{
 const f=await fixture();try{for(const host of ['::1','[::1]']){await f.service.proxySave(undefined,{name:host,protocol:'http',host,port:8080});const p=f.service.snapshot().proxies.find(p=>p.name===host)!;expect(p.host).toBe('::1');expect((await f.service.proxyOptions(p.id))?.server).toBe('http://[::1]:8080');}}finally{await f.cleanup();}
});
it('accepts canonical DNS names, localhost and ordinary IP addresses',()=>{
 for(const host of ['localhost','proxy.example','proxy-1.example','127.0.0.1','2001:db8::1'])expect(proxyInput.safeParse({name:'Valid',protocol:'https',host,port:443}).success,host).toBe(true);
});
