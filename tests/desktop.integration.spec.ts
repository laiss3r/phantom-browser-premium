import {test,expect,_electron as electron} from '@playwright/test';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
test('Electron shell secure preload, real IPC, persistent CRUD and offline UI',async()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'phantom-desktop-'));const args=['.',`--user-data-dir=${root}`,...(process.platform==='linux'?['--no-sandbox']:[])];let app=await electron.launch({args,env:{...process.env,PHANTOM_DEV_URL:'',ELECTRON_DISABLE_SECURITY_WARNINGS:'true'}});try{let page=await app.firstWindow();await expect(page.getByRole('heading',{name:'Dashboard',exact:true})).toBeVisible();await expect(page.getByText('Desktop connected',{exact:true})).toBeVisible();expect(await page.evaluate(()=>typeof (window as unknown as {require?:unknown}).require)).toBe('undefined');await page.getByRole('button',{name:'＋ Create profile'}).first().click();await page.getByLabel('Profile name',{exact:true}).fill('Desktop persistence');await page.getByLabel('Tags (comma-separated)').fill('desktop, qa');await page.getByRole('button',{name:'Create profile',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();await page.getByRole('button',{name:'Browser Profiles'}).click();await expect(page.getByText('Desktop persistence',{exact:true})).toBeVisible();const profile=await page.evaluate(async()=>{const reply=await window.phantom!.request({action:'snapshot'});return reply.ok?reply.snapshot.profiles[0]:undefined;});expect(profile?.name).toBe('Desktop persistence');expect(profile?.tags).toEqual(['desktop','qa']);const bad=await app.evaluate(async({webContents})=>{const contents=webContents.getAllWebContents()[0];if(!contents)throw Error('Missing renderer');return contents.executeJavaScript('window.phantom.request({action:"exec",command:"calc"}).catch(()=>"rejected")');});expect(bad).toBe('rejected');await app.close();app=await electron.launch({args,env:{...process.env,PHANTOM_DEV_URL:'',ELECTRON_DISABLE_SECURITY_WARNINGS:'true'}});page=await app.firstWindow();await page.context().setOffline(true);await page.getByRole('button',{name:'Browser Profiles'}).click();await expect(page.getByText('Desktop persistence',{exact:true})).toBeVisible();await page.screenshot({path:'docs/desktop-profiles.png'});await page.getByRole('button',{name:'Dashboard',exact:true}).click();await page.screenshot({path:'docs/desktop-dashboard.png'});}finally{await app.close();fs.rmSync(root,{recursive:true,force:true});}});

test('Windows DPAPI encrypts credentials and never returns plaintext',async()=>{test.skip(process.platform!=='win32','Requires actual Windows DPAPI');const root=fs.mkdtempSync(path.join(os.tmpdir(),'phantom-dpapi-'));const app=await electron.launch({args:['.',`--user-data-dir=${root}`]});try{const page=await app.firstWindow();const reply=await page.evaluate(async()=>window.phantom!.request({action:'proxySave',input:{name:'DPAPI test',protocol:'http',host:'127.0.0.1',port:8080,username:'controlled-user',password:'controlled-dpapi-password'}}));expect(reply.ok).toBe(true);expect(JSON.stringify(reply)).not.toContain('controlled-dpapi-password');const bytes=fs.readFileSync(path.join(root,'phantom.sqlite'));expect(bytes.includes(Buffer.from('controlled-dpapi-password'))).toBe(false);}finally{await app.close();fs.rmSync(root,{recursive:true,force:true});}});

test('renderer security preferences, denied new windows and blocked external navigation', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phantom-security-'));
  const app = await electron.launch({args: ['.', `--user-data-dir=${root}`, ...(process.platform === 'linux' ? ['--no-sandbox'] : [])]});
  try {
    const page = await app.firstWindow();
    const trusted = page.url();
    const source = fs.readFileSync('src/main/index.ts', 'utf8');
    for (const setting of ['contextIsolation:true', 'nodeIntegration:false', 'sandbox:true', 'webSecurity:true']) expect(source).toContain(setting);
    await app.evaluate(async ({BrowserWindow}) => BrowserWindow.getAllWindows()[0]!.webContents.executeJavaScriptInIsolatedWorld(999, [{code: 'globalThis.__phantomIsolationProbe = 1; true'}]));
    expect(await page.evaluate(() => '__phantomIsolationProbe' in globalThis)).toBe(false);
    await page.evaluate(() => {window.open('https://example.invalid/blocked');});
    expect(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().length)).toBe(1);
    const blocked = app.evaluate(({BrowserWindow}) => new Promise<boolean>(resolve => BrowserWindow.getAllWindows()[0]!.webContents.once('will-navigate', event => resolve(event.defaultPrevented))));
    await page.evaluate(() => {location.href = 'https://example.invalid/blocked';});
    expect(await blocked).toBe(true);
    expect(page.url()).toBe(trusted);
    expect(await page.evaluate(() => typeof (window as unknown as {process?: unknown}).process)).toBe('undefined');
  } finally {await app.close(); fs.rmSync(root, {recursive: true, force: true});}
});

test('guided setup, archive/unarchive and encrypted backup round trip through real IPC',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'phantom-guided-')),archive=path.join(root,'controlled.phantom.jwe');
 const app=await electron.launch({args:['.',`--user-data-dir=${root}`,...(process.platform==='linux'?['--no-sandbox']:[])]});
 try{
  await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});dialog.showMessageBox=async()=>({response:1,checkboxChecked:false});},archive);
  const page=await app.firstWindow();await page.getByRole('button',{name:'＋ Create profile'}).first().click();
  await page.getByLabel('Profile name',{exact:true}).fill('Guided workspace');await page.getByLabel('Description',{exact:true}).fill('Controlled desktop setup');
  await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByLabel('Homepage (optional)',{exact:true}).fill('https://example.com/home');await page.getByLabel('Startup URLs (one per line, maximum 10)').fill('https://example.com/one\nhttps://example.com/two');
  await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByLabel('Device pixel ratio',{exact:true}).fill('1.25');await page.getByLabel('Timezone',{exact:true}).fill('Africa/Nairobi');
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page.getByRole('heading',{name:'Review configuration'})).toBeVisible();await page.getByRole('button',{name:'Create profile',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
  const snapshot=async()=>page.evaluate(async()=>{const reply=await window.phantom!.request({action:'snapshot'});if(!reply.ok)throw Error(reply.error);return reply.snapshot;});
  const p=(await snapshot()).profiles[0]!;expect(p.description).toBe('Controlled desktop setup');expect(p.startupUrls).toHaveLength(2);expect(p.config.deviceScaleFactor).toBe(1.25);
  await page.getByRole('button',{name:'Browser Profiles',exact:true}).click();await page.getByLabel('More actions for Guided workspace',{exact:true}).click();await page.getByRole('button',{name:'Archive profile',exact:true}).click();
  await expect(page.getByText('Guided workspace',{exact:true})).not.toBeVisible();expect(fs.existsSync(p.directory)).toBe(true);expect((await snapshot()).profiles[0]!.archivedAt).not.toBe(null);
  await page.getByLabel('Archive filter').selectOption('archived');await expect(page.getByText('Guided workspace',{exact:true})).toBeVisible();await page.getByLabel('More actions for Guided workspace',{exact:true}).click();await page.getByRole('button',{name:'Unarchive profile',exact:true}).click();expect((await snapshot()).profiles[0]!.archivedAt).toBe(null);
  await page.getByRole('button',{name:'Backups',exact:true}).click();await page.getByLabel('Profile to back up').selectOption(p.id);await page.getByRole('button',{name:'Export backup…',exact:true}).click();
  await page.getByLabel('Backup password',{exact:true}).fill('Controlled backup password!');await page.getByLabel('Confirm password',{exact:true}).fill('Controlled backup password!');await page.getByRole('button',{name:'Choose export file…',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(fs.readFileSync(archive,'utf8').split('.')).toHaveLength(5);expect(fs.readFileSync(path.join(root,'phantom.sqlite')).includes(Buffer.from('Controlled backup password!'))).toBe(false);
  await page.getByRole('button',{name:'↥ Restore backup',exact:true}).click();await page.getByLabel('Backup password',{exact:true}).fill('Controlled backup password!');await page.getByRole('button',{name:'Choose archive…',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();
  const restored=(await snapshot()).profiles.find(profile=>profile.id!==p.id)!;expect(restored.description).toBe(p.description);expect(restored.startupUrls).toEqual(p.startupUrls);expect(restored.directory).not.toBe(p.directory);
 }finally{await app.close();fs.rmSync(root,{recursive:true,force:true});}
});

test('proxy dialog explains invalid hosts and saves canonical IPv6 through validated IPC',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'phantom-proxy-ui-')),app=await electron.launch({args:['.',`--user-data-dir=${root}`,...(process.platform==='linux'?['--no-sandbox']:[])]});
 try{const page=await app.firstWindow();await page.getByRole('button',{name:'Proxy Manager',exact:true}).click();await page.getByRole('button',{name:/Add proxy/}).first().click();await page.getByLabel('Proxy name',{exact:true}).fill('Controlled IPv6 syntax');await page.getByLabel('Host',{exact:true}).fill('localhost:8080');await page.getByRole('button',{name:'Save proxy',exact:true}).click();await expect(page.getByRole('alert')).toContainText('without a scheme or port');await page.getByLabel('Host',{exact:true}).fill('[::1]');await page.getByRole('button',{name:'Save proxy',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();const state=await page.evaluate(()=>window.phantom!.request({action:'snapshot'}));expect(state.ok&&state.snapshot.proxies[0]?.host).toBe('::1');await page.getByRole('button',{name:'Fingerprint Diagnostics',exact:true}).click();await expect(page.getByText('Diagnostic only',{exact:true}).first()).toBeVisible();await expect(page.getByText('Unsupported',{exact:true}).first()).toBeVisible();
 }finally{await app.close();fs.rmSync(root,{recursive:true,force:true});}
});
