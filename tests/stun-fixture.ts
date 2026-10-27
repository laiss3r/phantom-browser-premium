// Test-only RFC5389 loopback binding server. TEST-NET mapped address is synthetic,
// never a claim about a real Internet egress IP. Do not import into production.
import dgram from 'node:dgram';
export async function localStun(){
 const server=dgram.createSocket('udp4'),stats={bindingRequests:0};
 server.on('message',(message,remote)=>{
  if(message.length<20||message.readUInt16BE(0)!==1||message.readUInt32BE(4)!==0x2112a442)return;
  stats.bindingRequests++;const response=Buffer.alloc(32);response.writeUInt16BE(0x0101,0);response.writeUInt16BE(12,2);response.writeUInt32BE(0x2112a442,4);message.copy(response,8,8,20);
  response.writeUInt16BE(0x0020,20);response.writeUInt16BE(8,22);response[25]=1;response.writeUInt16BE(remote.port^0x2112,26);
  const address=[198,51,100,7],cookie=[0x21,0x12,0xa4,0x42];for(let i=0;i<4;i++)response[28+i]=address[i]!^cookie[i]!;
  server.send(response,remote.port,remote.address);
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.bind(0,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});
 return {port:server.address().port,stats,close:()=>new Promise<void>(resolve=>server.close(()=>resolve()))};
}
