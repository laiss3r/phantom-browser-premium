# Fingerprint-control follow-up — 2026-10-30

## Scope and results

This follow-up does **not** deliver a GoLogin-equivalent browser-level masking
engine. The supported profile manager continues to use its pinned Playwright
Chromium runtime, isolated persistent directories and existing proxy routing.
No scripts are injected to patch browser APIs, no random fingerprint noise is
added, and no cross-OS/device identity or anti-fraud bypass is claimed.

The comparison below uses [GoLogin's description of advanced profile
settings](https://support.gologin.com/en/articles/14854407-advanced-profile-settings)
as a vendor statement, not as independent proof of how its implementation works.

| Surface | This follow-up | Remaining gap / validation needed |
|---|---|---|
| Canvas | Optional experimental native `--disable-reading-from-canvas` request; controlled Linux tests cover specific HTML/Offscreen 2D readbacks in page, cross-origin frame and dedicated worker | No complete masking. `WebGLRenderingContext.readPixels` and font measurements remained available locally; other paths and Windows/GPU behavior need qualification. |
| Audio | Existing offline-audio sample/status; native availability compared on controlled page | No audio identity or masking control. Test native rendering and worker/platform coverage for any future engine. |
| WebGL image and GPU identity | Existing opt-in experimental HTML-canvas limit and truthful OffscreenCanvas observation | No image or vendor/renderer control; worker and OffscreenCanvas paths are not comprehensively blocked. Real GPU and Windows coverage required. |
| Fonts | Existing generic-family metrics, with a controlled page measurement | No configurable font inventory/set. A browser-level implementation needs OS fallback, local fonts, downloadable fonts, CSS/canvas/worker consistency and licensing tests. |
| CPU/RAM | Native `hardwareConcurrency` and `deviceMemory` observations; page, cross-origin frame and dedicated-worker CPU availability exercised | No CPU/RAM identity controls. A page-only CDP override cannot be represented as profile-wide worker/frame coverage without an explicitly qualified architecture. |
| Media-device identity | Existing profile permission denial and observed kind counts; controlled page checks enumeration availability | No configurable reported device counts/labels/identities. Device-equipped and Windows tests remain open. Permission denial is not media identity masking. |
| Client rectangles | Explicit **Diagnostic only** capability label; controlled page and cross-origin frame exercise native `getBoundingClientRect` | No geometry masking or noise. A future engine must account for layout, transforms, frames and DOM APIs. |
| OS/platform | Existing native value and bounded native-compatible UA; page platform compared with diagnostic | No cross-OS identity controls. Platform, UA/CH, OS integrations and rendering consistency require browser-level qualification. |
| Browser plugins | Explicit **Diagnostic only** label | No per-profile plugin identity or plugin toggle was implemented; no unsupported Chromium flag is represented as a working control. |
| Do Not Track | Optional per-profile **DNT: 1 HTTP request header**. Existing profiles stay on native default. The native `navigator.doNotTrack` value is observed separately and is not altered. | Sites may ignore the request; it is not a fingerprint mask. Diagnostics don't observe outgoing headers. Service-worker/background/network-wide behavior and Windows remain unqualified. |

## DNT request and boundaries

Use advanced browser settings to select the request, then relaunch the profile.
The setting is strictly validated and uses Playwright's supported persistent
context `extraHTTPHeaders`, without changing proxy assignments or browser-data
files. Controlled Linux Chromium tests verify the first navigation and fetch
headers, isolation from another profile, persistence across restart, revocation,
and traffic through an assigned local HTTP proxy. The existing browser cookie
and localStorage survive revocation. An Electron test exercises UI configuration
and encrypted-backup restoration. These are controlled tests, not proof that
all browser requests carry the header or that any site honors it.

## Measured scope

The new surface test exercises top-level page canvas/context/font metric,
WebGL, offline audio and device enumeration availability, platform and hardware;
a cross-origin frame's canvas, layout and CPU value; and a dedicated worker's
CPU and OffscreenCanvas 2D/WebGL availability. It does not compare fingerprints
across all origins, assert that outputs are masked, test service/shared workers,
prove non-linkability, or use a third-party scoring service. The production
diagnostic still accurately labels worker WebGL as **not tested**. Tests use
only disposable profiles and local fixtures.

## Engine and security gates

The existing engine review remains in [MASTER_ENGINE_DECISION.md](MASTER_ENGINE_DECISION.md).
An actual masking implementation requires a separately qualified maintained
engine or an owned browser-level patch/build pipeline: audited source and binary
provenance, distribution rights, update ownership, native security fixes,
Windows and Linux packaging, backwards-safe profile/session migration, proxy
fail-closed behavior, worker/frame/native API coverage, media-device permissions,
and versioned cross-platform regression tests. Injecting page JavaScript or
setting a few CDP page options is not equivalent. The old runtime's security
update gap remains a release blocker under [RUNTIME_UPDATES.md](RUNTIME_UPDATES.md).

## Verification for this follow-up

Linux x64, Node 24.22.0: runtime provision/verification passed (303 files);
TypeScript, ESLint and production build passed (Vite emitted its existing
chunk-size warning); 181 unit tests across 20 files passed; the separate
12-test runtime suite passed; Chromium integration: 41 passed and one
Windows-only test skipped; Electron/Xvfb: 8 passed and one Windows DPAPI-only
test skipped. The browser and Electron fixtures use their documented Linux
test-only sandbox exceptions; these results are not installed-Windows proof.

At the time of this review, CI run
[40958481208](https://github.com/laiss3r/phantom-browser-premium/actions/runs/40958481208)
for base commit `b9b914d` had passed Linux and was still in its Windows
installed-application smoke step. This is not CI evidence for this follow-up.
The earlier run 40948729147 failed its Windows installed smoke step; its
root cause had not been established here. No new Windows installer was built
or tested for this follow-up.

## Page-script restriction and audio investigation — 2026-10-30

An opt-in `pageScripts: 'disabled'` profile setting requests Playwright's
persistent-context `javaScriptEnabled: false`. Existing and new profiles remain
on native behavior unless the user explicitly changes it and relaunches. This is
**a page-script restriction, not audio masking or a fingerprint identity**. It
can break sites, logins, media, accessibility and automation. Styles, images,
network requests and other non-JavaScript mechanisms may still expose data.

In a controlled pinned Linux Chromium test, inline website scripts did not run
in the top-level page or a cross-origin iframe. A separate unrestricted profile
still ran scripts. Importantly, an already-registered service worker continued
to intercept navigations after the setting was enabled; its stored registration
was not removed. Privileged Playwright evaluation also rendered a native offline
audio buffer despite page scripts being disabled. Do not infer that audio is
blocked, that all scripts or workers are stopped, or that a fingerprint is
masked. Shared workers, extension/background contexts, Windows, GPU-specific
paths and every frame/target lifecycle are not certified by these tests.

Fingerprint diagnostics are **not run** while this setting is enabled: the
normal diagnostic relies on page event callbacks/timers, which can stop running
and cause timeouts. The application returns an explicit error and stores no
result. Turn page scripts back on and relaunch to run diagnostics; those later
results describe that later configuration, not the restricted session.
Privileged automation can still execute code despite the restriction. Existing
cookies, localStorage and service-worker registrations are not deleted.

The tests exercise opt-in and revocation, profile isolation, persisted
cookie/localStorage, existing service workers, encrypted backup through the
manager UI, and an assigned proxy with a fail-closed proxy outage. They do not
prove protection against tracking.

Controlled pinned Linux/headless Chromium probes found that each of
`--blink-settings=webAudioEnabled=false`, `--disable-webaudio`,
`--disable-blink-features=WebAudio`, and `--mute-audio` left
`OfflineAudioContext` available and rendering the same oscillator samples as
native default. None was shipped as an audio control. Chromium DevTools'
experimental `CSS.setLocalFontsEnabled` concerns `local()` in `@font-face`, not
an installed-font inventory; it is target-scoped and not qualified for
profile-wide frame/worker consistency. See [Chrome's DevTools rendering
documentation](https://developer.chrome.com/docs/devtools/rendering/apply-effects).
No font, CPU/RAM, media-device, GPU identity, client-rectangle, platform or
plugin masking is added by this setting.

As of the official Chrome for Testing channel check on 2026-10-30, Stable was
`156.0.8078.80` versus the bundled `156.0.8078.4`. This is a version gap, not
an assertion of a particular CVE; the existing reviewed-update and Windows
installer gates remain open. Source:
[Chrome for Testing last-known-good versions](https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json).

Validation for this page-script change on Linux x64 / Node 24.22.0:
TypeScript, ESLint and production build passed; 185 unit tests passed
(including the 12 runtime tests), the separate runtime suite passed all 12,
and runtime integrity verified 303 pinned files. Chromium integration passed
44 tests with one Windows-only test skipped; Electron/Xvfb passed 8 with one
Windows DPAPI-only test skipped. The build retained the existing chunk-size
warning. These are not results from an installed Windows application.
