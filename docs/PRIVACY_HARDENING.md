# Local diagnostic privacy hardening

## Scope

This work improves legitimate local privacy and diagnostic transparency. It does
not add identity spoofing, country/eligibility bypass, anti-fraud evasion, stealth
patches, randomized fingerprints or claims of GoLogin equivalence.

## Implemented

New diagnostic history records omit both configured and observed precise
geolocation coordinates and canvas/audio sample hashes. The live result still
shows what the browser actually measured; the configured profile and real browser
behavior are untouched. History includes explicit redaction metadata, measured
statuses, inconsistency warnings and limits. Omitting a stored value does not mean
it was blocked, unavailable or masked in the browser.

Existing diagnostic rows, cookies, sessions, proxy assignments, profile settings
and databases are not rewritten or deleted. Other diagnostic fields can still
identify a device. This is data minimization, not anonymization or encryption.
There are no new third-party endpoints, tracking calls or permissions.

## Verification

- Dedicated regressions check sensitive-value omission, non-mutation, unavailable
  measurements, and preservation of measured status and warnings.
- An actual Service/database test stubs the browser measurement explicitly,
  compares the live result with persisted history, and verifies redaction.
- These are controlled tests, not proof of browser masking or external leak safety.
- Exact final local test counts and packaging status are recorded in the handoff.

## Next legitimate work

- Expand observable support/partial/unsupported labels, not marketing parameter
  counts. Distinguish unmeasured from verified everywhere.
- Qualify existing profile isolation/permissions in actual Chromium and Windows.
- Review the pinned Chromium security-patch gap before production use.

No Windows installer or new anti-detect engine is delivered by this change.

## Local handoff (2026-10-29)

Strict TypeScript, ESLint, build and **179 unit tests across 20 files pass**,
including the five new privacy regressions. No new live Chromium, Electron or
installed-Windows qualification was run for this patch. Earlier dev.4 network
and installer evidence must not be treated as proof of this patch.

## Permission and isolation follow-up (2026-10-29)

**Existing policy, not a new permission mechanism:** Playwright launches every
profile with an explicit permission override. The default empty grant list denies
geolocation, camera and microphone; the only supported grant is configured
geolocation with both explicit consent and coordinates. This override also denies
other unlisted permissions. It is not a per-site prompt: geolocation consent is
profile-wide and applies to all eligible origins. To revoke, stop the profile,
uncheck consent, save, and relaunch. Camera and microphone have no grant control.
The UI now discloses these boundaries before the opt-in; no existing profile or
permission configuration is migrated or reset.

New headless Chromium tests on disposable Linux profiles exercised permission
queries, a geolocation request denied by default, an explicit grant on two
loopback origins, isolation, relaunch, and revocation after editing and relaunch.
Both media permission queries returned denied and audio/video requests did not
succeed; machines without matching devices can return `NotFoundError` before a
permission decision, so that request result alone does not prove hardware capture
would be blocked. Device-equipped and installed Windows coverage remain necessary.
A separate real-browser test checked distinct cookies, localStorage and IndexedDB
values for two profiles after shutdown, database reopen and service reconstruction.
It is not a test of a full operating-system restart.

Diagnostics now explain that support is a capability, not verification, and that
configured, applied/requested and observed are distinct; unavailable and untested
are not passes. Existing live collection and historical redaction are unchanged;
other collected hardware/graphics details can still identify a device. No new
claim of masking, anonymization or complete leak protection is made.

**Security-update gap:** On 2026-10-29 the official [Chrome for Testing channel
feed](https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions.json)
(timestamp 2026-10-29T12:22:14.500Z) listed stable 156.0.8078.73, whereas
this branch still pins 156.0.8078.4. This comparison alone does not identify
applicable CVEs. The pin was not silently changed; compatible Playwright,
archive provenance, reviewed hashes, profile migration and Windows qualification
are still needed under [RUNTIME_UPDATES.md](RUNTIME_UPDATES.md). Treat the gap as
a production release blocker, not a claim that updating alone is sufficient.

**Run status:** GitHub Actions run
[40948729147](https://github.com/laiss3r/phantom-browser-premium/actions/runs/40948729147)
at dfe19ad completed with Linux successful and Windows failed at the installed
application smoke step. The Windows browser/desktop tests and build step passed,
but checksum and setup artifact upload were skipped. Public API access did not
provide job logs or the uploaded diagnostic artifact; the cause is not established
and no CI failure was declared fixed. A fresh Windows installation run of this
follow-up is still required.

**Local Linux follow-up:** Node 24.22.0; runtime provision and verification
passed (303 files); typecheck, lint, build and 179 unit tests passed. Runtime suite:
12 passed. Real-browser suite: 37 passed, one existing Windows-only test skipped.
Electron suite under Xvfb: 8 passed, one Windows DPAPI test skipped; the amended
UI disclosure test also passed separately. The browser fixture deliberately uses
its existing headless test-only sandbox exception and the Electron test uses its
existing Linux test-only `--no-sandbox` argument; these are not Windows production
qualification. No installer was built or tested in this Linux environment.

## Experimental WebGL limit follow-up (2026-10-29)

An opt-in profile setting requests Chromium's `--disable-webgl` flag. It is
**partial**, not WebGL identity control or a masking engine. In a controlled
Linux/headless probe, HTML-canvas WebGL and WebGL2 were unavailable with the
flag, but OffscreenCanvas WebGL remained available. This difference demonstrates
why absence on one surface is not proof of blocking across all surfaces. The
flag may have different effects across platforms, Chromium versions, GPUs and
contexts, and may break graphics-heavy sites. Browser workers remain untested
in the diagnostic. Neither this option nor an absence of contexts guarantees
anti-fingerprinting, anonymity or GoLogin parity.

The setting is off for existing and new profiles unless explicitly chosen. It
is applied on next launch without editing profile directories, proxy assignment,
sessions or user data. Diagnostics distinguish the requested policy, whether
the launch argument was observed (or unavailable), and actual HTML and
OffscreenCanvas availability; worker coverage is explicitly marked not tested.
No GPU ID, canvas/audio samples or browser identity is fabricated. Profile
isolation, restart and strict validation are tested. Windows and hardware-GPU
qualification remain open. No native canvas/audio masking, controlled font set,
hardware/media identity controls, or maintained masking engine was added.

Fresh primary-source check on 2026-10-29: the
[Brave Browser release feed](https://github.com/brave/brave-browser/releases/tag/v1.98.62)
listed v1.98.62 (2026-10-28), and the
[Mullvad Browser release feed](https://github.com/mullvad/mullvad-browser/releases/tag/16.0)
listed v16.0 (2026-10-29). Release activity alone does not prove compatibility,
security, a maintenance commitment or redistributable artifacts. Neither engine
was integrated: executable provenance, Chromium/Playwright compatibility,
licenses, persistent-profile migration, proxy behavior, controls and Windows
qualification require separate review. Random fingerprint noise remains excluded
by the project's standing constraint. See [MASTER_ENGINE_DECISION.md](MASTER_ENGINE_DECISION.md).

Local follow-up verification: Node 24.22.0, TypeScript and ESLint passed;
180 unit tests in 20 files passed; the separate 12-test runtime suite passed;
production build passed with Vite's chunk-size warning; real Chromium suite
passed 38 with one Windows-only skip; Electron/Xvfb suite passed 8 with the
Windows DPAPI test skipped. After the full desktop run, the amended guided
setup test also passed separately, including opt-in persistence and encrypted
backup restore. No new Windows/installer/worker or physical-GPU qualification
was run. The prior GitHub Actions failure is not resolved by these Linux results.
