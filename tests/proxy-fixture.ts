// Local-only integration fixtures; never a production proxy or external service.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
function sockets(server:net.Server) {
 const active=new Set<net.Socket>();server.on('connection',s=>{active.add(s);s.on('error',()=>{});s.on('close',()=>active.delete(s));});
 return {track(s:net.Socket){active.add(s);s.on('error',()=>{});s.on('close',()=>active.delete(s));},async close(){for(const s of active)s.destroy();if(!server.listening)return;await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
export async function httpProxy(port:number, credentials?:string, tls?:https.ServerOptions) {
 const stats={forwarded:0,challenges:0};
 const authenticate=(req:http.IncomingMessage)=>!credentials||req.headers['proxy-authorization']===`Basic ${Buffer.from(credentials).toString('base64')}`;
 const handler:http.RequestListener=(req,res)=>{
  if(!authenticate(req)){stats.challenges++;res.writeHead(407,{'Proxy-Authenticate':'Basic realm="Controlled local fixture"'});res.end();return;}
  let target:URL;try{target=new URL(req.url!);}catch{res.writeHead(400);res.end();return;}
  if(target.hostname!=='127.0.0.1'||Number(target.port)!==port||target.protocol!=='http:'){res.writeHead(403);res.end();return;}
  stats.forwarded++;const headers={...req.headers};delete headers['proxy-authorization'];delete headers['proxy-connection'];
  const outgoing=http.request(target,{method:req.method,headers},upstream=>{res.writeHead(upstream.statusCode??502,upstream.headers);upstream.pipe(res);});
  outgoing.on('socket',s=>lifecycle.track(s));outgoing.on('error',()=>{res.writeHead(502);res.end();});req.pipe(outgoing);
 };
 const server=tls?https.createServer(tls,handler):http.createServer(handler);
 // Background Chromium HTTPS traffic is deliberately denied, not sent externally.
 server.on('connect',(_req,socket)=>socket.end('HTTP/1.1 403 Forbidden\r\n\r\n'));
 const lifecycle=sockets(server);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {port:(server.address() as net.AddressInfo).port,stats,close:()=>lifecycle.close()};
}
export async function socksProxy(allowedPort:number,alias?:string) {
 const stats={forwarded:0,requestedHosts:[] as string[]};
 const server=net.createServer(socket=>{
  let state:'hello'|'request'|'connecting'='hello',pending=Buffer.alloc(0);
  const onData=(chunk:Buffer)=>{
   pending=Buffer.concat([pending,chunk]);
   if(state==='hello'){
    if(pending.length<2||pending.length<2+pending[1]!)return;
    if(pending[0]!==5||!pending.subarray(2,2+pending[1]!).includes(0)){socket.end(Buffer.from([5,255]));return;}
    pending=pending.subarray(2+pending[1]!);socket.write(Buffer.from([5,0]));state='request';
   }
   if(state!=='request'||pending.length<4)return;
   const kind=pending[3];const hostLength=kind===1?4:kind===3?(pending[4]??0)+1:16;const length=4+hostLength+2;
   if(pending.length<length)return;
   const host=kind===1?[...pending.subarray(4,8)].join('.'):kind===3?pending.subarray(5,4+hostLength).toString():'';
   const port=pending.readUInt16BE(4+hostLength);
   if(pending[0]!==5||pending[1]!==1||(host!=='127.0.0.1'&&host!==alias)||port!==allowedPort){socket.end(Buffer.from([5,2,0,1,0,0,0,0,0,0]));return;}
   const remainder=pending.subarray(length);state='connecting';socket.removeListener('data',onData);socket.pause();
   stats.requestedHosts.push(host);
   const upstream=net.createConnection({host:'127.0.0.1',port},()=>{stats.forwarded++;socket.write(Buffer.from([5,0,0,1,127,0,0,1,0,0]));if(remainder.length)upstream.write(remainder);socket.pipe(upstream);upstream.pipe(socket);socket.resume();});
   lifecycle.track(upstream);upstream.on('error',()=>socket.destroy());socket.on('close',()=>upstream.destroy());
  };socket.on('data',onData);
 });
 const lifecycle=sockets(server);await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {port:(server.address() as net.AddressInfo).port,stats,close:()=>lifecycle.close()};
}
