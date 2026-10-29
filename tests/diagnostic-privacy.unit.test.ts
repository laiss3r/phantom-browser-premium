import {it,expect} from 'vitest';
import {minimizeDiagnosticHistory} from '../src/main/diagnostic-privacy';
import {configSchema} from '../src/shared/schema';
import type {FingerprintObservation} from '../src/main/fingerprint-observation';
const makeResult=()=>({expected:configSchema.parse({geolocationPermission:'allow',geolocation:{latitude:12.345678,longitude:23.456789}}),observed:{geolocation:{status:'observed',coordinates:{latitude:12.345678,longitude:23.456789,accuracy:1}},canvas:{status:'measured-native',sha256:'controlled-canvas-identifier'},audio:{status:'measured-native',sha256:'controlled-audio-identifier'}} as FingerprintObservation,inconsistencies:['Controlled mismatch'],limitations:['Native browser; not a privacy certification']});
it('does not persist precise coordinates or stable sample hashes in new diagnostic history',()=>{
 const stored=minimizeDiagnosticHistory(makeResult());
 expect(stored.expected.geolocation).toBeUndefined();expect(stored.observed.geolocation.coordinates).toBeNull();expect(stored.observed.canvas.sha256).toBeNull();expect(stored.observed.audio.sha256).toBeNull();
 for(const secret of ['12.345678','23.456789','controlled-canvas-identifier','controlled-audio-identifier'])expect(JSON.stringify(stored)).not.toContain(secret);
});
it('leaves live observations and configured browser settings unchanged',()=>{
 const result=makeResult(),before=structuredClone(result);minimizeDiagnosticHistory(result);expect(result).toEqual(before);
});
it('preserves measured statuses, mismatches, warnings and explicit limits of redaction',()=>{
 const result=makeResult(),stored=minimizeDiagnosticHistory(result);expect(stored.observed.canvas.status).toBe('measured-native');expect(stored.observed.geolocation.status).toBe('observed');expect(stored.inconsistencies).toEqual(result.inconsistencies);expect(stored.limitations).toEqual(result.limitations);expect(stored.storagePrivacy.note).toContain('not proof of masking');
});
it('accepts absent configured coordinates and already-unavailable observations',()=>{
 const result=makeResult();delete result.expected.geolocation;result.observed.geolocation={status:'not-granted',coordinates:null};result.observed.canvas={status:'unavailable',sha256:null};result.observed.audio={status:'unavailable',sha256:null};const stored=minimizeDiagnosticHistory(result);expect(stored.observed).toEqual(result.observed);
});
it('the actual Service writes minimized history while returning the unchanged live measurement',async()=>{
 const {fixture}=await import('./helpers');const {vi}=await import('vitest');const observer=await import('../src/main/fingerprint-observation');
 const f=await fixture();try{
  const profile=f.service.create({name:'Controlled privacy diagnostic'}),expected=profile.config;
  f.service.running.set(profile.id,{launchId:'controlled-only',closing:false,electronPid:process.pid,browserMayExist:false});
  vi.spyOn(f.service,'page').mockReturnValue({} as import('playwright').Page);
  const observed={...makeResult().observed,userAgent:'Chrome/156.0.8078.4',language:expected.locale,languages:[expected.locale],timezone:expected.timezoneId,platform:process.platform==='win32'?'Win32':'Linux x86_64',viewport:expected.viewport,devicePixelRatio:1,colorScheme:expected.colorScheme,reducedMotion:false,clientHints:null,highEntropyClientHints:null,permissions:{geolocation:'denied',camera:'prompt',microphone:'prompt'}} as FingerprintObservation;
  vi.spyOn(observer,'observeFingerprint').mockResolvedValue(observed);
  const live=await f.service.diagnose(profile.id);expect(live.observed.canvas.sha256).toBe('controlled-canvas-identifier');
  const rows=f.db.rows('SELECT data FROM diagnostics');expect(rows).toHaveLength(1);const stored=JSON.parse(String(rows[0]!.data));expect(stored.observed.canvas.sha256).toBeNull();expect(stored.observed.audio.sha256).toBeNull();expect(stored.observed.geolocation.coordinates).toBeNull();expect(stored.storagePrivacy.scope).toBe('new-local-diagnostic-history-only');
 }finally{vi.restoreAllMocks();f.service.running.clear();await f.cleanup();}
});
