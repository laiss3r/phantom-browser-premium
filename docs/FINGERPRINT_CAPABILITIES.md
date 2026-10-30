> **Master-stage update:** Fresh validation now checks high-entropy full version/architecture/bitness/platform/mobile/WOW64 and repeated/32-bit custom-UA contradictions. Already-granted geo coordinates are bounded/read/compared; never prompted by diagnostics. Native-only rows display **Diagnostic only**. Fresh Linux evidence is in MASTER_LOCAL_FINGERPRINT_OBSERVATIONS.json; new Windows validation remains pending.

# Fingerprint architecture and capability boundaries

Phantom's Electron window is the **manager UI**, not the browsing engine. Profiles run in separately launched, independently pinned Playwright Chromium persistent contexts. Do not equate Electron window preferences with native antidetect functionality.

## Architecture decision

1. **Chosen:** supported context configuration and actual native measurements on the reviewed Playwright Chromium build. The pinned Playwright implementation passes `userAgentMetadata` through Chromium's Emulation domain; browser header/JavaScript measurements, not that implementation detail, establish tested consistency.
2. **Alternative Chromium implementation:** a third-party fork would need audited Windows binaries, usable per-profile APIs, compatible Playwright/CDP semantics, license/distribution rights, prompt upstream security updates and reproducible trust pins. No alternative has been qualified or integrated for arbitrary hardware/graphics/font identity manipulation. This is a genuine unimplemented engine requirement, not a UI task. A general Chromium privacy fork is not evidence of GoLogin-compatible per-profile control.
3. **Custom Chromium:** not implemented. It would require a dedicated reproducible build farm/toolchain, security patch/rebase capacity, testing across workers/frames/headers/native APIs, third-party notices and applicable source obligations, signing and substantial binary hosting/distribution. Get explicit architecture/maintenance authorization before starting such a fork; do not freeze browser security updates to keep a fingerprint patch working.

The official [Playwright BrowserType documentation](https://playwright.dev/docs/api/class-browsertype) warns that arbitrary executable replacement has no compatibility guarantee. The [CDP Emulation reference](https://chromedevtools.github.io/devtools-protocol/1-3/Emulation/) separately documents UA metadata; a UA string alone is not proof of coherent hints.

## Actual support

| Property | Support | What is measured / not promised |
|---|---|---|
| UA and hints | Partial, validated desktop Chromium scope | UA must identify native OS/x64 and bundled major; full version must be exact runtime or standard reduced version. Contradictory OS/browser-family/mobile/ARM claims rejected. Headers and low/high-entropy hints checked on a secure controlled origin. No general cross-OS emulation or arbitrary brand identity. Custom UA uses supported Playwright-derived hints; exact host-build platformVersion fidelity is not certified. |
| Locale/languages/timezone | Supported context configuration | Browser values and header language checked; canonical timezone aliases compared. OS UI language or every worker/third-party frame is not independently certified. |
| Viewport/screen/DPR | Supported context configuration | Browser-side dimensions/DPR checked and stable across relaunch. This is emulation, not a different physical monitor. |
| Geolocation | Explicit opt-in | Coordinates and allow permission required; denied without configured consent. Native page permission states observed; real geographic/IP matching not automatic. |
| CPU/memory/platform | Native only | Actual `hardwareConcurrency`, available `deviceMemory`, `navigator.platform` and UA-hints platform observed. No arbitrary per-profile native hardware/OS overrides. |
| WebGL | Partial experimental HTML-canvas limit | Optional `--disable-webgl` request; observed HTML canvas and OffscreenCanvas availability are reported independently. OffscreenCanvas and workers may still expose WebGL. The diagnostic does not test workers. The limit can break graphics and is not GPU identity control or comprehensive WebGL blocking. Native vendor/renderer is measured when available. |
| Canvas | Partial experimental readback restriction | Optional `--disable-reading-from-canvas` request, off by default. Controlled Linux tests exercise 2D readback in pages, a cross-origin frame, OffscreenCanvas and a worker. WebGL `readPixels` and font metrics can still work. This may break sites and is not complete masking. |
| Audio | Native only | SHA256 of a controlled offline-audio sample when diagnostics run. No audio masking or noise injection. Updates/drivers can change outputs. Disabling page scripts does not stop an existing service worker from accessing native APIs. |
| Page scripts | Partial, opt-in | Requests that website JavaScript not execute in pages. Existing service workers and privileged automation may still execute code; other fingerprinting surfaces remain. Can break sites; diagnostics are not run while enabled. Not audio masking. |
| Client rectangles | Native only | Native DOM layout; no masking or geometry noise. |
| Do Not Track | Partial | Optional `DNT: 1` request header; native `navigator.doNotTrack` is observed separately. Sites may ignore it; not a privacy guarantee or fingerprint mask. |
| Plugins | Partial native PDF setting | For a running profile, open Chromium PDF settings and choose whether PDFs open inline. Controlled Chromium tests show this changes the native PDF plugin/MIME counts and `pdfViewerEnabled`. No arbitrary plugin names, identities or general plugin toggle. PDF downloads are not accepted by the manager. |
| Fonts | Partial diagnostic | Generic serif/sans-serif/monospace metrics; not installed-font enumeration. Do not mistake `document.fonts.check` or metrics for a complete font inventory. No spoofed font set. |
| WebRTC | Partial | Optional Chromium non-proxied-UDP launch policy; argument observed through verified OS ownership scan. Local ICE type/protocol summary uses no STUN/TURN and stores no candidate addresses. Not public-IP leak certification. |
| Media/permissions | Native only | Camera/microphone/geolocation permission states and device-kind counts; no media acquisition, device labels or IDs. No media identity rewriting. |
| APIs/automation | Native only | Available native APIs and `navigator.webdriver` observed. No attempt to claim webdriver false, undetectability or complete website-fingerprint equivalence. |
| DNS leaks | Not externally tested | Requires an opt-in controlled authoritative DNS service and observation methodology. An ipify response or local ICE collection cannot prove DNS privacy. |

## Diagnostics and privacy

Run **Fingerprint Diagnostics** against a running profile whose first open tab is on an origin you control; this may not be the focused tab. Diagnostics are not run while page scripts are disabled; an explicit error is returned and no diagnostic is saved. Secure-context features may be unavailable or permission-policy-limited on other pages. Null/blocked/unavailable values are **not** successful verifications. No mismatches among observed fields is not a universal consistency/anonymity certificate.

Diagnostics do not call a third-party fingerprint service. They create detached controlled canvas/audio samples, enumerate device **kinds/counts only**, measure generic-font metrics and gather local ICE without external STUN/TURN. Live observations include PDF viewer status and plugin/MIME counts, but not plugin names. New stored history omits those values, sample hashes and precise geolocation coordinates; old history is not rewritten. Hardware/graphics details and stable hashes are themselves fingerprint identifiers; protect the local app-data/diagnostic database. Public CI artifacts contain only explicit synthetic-profile observations from disposable CI machines, never user profiles.

Automated coverage includes native samples/headers/relaunch, capability boundaries and the **actual installed Windows EXE plus bundled browser**, with a machine-readable controlled diagnostic artifact. See the current remediation report for actual run status; configuring a test is not evidence that it passed.

See [fingerprint-control follow-up](FINGERPRINT_CONTROL_REVIEW.md) for the current gap matrix and test scope.
