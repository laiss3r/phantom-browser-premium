import type {BrowserConfig} from '../shared/schema';
// Prevent obvious contradictions rather than attempting platform/client-hint spoofing.
// A native UA is safest; no values are randomized at launch.
export function fingerprintIssues(config:BrowserConfig, platform:NodeJS.Platform, runtimeVersion:string):string[] {
 const ua=config.userAgent;if(!ua)return [];
 const issues:string[]=[];
 const version=ua.match(/(?:HeadlessChrome|Chrome)\/(\d+)/)?.[1];
 if(!version || version!==runtimeVersion.split('.')[0])issues.push('Custom UA must identify the bundled Chromium major version');
 const uaVersions=[...ua.matchAll(/(?:HeadlessChrome|Chrome)\/(\d+\.\d+\.\d+\.\d+)/g)].map(match=>match[1]);
 if(new Set(uaVersions).size>1)issues.push('Custom UA contains conflicting browser versions');
 if((platform==='win32'&&!/Win64; x64/.test(ua))||(platform==='linux'&&!/x86_64/.test(ua)))issues.push('Custom UA must describe the bundled x64 desktop architecture');
 const fullVersion=ua.match(/(?:HeadlessChrome|Chrome)\/(\d+\.\d+\.\d+\.\d+)/)?.[1];
 if(!fullVersion||![runtimeVersion,runtimeVersion.split('.')[0]+'.0.0.0'].includes(fullVersion))issues.push('Custom UA full version must match the runtime or its standard reduced version');
 if(/(?:Edg|OPR|Firefox)\//.test(ua))issues.push('Other browser-family identities are unsupported by this Chromium runtime');
 if((platform==='linux'&&/Windows NT|Macintosh/.test(ua))||(platform==='win32'&&/Linux|Macintosh/.test(ua)))issues.push('Custom UA contains contradictory operating-system identities');
 if(/aarch64|ARM|arm64/i.test(ua))issues.push('ARM user agent is incompatible with the bundled x64 runtime');
 const expected=platform==='win32'?'Windows NT':platform==='linux'?'Linux':undefined;
 if(expected&&!ua.includes(expected))issues.push('Custom UA must match the native operating system; platform spoofing is unsupported');
 if(/Mobile|Android|iPhone|iPad/i.test(ua))issues.push('Mobile UA is incompatible with this desktop-only configuration');
 return issues;
}

export function observedFingerprintIssues(config:BrowserConfig, observed:import('./fingerprint-observation').FingerprintObservation, platform:NodeJS.Platform, runtimeVersion:string):string[] {
 const issues=fingerprintIssues(config,platform,runtimeVersion),expectedPlatform=platform==='win32'?'Windows':platform==='linux'?'Linux':null;
 if(config.userAgent&&config.userAgent!==observed.userAgent)issues.push('User agent mismatch');
 const major=runtimeVersion.split('.')[0];if(observed.userAgent.match(/(?:HeadlessChrome|Chrome)\/(\d+)/)?.[1]!==major)issues.push('Observed UA major differs from bundled runtime');
 const high=observed.highEntropyClientHints;
 if(high?.architecture&&high.architecture!=='x86')issues.push('High-entropy architecture differs from bundled x64 runtime');
 if(high?.bitness&&high.bitness!=='64')issues.push('High-entropy bitness differs from bundled x64 runtime');
 if(expectedPlatform&&high?.platform&&high.platform!==expectedPlatform)issues.push('High-entropy platform differs from native OS');
 if(high?.mobile)issues.push('High-entropy mobile identity contradicts desktop configuration');
 if(high?.wow64)issues.push('WOW64 identity contradicts the bundled x64 runtime');
 if(expectedPlatform&&observed.clientHints&&observed.clientHints.platform!==expectedPlatform)issues.push('Client-hints platform differs from native OS');
 if(observed.clientHints?.mobile)issues.push('Mobile client hints contradict desktop configuration');
 for(const brand of observed.highEntropyClientHints?.fullVersionList??[])if(/Chromium|Google Chrome|HeadlessChrome/.test(brand.brand)&&brand.version!==runtimeVersion)issues.push('High-entropy browser version differs from bundled runtime');
 if(expectedPlatform&&!(platform==='win32'?/Win/.test(observed.platform):/Linux/.test(observed.platform)))issues.push('navigator.platform differs from native OS');
 if(config.locale.toLowerCase()!==observed.language.toLowerCase()||observed.languages[0]?.toLowerCase()!==observed.language.toLowerCase())issues.push('Locale/languages differ');
 const canonical=(zone:string)=>{try{return new Intl.DateTimeFormat('en',{timeZone:zone}).resolvedOptions().timeZone;}catch{return zone;}};
 if(canonical(config.timezoneId)!==canonical(observed.timezone))issues.push('Timezone differs');
 if(config.viewport.width!==observed.viewport.width||config.viewport.height!==observed.viewport.height)issues.push('Viewport differs');
 if(config.screen&&(config.screen.width!==observed.screen.width||config.screen.height!==observed.screen.height))issues.push('Screen differs');
 if(Math.abs((config.deviceScaleFactor??1)-observed.devicePixelRatio)>0.01)issues.push('Device pixel ratio differs');
 if(config.colorScheme!=='no-preference'&&config.colorScheme!==observed.colorScheme)issues.push('Color scheme differs');
 if((config.reducedMotion==='reduce')!==observed.reducedMotion)issues.push('Reduced motion differs');
 if(config.geolocationPermission==='allow'&&observed.permissions.geolocation!=='granted')issues.push('Geolocation permission not granted');
 if(config.geolocationPermission!=='allow'&&observed.permissions.geolocation==='granted')issues.push('Geolocation granted without configured consent');
 if(config.geolocationPermission==='allow'&&config.geolocation&&observed.geolocation?.coordinates){
  const actual=observed.geolocation.coordinates;
  if(Math.abs(actual.latitude-config.geolocation.latitude)>0.000001||Math.abs(actual.longitude-config.geolocation.longitude)>0.000001)issues.push('Geolocation coordinates differ');
 }
 return [...new Set(issues)];
}
