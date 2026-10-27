import {it,expect} from 'vitest';
import {fingerprintIssues,observedFingerprintIssues} from '../src/main/fingerprint';
import {configSchema} from '../src/shared/schema';
it('accepts native settings and rejects UA/OS/version contradictions rather than injecting stealth patches',()=>{
 expect(fingerprintIssues(configSchema.parse({}),'win32','156.0.8078.4')).toEqual([]);
 const ua='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
 expect(fingerprintIssues(configSchema.parse({userAgent:ua}),'win32','156.0.8078.4')).toEqual([]);
 expect(fingerprintIssues(configSchema.parse({userAgent:ua}),'linux','156.0.8078.4')).toContain('Custom UA must match the native operating system; platform spoofing is unsupported');
 expect(fingerprintIssues(configSchema.parse({userAgent:ua.replace('Chrome/156','Chrome/120')}),'win32','156.0.8078.4').length).toBeGreaterThan(0);
 for(const key of ['hardwareConcurrency','deviceMemory','webglVendor','canvasNoise','platform'])expect(configSchema.safeParse({[key]:'fake'}).success).toBe(false);
});
it('rejects contradictory full versions and multiple browser/OS claims before applying settings',()=>{
 const base='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
 for(const ua of [base.replace('156.0.0.0','156.99.0.1'),base+' Edg/120.0.0.0',base+' Windows NT 10.0',base.replace('x86_64','aarch64')])expect(fingerprintIssues(configSchema.parse({userAgent:ua}),'linux','156.0.8078.4').length).toBeGreaterThan(0);
 expect(fingerprintIssues(configSchema.parse({userAgent:base.replace('156.0.0.0','156.0.8078.4')}),'linux','156.0.8078.4')).toEqual([]);
});
it('rejects conflicting repeated browser versions and unsupported 32-bit desktop UA claims',()=>{
 const base='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
 for(const ua of [base+' Chrome/120.0.0.0',base.replace('x86_64','i686')])expect(fingerprintIssues(configSchema.parse({userAgent:ua}),'linux','156.0.8078.4').length).toBeGreaterThan(0);
});
it('detects simulated high-entropy and geolocation contradictions (validator unit data, not browser proof)',()=>{
 const config=configSchema.parse({geolocationPermission:'allow',geolocation:{latitude:0,longitude:0}});
 const observed={userAgent:'Chrome/156.0.8078.4',platform:'Linux x86_64',language:'en-US',languages:['en-US'],timezone:'UTC',viewport:config.viewport,devicePixelRatio:1,colorScheme:'dark',reducedMotion:false,clientHints:{platform:'Linux',mobile:false,brands:[]},highEntropyClientHints:{architecture:'arm',bitness:'32',platform:'Windows',mobile:true,wow64:true,fullVersionList:[{brand:'Chromium',version:'156.99.0.1'}]},permissions:{geolocation:'granted'},geolocation:{status:'observed',coordinates:{latitude:1,longitude:2,accuracy:1}}} as unknown as Parameters<typeof observedFingerprintIssues>[1];
 const issues=observedFingerprintIssues(config,observed,'linux','156.0.8078.4');for(const fragment of ['architecture','bitness','platform','mobile','WOW64','version','coordinates'])expect(issues.some(issue=>issue.toLowerCase().includes(fragment.toLowerCase())),fragment).toBe(true);
});
