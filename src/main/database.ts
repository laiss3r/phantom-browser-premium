import initSqlJs,{type Database as SQLDatabase,type SqlValue,type SqlJsStatic} from 'sql.js';
import {randomUUID} from 'node:crypto';import fs from 'node:fs';import path from 'node:path';
export class Database{
 private constructor(private db:SQLDatabase,readonly file:string,private SQL:SqlJsStatic){}
 static async open(file:string,wasmPath?:string){const SQL=await initSqlJs(wasmPath?{locateFile:()=>wasmPath}:{});fs.mkdirSync(path.dirname(file),{recursive:true});const existed=fs.existsSync(file);const db=new Database(new SQL.Database(existed?fs.readFileSync(file):undefined),file,SQL);db.db.run('PRAGMA foreign_keys=ON');const version=Number(db.rows('PRAGMA user_version')[0]?.user_version??0);if(version>2)throw Error('Database was created by a newer application');if(version===0)db.transaction(()=>{db.db.run(`
 CREATE TABLE profiles(id TEXT PRIMARY KEY,data TEXT NOT NULL);
 CREATE TABLE proxies(id TEXT PRIMARY KEY,data TEXT NOT NULL,secret BLOB);
 CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE profile_tags(profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,tag TEXT NOT NULL,PRIMARY KEY(profile_id,tag));
 CREATE INDEX tag_idx ON profile_tags(tag);
 CREATE TABLE launches(id TEXT PRIMARY KEY,profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,started_at TEXT,ended_at TEXT,outcome TEXT);
 CREATE INDEX launch_profile_idx ON launches(profile_id,started_at);
 CREATE TABLE diagnostics(id TEXT PRIMARY KEY,profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,created_at TEXT,data TEXT);
 CREATE TABLE backups(id TEXT PRIMARY KEY,profile_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,created_at TEXT,path TEXT,checksum TEXT);
 PRAGMA user_version=1;`);});if(version<2){if(existed&&version===1)fs.copyFileSync(file,file+'.pre-v2-'+randomUUID()+'.bak',fs.constants.COPYFILE_EXCL);try{db.transaction(()=>{db.db.run("CREATE TABLE provider_secrets(provider TEXT PRIMARY KEY,secret BLOB NOT NULL); PRAGMA user_version=2;");});}catch{throw Error('Provider storage migration failed; preserve the database and pre-v2 backup before repair');}}return db;}
 rows(sql:string,params:SqlValue[]=[]):Record<string,SqlValue>[]{const statement=this.db.prepare(sql);try{statement.bind(params);const rows=[];while(statement.step())rows.push(statement.getAsObject());return rows;}finally{statement.free();}}
 run(sql:string,params:SqlValue[]=[]){this.db.run(sql,params);}
 transaction<T>(fn:()=>T):T{
  const before=this.db.export();let committed=false;this.db.run('BEGIN IMMEDIATE');
  try{const result=fn();this.db.run('COMMIT');committed=true;this.persist();return result;}
  catch(error){if(committed){this.db.close();this.db=new this.SQL.Database(before);this.db.run('PRAGMA foreign_keys=ON');}else{try{this.db.run('ROLLBACK');}catch{/* preserve original error */}}throw error;}
 }
 persist(){const temp=this.file+'.'+randomUUID()+'.partial';const fd=fs.openSync(temp,'wx',0o600);
  try{try{fs.writeFileSync(fd,Buffer.from(this.db.export()));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temp,this.file);}finally{fs.rmSync(temp,{force:true});}
 }
 close(){this.persist();this.db.close();}
}
