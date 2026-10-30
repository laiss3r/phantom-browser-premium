import type {BrowserConfig} from '../shared/schema';
import type {FingerprintObservation} from './fingerprint-observation';

/** Minimize new local history records, without changing the browser or live result.
 * Browser profile settings are intentionally left alone. Existing history is not
 * rewritten: deleting previous diagnostic data requires a separate user decision.
 */
export function minimizeDiagnosticHistory<T extends {expected:BrowserConfig;observed:FingerprintObservation}>(result:T) {
 const stored=structuredClone(result);
 delete stored.expected.geolocation;
 stored.observed.geolocation.coordinates=null;
 stored.observed.canvas.sha256=null;
 stored.observed.audio.sha256=null;
 stored.observed.plugins={status:'omitted-from-history',pdfViewerEnabled:null,pluginCount:null,mimeTypeCount:null,identities:'omitted'};
 return {...stored,storagePrivacy:{
  scope:'new-local-diagnostic-history-only',
  omitted:['configured-geolocation-coordinates','observed-geolocation-coordinates','canvas-sample-hash','audio-sample-hash','pdf-viewer-and-plugin-observations'],
  note:'Values may be measured in the live diagnostic; omitted values are not proof of masking or unavailability. Other native diagnostic details can still identify a device.',
 }};
}
