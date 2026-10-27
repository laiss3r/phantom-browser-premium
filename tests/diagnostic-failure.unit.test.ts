import {it,expect,vi} from 'vitest';
import * as observer from '../src/main/fingerprint-observation';
import type {Page} from 'playwright';
import {fixture} from './helpers';
it('withholds hostile page exception text from diagnostic callers',async()=>{
 const f=await fixture();try{const p=f.service.create({name:'Controlled unit diagnostic'});vi.spyOn(f.service,'page').mockReturnValue({} as Page);vi.spyOn(observer,'observeFingerprint').mockRejectedValue(Error('PRIVATE_PAGE_TOKEN'));
 await expect(f.service.diagnose(p.id)).rejects.toThrow('Fingerprint observation failed or timed out; page details withheld');
 }finally{vi.restoreAllMocks();await f.cleanup();}
});
it('bounds a never-resolving browser observation to six seconds',async()=>{
 const f=await fixture();try{const p=f.service.create({name:'Bounded unit diagnostic'});vi.spyOn(f.service,'page').mockReturnValue({} as Page);vi.spyOn(observer,'observeFingerprint').mockImplementation(()=>new Promise(()=>{}));vi.useFakeTimers();
 const result=f.service.diagnose(p.id).catch(e=>e as Error);await vi.advanceTimersByTimeAsync(6001);expect((await result as Error).message).toBe('Fingerprint observation failed or timed out; page details withheld');
 }finally{vi.useRealTimers();vi.restoreAllMocks();await f.cleanup();}
});
it('does not save an observation from a profile stopped while diagnosis was pending',async()=>{
 const f=await fixture();try{const p=f.service.create({name:'Stopped unit diagnostic'});f.service.running.set(p.id,{launchId:'unit-only',closing:false,electronPid:process.pid,browserMayExist:false});vi.spyOn(f.service,'page').mockReturnValue({} as Page);let resolve!: (value:Awaited<ReturnType<typeof observer.observeFingerprint>>)=>void;
 vi.spyOn(observer,'observeFingerprint').mockImplementation(()=>new Promise(done=>{resolve=done;}));const task=f.service.diagnose(p.id).catch(e=>e as Error);f.service.running.delete(p.id);resolve({} as Awaited<ReturnType<typeof observer.observeFingerprint>>);expect((await task as Error).message).toContain('profile stopped');expect(f.service.snapshot().diagnostics).toEqual([]);
 }finally{f.service.running.clear();vi.restoreAllMocks();await f.cleanup();}
});
