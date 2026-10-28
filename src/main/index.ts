import {app,BrowserWindow,ipcMain,dialog,safeStorage,shell} from 'electron';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {Database} from './database';import {Service} from './service';import {authorized,dispatch} from './ipc';
if(app.isPackaged)process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(process.resourcesPath,'browser-runtime');
let window:BrowserWindow;let service:Service;let quitting=false;
if(!app.requestSingleInstanceLock())app.quit();else{
 app.on('second-instance',()=>{window?.show();window?.focus();});
 app.whenReady().then(async()=>{const root=app.getPath('userData');const db=await Database.open(path.join(root,'phantom.sqlite'),path.join(__dirname,'sql-wasm.wasm'));
 service=new Service(db,root,{async seal(value){if(process.platform!=='win32'||!await safeStorage.isAsyncEncryptionAvailable())throw Error('Credential storage requires Windows DPAPI; no plaintext fallback is permitted');return safeStorage.encryptStringAsync(value);},async open(value){if(process.platform!=='win32'||!await safeStorage.isAsyncEncryptionAvailable())throw Error('Windows DPAPI credential protection unavailable');return (await safeStorage.decryptStringAsync(value)).result;}});
 window=new BrowserWindow({width:1380,height:900,minWidth:1000,minHeight:680,backgroundColor:'#111318',title:'Phantom Browser',webPreferences:{preload:path.join(__dirname,'../preload/index.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});window.setMenuBarVisibility(false);
 const trustedUrl=!app.isPackaged&&process.env.PHANTOM_DEV_URL==='http://localhost:5173'?'http://localhost:5173/':pathToFileURL(path.join(__dirname,'../renderer/index.html')).href;
 window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',(event,url)=>{if(url!==trustedUrl)event.preventDefault();});window.webContents.on('will-attach-webview',event=>event.preventDefault());window.webContents.session.setPermissionCheckHandler(()=>false);window.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 ipcMain.handle('phantom:request',async(event,payload:unknown)=>{if(!authorized(event.sender.id,window.webContents.id,event.senderFrame?.url??'',trustedUrl,event.senderFrame===window.webContents.mainFrame))return {ok:false,error:'Unauthorized IPC sender'};return dispatch(service,payload,{
 confirmProxyDelete:async name=>(await dialog.showMessageBox(window,{type:'warning',buttons:['Cancel','Delete proxy'],defaultId:0,cancelId:0,message:`Delete ${name}?`,detail:'Profiles are not deleted. Unassign this proxy first.'})).response===1,
 confirmDelete:async name=>(await dialog.showMessageBox(window,{type:'warning',buttons:['Cancel','Delete permanently'],defaultId:0,cancelId:0,message:`Delete “${name}” and all its browser data?`,detail:'This cannot be undone.'})).response===1,
 confirmBackup:async(encrypted)=>(await dialog.showMessageBox(window,{type:'warning',buttons:['Cancel','Continue'],defaultId:0,cancelId:0,message:'Session data contains sensitive authentication material.',detail:(encrypted?'Password-encrypted backups use authenticated JWE. Losing the password makes recovery impossible.':'Unencrypted archives are NOT encrypted.')+' Keep them private. Proxy credentials are excluded. OS-bound browser cookies may not decrypt on another computer. Restores always create a new profile.'})).response===1,
 saveBackup:async(encrypted)=>{const result=await dialog.showSaveDialog(window,{defaultPath:encrypted?'profile.phantom.jwe':'profile.phantom.gz',filters:[{name:'Phantom backup',extensions:[encrypted?'jwe':'gz']}]});return result.canceled?undefined:result.filePath;},
 openBackup:async()=>{const result=await dialog.showOpenDialog(window,{properties:['openFile'],filters:[{name:'Phantom backup',extensions:['gz','jwe']}]});return result.canceled?undefined:result.filePaths[0];},
 openStorage:async directory=>{const error=await shell.openPath(directory);if(error)throw Error('Unable to open profile directory');}
 });});
 await window.loadURL(trustedUrl);service.log('Application started; no telemetry enabled');
 }).catch(()=>{dialog.showErrorBox('Phantom Browser could not start','Database, packaged assets or runtime initialization failed. Preserve your application-data folder before attempting repair.');app.exit(1);});
 app.on('window-all-closed',()=>app.quit());app.on('before-quit',event=>{if(!quitting&&service){event.preventDefault();quitting=true;void service.shutdown().finally(()=>{service.db.close();app.quit();});}});
}
