import {test,expect} from '@playwright/test';import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fixture} from './helpers';
let f:Awaited<ReturnType<typeof fixture>>;let server:http.Server;let origin:string;
test.beforeEach(async()=>{f=await fixture();server=http.createServer((_req,res)=>{if(_req.url==='/sw.js'){res.setHeader('Content-Type','application/javascript');res.end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(new URL(e.request.url).pathname==='/worker-controlled')e.respondWith(new Response('profile-worker-active'));});");return;}
if(_req.url==='/headers'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(_req.headers));return;}
if(_req.url==='/ip-invalid'){res.setHeader('Content-Type','application/json');res.end('{"ip":"deadbeef"}');return;}
res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Controlled local test</title><input id="value"><button id="button" onclick="document.title=\'Clicked\'">Click</button>');});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;});
test.afterEach(async()=>{await f.cleanup();await new Promise<void>(resolve=>server.close(()=>resolve()));});
test('launch, close, relaunch: cookies and local storage persist independently',async()=>{const a=f.service.create({name:'A',launchUrl:origin}),b=f.service.create({name:'B',launchUrl:origin});await f.service.launch(a.id);await f.service.page(a.id).evaluate(()=>{document.cookie='session=alpha; max-age=3600; path=/';localStorage.setItem('workspace','alpha');});await f.service.launch(b.id);expect(await f.service.page(b.id).evaluate(()=>document.cookie)).toBe('');expect(await f.service.page(b.id).evaluate(()=>localStorage.getItem('workspace'))).toBe(null);await f.service.page(b.id).evaluate(()=>{document.cookie='session=beta; max-age=3600; path=/';localStorage.setItem('workspace','beta');});expect(f.service.running.size).toBe(2);expect(f.service.snapshot().profiles.filter(p=>p.status==='running')).toHaveLength(2);await f.service.stop(a.id);await f.service.launch(a.id);expect(await f.service.page(a.id).evaluate(()=>document.cookie)).toContain('alpha');expect(await f.service.page(a.id).evaluate(()=>localStorage.getItem('workspace'))).toBe('alpha');expect(await f.service.page(b.id).evaluate(()=>localStorage.getItem('workspace'))).toBe('beta');});
test('duplicated Chromium session data remains independent',async()=>{const p=f.service.create({name:'Original',launchUrl:origin});await f.service.launch(p.id);await f.service.page(p.id).evaluate(()=>{document.cookie='copy=before; max-age=3600; path=/';localStorage.setItem('value','before');});await f.service.stop(p.id);const copy=await f.service.duplicate(p.id);await f.service.launch(copy.id);expect(await f.service.page(copy.id).evaluate(()=>document.cookie)).toContain('before');await f.service.page(copy.id).evaluate(()=>{document.cookie='copy=after; max-age=3600; path=/';localStorage.setItem('value','after');});await f.service.launch(p.id);expect(await f.service.page(p.id).evaluate(()=>document.cookie)).toContain('before');expect(await f.service.page(p.id).evaluate(()=>localStorage.getItem('value'))).toBe('before');});
test('simultaneous launch lock, editing and deletion guards',async()=>{const p=f.service.create({name:'Lock',launchUrl:origin});const launch=f.service.launch(p.id);await expect(f.service.launch(p.id)).rejects.toThrow('Stop');await launch;expect(()=>f.service.edit(p.id,{name:'edit'})).toThrow('Stop');expect(()=>f.service.delete(p.id,true)).toThrow('Stop');await f.service.stop(p.id);expect(fs.existsSync(path.join(p.directory,'.phantom-lock'))).toBe(false);});
test('stale application lock recovers but live application lock does not',async()=>{const p=f.service.create({name:'Stale',launchUrl:origin});const lock=path.join(p.directory,'.phantom-lock');fs.mkdirSync(lock);fs.writeFileSync(path.join(lock,'pid'),'2147483000');await f.service.launch(p.id);await f.service.stop(p.id);fs.mkdirSync(lock);fs.writeFileSync(path.join(lock,'pid'),String(process.pid));await expect(f.service.launch(p.id)).rejects.toThrow('locked');});
test('supported preferences are observed, hardware is diagnostic only',async()=>{const p=f.service.create({name:'Preferences',launchUrl:origin,config:{viewport:{width:1000,height:700},screen:{width:1400,height:900},locale:'en-GB',timezoneId:'Africa/Nairobi',colorScheme:'light',reducedMotion:'reduce'}});await f.service.launch(p.id);const d=await f.service.diagnose(p.id);expect(d.observed.language).toBe('en-GB');expect(d.observed.timezone).toBe('Africa/Nairobi');expect(d.observed.viewport).toEqual({width:1000,height:700});expect(d.observed.screen).toEqual({width:1400,height:900});expect(d.observed.colorScheme).toBe('light');expect(d.observed.reducedMotion).toBe(true);expect(d.inconsistencies).toEqual([]);expect(d.observed.webdriver).toBe(true);});
test('automation operates real page and writes local reports and screenshot',async()=>{const p=f.service.create({name:'Automation',launchUrl:origin});await f.service.launch(p.id);const result=await f.service.automate(p.id,[{action:'navigate',url:origin},{action:'wait',selector:'#value'},{action:'fill',selector:'#value',value:'controlled'},{action:'click',selector:'#button'},{action:'title'},{action:'screenshot'}]);expect(result).toBe('Completed');expect(await f.service.page(p.id).title()).toBe('Clicked');const reports=fs.readdirSync(path.join(f.root,'reports'));expect(reports.some(p=>p.endsWith('.png'))).toBe(true);expect(reports.some(p=>p.endsWith('.json'))).toBe(true);});
test('automation stop cancels pending operation by closing its profile',async()=>{const p=f.service.create({name:'Stop job',launchUrl:origin});await f.service.launch(p.id);const job=f.service.automate(p.id,[{action:'wait',selector:'#never-exists'}]);await f.service.automationStop(p.id);expect(await job).toBe('Stopped');expect(f.service.running.has(p.id)).toBe(false);});
test('backup restore preserves controlled session',async()=>{const p=f.service.create({name:'Archive',launchUrl:origin});await f.service.launch(p.id);await f.service.page(p.id).evaluate(()=>{document.cookie='saved=yes; max-age=3600; path=/';localStorage.setItem('saved','yes');});await expect(f.service.backup(p.id,path.join(f.root,'active.gz'))).rejects.toThrow('Stop');await f.service.stop(p.id);const file=path.join(f.root,'session.gz');await f.service.backup(p.id,file);const restored=await f.service.restore(file);await f.service.launch(restored.id);expect(await f.service.page(restored.id).evaluate(()=>document.cookie)).toContain('saved=yes');expect(await f.service.page(restored.id).evaluate(()=>localStorage.getItem('saved'))).toBe('yes');});
test('browser crash cleans up live process state and lock',async()=>{const p=f.service.create({name:'Crash',launchUrl:origin});await f.service.launch(p.id);const context=f.service.running.get(p.id)!.context!;await context.browser()!.close();expect(f.service.running.has(p.id)).toBe(false);expect(fs.existsSync(path.join(p.directory,'.phantom-lock'))).toBe(false);expect(f.db.rows('SELECT ended_at FROM launches')[0]?.ended_at).not.toBe(null);});
test('failed launch cleans state without credential logging',async()=>{await f.service.proxySave(undefined,{name:'Unreachable',protocol:'http',host:'127.0.0.1',port:1,username:'sensitive-user',password:'sensitive-pass'});const p=f.service.create({name:'Failure',launchUrl:origin,proxyId:f.service.snapshot().proxies[0]!.id});await expect(f.service.launch(p.id)).rejects.toThrow('launch failed');expect(f.service.running.size).toBe(0);expect(fs.existsSync(path.join(p.directory,'.phantom-lock'))).toBe(false);expect(JSON.stringify(f.service.snapshot())).not.toContain('sensitive-pass');});

test('real automation report includes every action with safe outcomes and screenshot reference', async () => {
 const p=f.service.create({name:'Structured report',launchUrl:origin}); await f.service.launch(p.id);
 await f.service.automate(p.id,[{action:'navigate',url:origin},{action:'wait',selector:'#value'},{action:'fill',selector:'#value',value:'PRIVATE_FILL'},{action:'click',selector:'#button'},{action:'title'},{action:'screenshot'}]);
 const dir=path.join(f.root,'reports'); const report=JSON.parse(fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(n=>n.endsWith('.json'))!),'utf8'));
 expect(report.report.map((s:{action:string})=>s.action)).toEqual(['navigate','wait','fill','click','title','screenshot']); expect(report.outcome).toBe('success'); expect(JSON.stringify(report)).not.toContain('PRIVATE_FILL');
 expect(fs.existsSync(path.join(dir,report.report[5].screenshot))).toBe(true);
});

test('startup tabs, homepage, DPR, explicit geolocation and stable relaunch are real browser behavior',async()=>{
 const p=f.service.create({name:'Configured tabs',homepage:origin+'/home',startupUrls:[origin+'/first',origin+'/second'],config:{deviceScaleFactor:1.5,webrtcPolicy:'disable-non-proxied-udp',geolocationPermission:'allow',geolocation:{latitude:-0.3,longitude:36}}});
 const context=await f.service.launch(p.id);expect(context.pages().map(p=>p.url())).toEqual([origin+'/first',origin+'/second']);
 const observed=await f.service.diagnose(p.id);expect(observed.observed.devicePixelRatio).toBe(1.5);expect(observed.observed.geolocationPermission).toBe('granted');expect(observed.observed.geolocation.status).toBe('observed');expect(observed.observed.geolocation.coordinates).toMatchObject({latitude:-0.3,longitude:36});expect(observed.inconsistencies).toEqual([]);
 const geo=await f.service.page(p.id).evaluate(()=>new Promise<{latitude:number;longitude:number}>((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude}),reject)));
 expect(geo).toEqual({latitude:-0.3,longitude:36});await f.service.home(p.id);expect(f.service.page(p.id).url()).toBe(origin+'/home');
 await f.service.stop(p.id);await f.service.launch(p.id);const again=await f.service.diagnose(p.id);expect(again.observed.devicePixelRatio).toBe(observed.observed.devicePixelRatio);expect(again.expected).toEqual(observed.expected);expect(f.service.profile(p.id).lastUsed).not.toBe(null);
});

test('geolocation coordinates alone never grant permission',async()=>{
 const p=f.service.create({name:'No consent',launchUrl:origin,config:{geolocation:{latitude:0,longitude:0}}});await f.service.launch(p.id);
 expect((await f.service.diagnose(p.id)).observed.geolocationPermission).toBe('denied');
});

test('HTTP Basic and SOCKS5 profiles route independently through controlled local proxies',async()=>{
 const {httpProxy,socksProxy}=await import('./proxy-fixture');const targetPort=Number(new URL(origin).port),http=await httpProxy(targetPort,'local-user:local-password'),socks=await socksProxy(targetPort);
 try{
 await f.service.proxySave(undefined,{name:'HTTP Basic',protocol:'http',host:'127.0.0.1',port:http.port,username:'local-user',password:'local-password',region:'Local test'});
 await f.service.proxySave(undefined,{name:'SOCKS',protocol:'socks5',host:'127.0.0.1',port:socks.port});
 const proxies=f.service.snapshot().proxies;
 const a=f.service.create({name:'HTTP profile',launchUrl:origin+'/http',proxyId:proxies.find(p=>p.name==='HTTP Basic')!.id}),b=f.service.create({name:'SOCKS profile',launchUrl:origin+'/socks',proxyId:proxies.find(p=>p.name==='SOCKS')!.id});
 await f.service.launch(a.id);await f.service.page(a.id).evaluate(()=>localStorage.setItem('route','http'));await f.service.launch(b.id);
 expect(http.stats.forwarded).toBeGreaterThan(0);expect(http.stats.challenges).toBeGreaterThan(0);expect(socks.stats.forwarded).toBeGreaterThan(0);
 expect(await f.service.page(b.id).evaluate(()=>localStorage.getItem('route'))).toBe(null);expect(f.service.running.size).toBe(2);
 }finally{await f.service.shutdown();await http.close();await socks.close();}
});

test('proxy probe records bounded real latency and redacted failures without direct fallback',async()=>{
 const {httpProxy}=await import('./proxy-fixture');let hits=0;const ipServer=http.createServer((_req,res)=>{hits++;res.setHeader('Content-Type','application/json');res.end('{"ip":"127.0.0.1"}');});
 await new Promise<void>(resolve=>ipServer.listen(0,'127.0.0.1',resolve));const port=(ipServer.address() as {port:number}).port,proxy=await httpProxy(port);
 try{
 await f.service.proxySave(undefined,{name:'Probe',protocol:'http',host:'127.0.0.1',port:proxy.port});const saved=f.service.snapshot().proxies[0]!;
 expect(await f.service.proxyTest(saved.id,`http://127.0.0.1:${port}`)).toContain('Connected');expect(proxy.stats.forwarded).toBeGreaterThan(0);expect(f.service.snapshot().proxies[0]!.latencyMs).toBeGreaterThan(0);
 await proxy.close();const before=hits;const p=f.service.create({name:'Fail closed',proxyId:saved.id,launchUrl:`http://127.0.0.1:${port}/must-not-be-direct`});await expect(f.service.launch(p.id)).rejects.toThrow('launch failed');expect(hits).toBe(before);
 const result=await f.service.proxyTest(saved.id,`http://127.0.0.1:${port}`);expect(result).toContain('Connection failed');expect(hits).toBe(before);
 }finally{await proxy.close();await new Promise<void>(resolve=>ipServer.close(()=>resolve()));}
});

test('delay and URL actions execute, keep durations, and never persist raw page URLs',async()=>{
 const p=f.service.create({name:'Timed automation',launchUrl:origin+'/?token=PRIVATE_QUERY'});await f.service.launch(p.id);await f.service.automate(p.id,[{action:'delay',milliseconds:70},{action:'url'},{action:'title'}]);
 const dir=path.join(f.root,'reports'),report=JSON.parse(fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(p=>p.endsWith('.json'))!),'utf8'));
 expect(report.outcome).toBe('success');expect(report.report[0].durationMs).toBeGreaterThanOrEqual(60);expect(report.durationMs).toBeGreaterThanOrEqual(report.report[0].durationMs);expect(JSON.stringify(report)).not.toContain('PRIVATE_QUERY');
});

test('URL, title and selector-state conditions wait for real changes without persisting private criteria',async()=>{
 const p=f.service.create({name:'Conditions',launchUrl:origin});await f.service.launch(p.id);
 const job=f.service.automate(p.id,[{action:'waitURL',url:origin+'/changed?token=PRIVATE_CRITERIA'},{action:'waitTitle',title:'PRIVATE_TITLE'},{action:'wait',selector:'#absent',state:'hidden'}]);
 await f.service.page(p.id).evaluate(()=>{setTimeout(()=>{history.pushState({},'','/changed?token=PRIVATE_CRITERIA');setTimeout(()=>document.title='PRIVATE_TITLE',50);},75);});
 expect(await job).toBe('Completed');const dir=path.join(f.root,'reports'),text=fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(p=>p.endsWith('.json'))!),'utf8');expect(text).not.toContain('PRIVATE_CRITERIA');expect(text).not.toContain('PRIVATE_TITLE');expect(JSON.parse(text).durationMs).toBeGreaterThanOrEqual(100);
});

test('long delay cancellation is bounded and marks the report cancelled',async()=>{
 const p=f.service.create({name:'Cancel delay',launchUrl:origin});await f.service.launch(p.id);const started=performance.now(),job=f.service.automate(p.id,[{action:'delay',milliseconds:30000},{action:'title'}]);await f.service.automationStop(p.id);expect(await job).toBe('Stopped');expect(performance.now()-started).toBeLessThan(10000);
 const dir=path.join(f.root,'reports'),report=JSON.parse(fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(p=>p.endsWith('.json'))!),'utf8'));expect(report.outcome).toBe('cancelled');expect(report.attemptedSteps).toBe(1);
});

test('opt-in native tab and session storage restoration survives a graceful stop',async()=>{
 const p=f.service.create({name:'Restore native session',launchUrl:origin+'/initial',restoreSession:true});const context=await f.service.launch(p.id);
 await f.service.page(p.id).evaluate(()=>{sessionStorage.setItem('tab-session','private-tab');history.pushState({},'','/remember-first');});const second=await context.newPage();await second.goto(origin+'/remember-second');await second.evaluate(()=>sessionStorage.setItem('tab-session','second-tab'));
 await f.service.stop(p.id);const restored=await f.service.launch(p.id);await expect.poll(()=>restored.pages().map(p=>p.url())).toContain(origin+'/remember-first');await expect.poll(()=>restored.pages().map(p=>p.url())).toContain(origin+'/remember-second');
 expect(await restored.pages().find(p=>p.url().endsWith('/remember-first'))!.evaluate(()=>sessionStorage.getItem('tab-session'))).toBe('private-tab');
});

test('IndexedDB and Chromium history persist without crossing profile directories',async()=>{
 const a=f.service.create({name:'IDB A',launchUrl:origin+'/only-A'}),b=f.service.create({name:'IDB B',launchUrl:origin+'/only-B'});
 await f.service.launch(a.id);await f.service.page(a.id).evaluate(()=>new Promise<void>((resolve,reject)=>{const request=indexedDB.open('workspace-db',1);request.onupgradeneeded=()=>request.result.createObjectStore('values');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('values','readwrite');tx.objectStore('values').put('profile-A','identity');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}));
 await f.service.launch(b.id);expect(await f.service.page(b.id).evaluate(async()=>(await indexedDB.databases()).some(db=>db.name==='workspace-db'))).toBe(false);
 await f.service.stop(a.id);await f.service.launch(a.id);expect(await f.service.page(a.id).evaluate(()=>new Promise<string|undefined>((resolve,reject)=>{const request=indexedDB.open('workspace-db',1);request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,get=db.transaction('values').objectStore('values').get('identity');get.onsuccess=()=>{resolve(get.result as string|undefined);db.close();};get.onerror=()=>reject(get.error);};}))).toBe('profile-A');
 await f.service.stop(a.id);await f.service.stop(b.id);const {default:init}=await import('sql.js'),SQL=await init();
 const history=(directory:string)=>{const db=new SQL.Database(fs.readFileSync(path.join(directory,'Default','History')));try{return JSON.stringify(db.exec('SELECT url FROM urls'));}finally{db.close();}};
 expect(history(a.directory)).toContain('/only-A');expect(history(b.directory)).toContain('/only-B');expect(history(b.directory)).not.toContain('/only-A');
});

test('privacy screenshots cover fixed content outside the root element bounds',async()=>{
 const p=f.service.create({name:'Out of bounds privacy',launchUrl:origin});await f.service.launch(p.id);const page=f.service.page(p.id);
 await page.setContent('<style>html,body{height:1px;margin:0}</style><div style="position:fixed;top:100px;left:0;width:400px;height:200px;background:red">PRIVATE_FIXED_CONTENT</div>');
 await f.service.automate(p.id,[{action:'screenshot'}]);const dir=path.join(f.root,'reports'),report=JSON.parse(fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(n=>n.endsWith('.json'))!),'utf8')),png=fs.readFileSync(path.join(dir,report.report[0].screenshot)).toString('base64');
 const pixel=await page.evaluate(data=>new Promise<number[]>((resolve,reject)=>{const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const c=canvas.getContext('2d')!;c.drawImage(image,0,0);resolve([...c.getImageData(10,120,1,1).data]);};image.onerror=reject;image.src='data:image/png;base64,'+data;}),png);
 expect(pixel).toEqual([17,19,24,255]);
});

test('Cache Storage and service-worker state remain profile-local and survive restarts',async()=>{
 const a=f.service.create({name:'Worker A',launchUrl:origin}),b=f.service.create({name:'Worker B',launchUrl:origin});await f.service.launch(a.id);
 await f.service.page(a.id).evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;const cache=await caches.open('profile-cache');await cache.put('/saved-value',new Response('profile-A-only'));});
 await expect.poll(()=>f.service.page(a.id).evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 expect(await f.service.page(a.id).evaluate(()=>fetch('/worker-controlled').then(r=>r.text()))).toBe('profile-worker-active');
 await f.service.launch(b.id);expect(await f.service.page(b.id).evaluate(()=>caches.keys())).toEqual([]);expect(await f.service.page(b.id).evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
 expect(await f.service.page(b.id).evaluate(()=>fetch('/worker-controlled').then(r=>r.text()))).not.toBe('profile-worker-active');
 await f.service.stop(a.id);await f.service.launch(a.id);expect(await f.service.page(a.id).evaluate(async()=>(await (await caches.open('profile-cache')).match('/saved-value'))?.text())).toBe('profile-A-only');
 expect(await f.service.page(a.id).evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length)).toBe(1);expect(await f.service.page(a.id).evaluate(()=>fetch('/worker-controlled').then(r=>r.text()))).toBe('profile-worker-active');
 expect(await f.service.page(b.id).evaluate(()=>caches.keys())).toEqual([]);
});

test('actual UA headers, client hints and native fingerprint samples are coherent and stable',async({browserName},testInfo)=>{
 expect(browserName).toBe('chromium');
 const ua=process.platform==='win32'?'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
 const p=f.service.create({name:'Observed identity',launchUrl:origin,config:{userAgent:ua,locale:'en-GB',timezoneId:'Africa/Nairobi',deviceScaleFactor:1.25,webrtcPolicy:'disable-non-proxied-udp'}});await f.service.launch(p.id);
 const first=await f.service.diagnose(p.id),headers=await f.service.page(p.id).evaluate(()=>fetch('/headers').then(r=>r.json()));
 expect(headers['user-agent']).toBe(ua);expect(headers['sec-ch-ua']).toContain('156');expect(headers['sec-ch-ua-platform']).toContain(process.platform==='win32'?'Windows':'Linux');expect(headers['accept-language']).toContain('en-GB');
 expect(first.inconsistencies).toEqual([]);expect(first.observed.highEntropyClientHints?.fullVersionList?.some(b=>b.version.startsWith('156.'))).toBe(true);expect(first.observed.canvas.sha256).toMatch(/^[a-f0-9]{64}$/);expect(first.observed.audio.sha256).toMatch(/^[a-f0-9]{64}$/);
 expect(first.observed.permissions.camera).not.toBe('granted');expect(first.observed.permissions.microphone).not.toBe('granted');expect(first.observed.media.identities).toBe('omitted');expect(first.launchPolicy.nonProxiedUDPArgumentObserved).toBe(true);
 expect(JSON.stringify(first.observed.webRTC)).not.toMatch(/192\.168\.|127\.0\.0\.1|\.local/);expect(first.observed.leakChecks.dns).toContain('not-tested');
 await f.service.stop(p.id);await f.service.launch(p.id);const again=await f.service.diagnose(p.id);
 expect(again.observed.canvas.sha256).toBe(first.observed.canvas.sha256);expect(again.observed.audio.sha256).toBe(first.observed.audio.sha256);expect(again.observed.languages).toEqual(first.observed.languages);expect(again.inconsistencies).toEqual([]);
 const {processId:ignored,...result}=again;void ignored;fs.writeFileSync(testInfo.outputPath('controlled-fingerprint.json'),JSON.stringify({source:'real persistent profile browser on controlled local origin',result,headers:{userAgent:headers['user-agent'],clientHints:headers['sec-ch-ua'],platform:headers['sec-ch-ua-platform'],language:headers['accept-language']}},null,2));
});

test('proxy probe rejects malformed public-IP bodies instead of claiming connectivity verification',async()=>{
 const {httpProxy}=await import('./proxy-fixture');const proxy=await httpProxy(Number(new URL(origin).port));try{
 await f.service.proxySave(undefined,{name:'Invalid response',protocol:'http',host:'127.0.0.1',port:proxy.port});const id=f.service.snapshot().proxies[0]!.id;
 expect(await f.service.proxyTest(id,origin+'/ip-invalid')).toContain('Connection failed');expect(proxy.stats.forwarded).toBeGreaterThan(0);
 }finally{await proxy.close();}
});

test('untrusted HTTPS proxy fails closed without insecure TLS flags or direct fallback',async()=>{
 const {tlsProxy}=await import('./tls-proxy-fixture'),proxy=await tlsProxy(Number(new URL(origin).port));try{
 await f.service.proxySave(undefined,{name:'Untrusted TLS proxy',protocol:'https',host:'127.0.0.1',port:proxy.port});const p=f.service.create({name:'TLS rejection',launchUrl:origin,proxyId:f.service.snapshot().proxies[0]!.id});await expect(f.service.launch(p.id)).rejects.toThrow('launch failed');expect(proxy.stats.forwarded).toBe(0);expect(f.service.running.size).toBe(0);
 }finally{await proxy.close();}
});

test('HTTPS proxy with a trusted disposable CA and Basic authentication works on Windows',async()=>{
 test.skip(process.platform!=='win32'||process.env.CI!=='true'||!process.env.RUNNER_TEMP,'Certificate trust fixture requires ephemeral Windows CI; no consumer trust-store changes');
 const {tlsProxy}=await import('./tls-proxy-fixture'),proxy=await tlsProxy(Number(new URL(origin).port),'tls-user:tls-test-password');try{
 proxy.trustInEphemeralWindowsCI();await f.service.proxySave(undefined,{name:'Validated TLS proxy',protocol:'https',host:'127.0.0.1',port:proxy.port,username:'tls-user',password:'tls-test-password'});const p=f.service.create({name:'Trusted TLS routing',launchUrl:origin,proxyId:f.service.snapshot().proxies[0]!.id});await f.service.launch(p.id);
 expect(await f.service.page(p.id).title()).toBe('Controlled local test');expect(proxy.stats.forwarded).toBeGreaterThan(0);expect(proxy.stats.challenges).toBeGreaterThan(0);await f.service.stop(p.id);
 }finally{await f.service.shutdown();await proxy.close();}
});

test('real dead-manager/live-Chromium orphan remains locked and only verified owned processes are cleaned',async()=>{
 const {build}=await import('esbuild'),{fork}=await import('node:child_process'),{randomUUID}=await import('node:crypto'),{chromium}=await import('playwright'),{ownedProcesses}=await import('../src/main/process-ownership'),{Service}=await import('../src/main/service'),{verifyRuntime}=await import('../src/shared/runtime-integrity');
 const executable=chromium.executablePath(),manifest=JSON.parse(fs.readFileSync(path.resolve(`scripts/runtime-manifests/${process.platform}-x64-chromium-156.0.8078.4.json`),'utf8'));verifyRuntime(path.dirname(path.dirname(executable)),manifest);
 const p=f.service.create({name:'Real orphan'}),launchId=randomUUID(),worker=path.join(f.root,'orphan-manager.cjs');await build({entryPoints:['tests/fixtures/orphan-manager.ts'],bundle:true,platform:'node',format:'cjs',outfile:worker});
 const manager=fork(worker,[],{stdio:['ignore','ignore','ignore','ipc']}),dead=new Promise<void>(resolve=>manager.once('exit',()=>resolve()));let browserPid:number|undefined;
 try{
  const ready=new Promise<{browserPid:number}>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Orphan fixture startup timeout')),20000);manager.once('message',message=>{clearTimeout(timer);resolve(message as {browserPid:number});});manager.once('error',reject);});
  manager.send({directory:p.directory,executable,profileId:p.id,launchId});browserPid=(await ready).browserPid;expect(browserPid).toBeGreaterThan(0);
  expect(ownedProcesses(launchId,p.directory,executable)?.some(x=>x.pid===browserPid)).toBe(true);f.db.transaction(()=>f.db.run('INSERT INTO launches VALUES(?,?,?,NULL,NULL)',[launchId,p.id,new Date().toISOString()]));
  manager.kill('SIGKILL');await dead;expect(ownedProcesses(launchId,p.directory,executable)?.some(x=>x.pid===browserPid)).toBe(true);
  const recovered=new Service(f.db,f.root,f.secrets,true);await expect(recovered.launch(p.id)).rejects.toThrow('locked');expect(fs.existsSync(path.join(p.directory,'.phantom-lock'))).toBe(true);expect(f.db.rows('SELECT outcome FROM launches WHERE id=?',[launchId])[0]?.outcome).toBe('recovery_required');await recovered.shutdown();
 }finally{
  if(manager.exitCode===null&&manager.signalCode===null){manager.kill('SIGKILL');await dead;}
  const identities=ownedProcesses(launchId,p.directory,executable);if(browserPid&&identities?.some(x=>x.pid===browserPid)){process.kill(browserPid,'SIGTERM');await expect.poll(()=>ownedProcesses(launchId,p.directory,executable),{timeout:15000}).toEqual([]);}
 }
});

test('proxy authentication rejection never forwards credentials or falls back directly',async()=>{
 const {httpProxy}=await import('./proxy-fixture');const proxy=await httpProxy(Number(new URL(origin).port),'accepted-user:current-password');let hits=0;const count=()=>hits++;server.on('request',count);
 try{await f.service.proxySave(undefined,{name:'Expired fixture credentials',protocol:'http',host:'127.0.0.1',port:proxy.port,username:'accepted-user',password:'expired-PRIVATE-password'});const p=f.service.create({name:'Rejected authentication',launchUrl:origin,proxyId:f.service.snapshot().proxies[0]!.id});await expect(f.service.launch(p.id)).rejects.toThrow('launch failed');expect(proxy.stats.challenges).toBeGreaterThan(0);expect(proxy.stats.forwarded).toBe(0);expect(hits).toBe(0);expect(JSON.stringify(f.service.snapshot())).not.toContain('expired-PRIVATE-password');}finally{server.removeListener('request',count);await proxy.close();}
});

test('SOCKS5 sends a controlled unresolved hostname to the proxy for resolution',async()=>{
 const {socksProxy}=await import('./proxy-fixture');const alias='proxy-only.invalid',port=Number(new URL(origin).port),proxy=await socksProxy(port,alias);
 try{await f.service.proxySave(undefined,{name:'Proxy DNS fixture',protocol:'socks5',host:'127.0.0.1',port:proxy.port});const p=f.service.create({name:'Proxy-resolved origin',launchUrl:`http://${alias}:${port}`,proxyId:f.service.snapshot().proxies[0]!.id});await f.service.launch(p.id);expect(await f.service.page(p.id).title()).toBe('Controlled local test');expect(proxy.stats.requestedHosts).toContain(alias);expect(proxy.stats.forwarded).toBeGreaterThan(0);}finally{await f.service.shutdown();await proxy.close();}
});

test('controlled local STUN records real UDP behavior without claiming public leak protection',async({browserName},testInfo)=>{
 expect(browserName).toBe('chromium');
 const {localStun}=await import('./stun-fixture');const observations=[];
 try{for(const scenario of [{policy:'default',proxy:false},{policy:'disable-non-proxied-udp',proxy:false},{policy:'disable-non-proxied-udp',proxy:true}] as const){const {policy}=scenario,stun=await localStun(),proxy=scenario.proxy?await (await import('./proxy-fixture')).httpProxy(Number(new URL(origin).port)):undefined;try{let proxyId:string|null=null;if(proxy){await f.service.proxySave(undefined,{name:'STUN transport fixture',protocol:'http',host:'127.0.0.1',port:proxy.port});proxyId=f.service.snapshot().proxies[0]!.id;}const p=f.service.create({name:`Local STUN ${policy}`,launchUrl:origin,proxyId,config:{webrtcPolicy:policy}});await f.service.launch(p.id);
  const result=await f.service.page(p.id).evaluate(async port=>{
   const peer=new RTCPeerConnection({iceServers:[{urls:`stun:127.0.0.1:${port}`}]}),types=new Set<string>();let finish!:()=>void;let timer:ReturnType<typeof setTimeout>|undefined;
   try{const done=new Promise<void>(resolve=>{finish=resolve;timer=setTimeout(resolve,2500);});peer.onicecandidate=e=>{if(!e.candidate)finish();else if(e.candidate.type)types.add(e.candidate.type);};peer.createDataChannel('controlled-test');await peer.setLocalDescription(await peer.createOffer());await done;return {candidateTypes:[...types].sort()};}finally{if(timer)clearTimeout(timer);peer.close();}
  },stun.port);
  if(policy==='default'){expect(stun.stats.bindingRequests).toBeGreaterThan(0);expect(result.candidateTypes).toContain('srflx');}
  if(proxy)expect(proxy.stats.forwarded).toBeGreaterThan(0);observations.push({policy,proxyAssigned:scenario.proxy,httpForwardedRequests:proxy?.stats.forwarded??0,udpBindingRequests:stun.stats.bindingRequests,...result,scope:'loopback fixture with TEST-NET mapping, not real public IP/DNS leak certification'});await f.service.stop(p.id);
 }finally{await stun.close();await proxy?.close();}}fs.writeFileSync(testInfo.outputPath('controlled-local-stun.json'),JSON.stringify(observations,null,2));await testInfo.attach('controlled-local-stun',{body:JSON.stringify(observations,null,2),contentType:'application/json'});
 }finally{await f.service.shutdown();}
});
