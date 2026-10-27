import type {Page} from 'playwright';
// Browser-side measurements only. No init scripts, prototype patches, spoofing,
// getUserMedia prompts, STUN/TURN servers or third-party fingerprinting endpoints.
export async function observeFingerprint(page:Page) {
 return page.evaluate(async()=>{
  const hash=async(bytes:ArrayBuffer)=>crypto.subtle?[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join(''):null;
  const permission=async(name:PermissionName)=>navigator.permissions.query({name}).then(p=>p.state).catch(()=>'unavailable');
  const canvas=document.createElement('canvas');canvas.width=240;canvas.height=80;const draw=canvas.getContext('2d');
  let canvasHash:string|null=null;
  if(draw){draw.fillStyle='#234567';draw.fillRect(0,0,240,80);draw.fillStyle='#abcdef';draw.font='16px sans-serif';draw.fillText('Phantom native diagnostic 123',4,32);try{canvasHash=await hash(new TextEncoder().encode(canvas.toDataURL()).buffer);}catch{/* restricted API is unavailable, not spoofed */}}
  const fontMetrics:Record<string,number>={};if(draw){for(const family of ['serif','sans-serif','monospace']){draw.font=`16px ${family}`;fontMetrics[family]=draw.measureText('mmmmmmmmmmiiiiiiW0123456789').width;}}
  let audioHash:string|null=null;
  try{if(typeof OfflineAudioContext!=='undefined'){
   const audio=new OfflineAudioContext(1,4096,44100),osc=audio.createOscillator();osc.type='triangle';osc.frequency.value=1000;osc.connect(audio.destination);osc.start(0);
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{const rendered=await Promise.race([audio.startRendering(),new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),1500);})]);if(rendered)audioHash=await hash(new Float32Array(rendered.getChannelData(0)).buffer);}finally{if(timer)clearTimeout(timer);}
  }}catch{/* unsupported or blocked audio stays null */}
  const gl=document.createElement('canvas').getContext('webgl'),debug=gl?.getExtension('WEBGL_debug_renderer_info');
  type Hints={brands:{brand:string;version:string}[];mobile:boolean;platform:string;getHighEntropyValues:(names:string[])=>Promise<{architecture?:string;bitness?:string;platform?:string;mobile?:boolean;platformVersion?:string;fullVersionList?:{brand:string;version:string}[];model?:string;wow64?:boolean}>};
  const hints=(navigator as Navigator&{userAgentData?:Hints}).userAgentData;
  let highEntropy:Awaited<ReturnType<Hints['getHighEntropyValues']>>|null=null;
  try{if(hints)highEntropy=await hints.getHighEntropyValues(['architecture','bitness','platformVersion','fullVersionList','model','wow64']);}catch{/* permissions policy can withhold hints */}
  let media:{kind:string;count:number}[]=[];let mediaStatus='unavailable';let exposedLabels=0;
  try{if(navigator.mediaDevices?.enumerateDevices){const devices=await navigator.mediaDevices.enumerateDevices(),counts:Record<string,number>={};for(const device of devices){counts[device.kind]=(counts[device.kind]??0)+1;if(device.label)exposedLabels++;}media=Object.entries(counts).map(([kind,count])=>({kind,count}));mediaStatus='observed';}}catch{mediaStatus='blocked';}
  let rtc:{status:string;candidateTypes:string[];protocols:string[];timedOut:boolean}={status:'unavailable',candidateTypes:[],protocols:[],timedOut:false};
  if(typeof RTCPeerConnection!=='undefined'){
   let peer:RTCPeerConnection|undefined,timer:ReturnType<typeof setTimeout>|undefined;
   try{peer=new RTCPeerConnection({iceServers:[]});const types=new Set<string>(),protocols=new Set<string>();const current=peer;
    let finish!:()=>void;const done=new Promise<void>(resolve=>{finish=resolve;timer=setTimeout(()=>{rtc.timedOut=true;resolve();},1000);});
    peer.onicecandidate=event=>{if(!event.candidate){finish();return;}if(event.candidate.type)types.add(event.candidate.type);if(event.candidate.protocol)protocols.add(event.candidate.protocol);};
    peer.createDataChannel('local-diagnostic');await current.setLocalDescription(await current.createOffer());await done;
    rtc={status:'observed-local-only',candidateTypes:[...types].sort(),protocols:[...protocols].sort(),timedOut:rtc.timedOut};
   }catch{rtc.status='blocked';}finally{if(timer)clearTimeout(timer);peer?.close();}
  }
  const permissions={geolocation:await permission('geolocation'),camera:await permission('camera'),microphone:await permission('microphone')};
  // Read only with an already-granted permission: never trigger a permission prompt.
  const geolocation:{status:string;coordinates:{latitude:number;longitude:number;accuracy:number}|null}={status:permissions.geolocation==='granted'?'unavailable':'not-granted',coordinates:null};
  if(permissions.geolocation==='granted'&&navigator.geolocation){
   await new Promise<void>(resolve=>{let finished=false;const timer=setTimeout(()=>{finished=true;geolocation.status='timed-out';resolve();},1500);
    const finish=(status:string,coordinates:typeof geolocation.coordinates)=>{if(finished)return;finished=true;clearTimeout(timer);geolocation.status=status;geolocation.coordinates=coordinates;resolve();};
    try{navigator.geolocation.getCurrentPosition(position=>finish('observed',{latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy}),()=>finish('unavailable',null),{timeout:1200,maximumAge:0});}catch{finish('unavailable',null);}
   });
  }
  return {
   userAgent:navigator.userAgent,language:navigator.language,languages:[...navigator.languages],timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,
   viewport:{width:innerWidth,height:innerHeight},screen:{width:screen.width,height:screen.height},devicePixelRatio,
   colorScheme:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light',reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
   hardwareConcurrency:navigator.hardwareConcurrency,deviceMemory:(navigator as Navigator&{deviceMemory?:number}).deviceMemory??null,platform:navigator.platform,
   clientHints:hints?{brands:hints.brands,mobile:hints.mobile,platform:hints.platform}:null,highEntropyClientHints:highEntropy,
   webglVendor:gl?.getParameter(gl.VENDOR) as string|null,webglRenderer:gl?.getParameter(gl.RENDERER) as string|null,
   unmaskedWebglVendor:debug?gl?.getParameter(debug.UNMASKED_VENDOR_WEBGL) as string:null,unmaskedWebglRenderer:debug?gl?.getParameter(debug.UNMASKED_RENDERER_WEBGL) as string:null,
   canvas:{status:canvasHash?'measured-native':'unavailable',sha256:canvasHash},audio:{status:audioHash?'measured-native':'unavailable',sha256:audioHash},
   geolocation,
   fonts:{method:'generic-family metrics only; not installed-font enumeration',metrics:fontMetrics},permissions,geolocationPermission:permissions.geolocation,
   media:{status:mediaStatus,kinds:media,exposedLabels,identities:'omitted'},webRTC:rtc,
   leakChecks:{dns:'not-tested: requires controlled external authoritative DNS',publicIP:'not-tested: use explicit proxy probe',webRTC:'local candidates only; no public STUN/TURN verification'},
   capabilities:{canvas:!!draw,audio:typeof OfflineAudioContext!=='undefined',webRTC:typeof RTCPeerConnection!=='undefined',mediaEnumeration:!!navigator.mediaDevices?.enumerateDevices,serviceWorker:'serviceWorker' in navigator,cacheStorage:'caches' in globalThis,indexedDB:'indexedDB' in globalThis},
   webdriver:navigator.webdriver,secureContext:isSecureContext,
  };
 });
}
export type FingerprintObservation=Awaited<ReturnType<typeof observeFingerprint>>;
