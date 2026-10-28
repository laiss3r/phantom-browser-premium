# Changelog

## 0.2.0-dev.3 — country/location correction

- Automatic country-selected provider connection without silent direct fallback.
- Persist requested country code/name and proxy assignment; truthful requested/verified country table with offline SVG flags, public IP, mismatch and Retry.
- Persist pending verification; recover interrupted checks; preserve meaningful IP-only connectivity states.
- Built-form, actual Chromium, actual Electron and installed-Windows table regressions. See [fix report](docs/COUNTRY_LOCATION_FIX_REPORT.md).

## Master-upgrade follow-up — unreleased development, not yet pushed

- Validate/canonicalize proxy hosts and legacy IPv6 formatting; meaningful client-side host errors.
- Strengthen desktop/x64/repeated-UA and high-entropy architecture/full-version/platform consistency checks.
- Bound/private diagnostic failures, reject stale stopped-profile observations, read already-granted coordinates without prompting.
- Explicit production proxy-probe sandbox; derived stopping state and guarded existing UI; clear Supported/Partial/Diagnostic only/Unsupported labels.
- Add HTTP407/no-direct-fallback, SOCKS hostname-resolution and real local STUN fixtures. The requested UDP policy does not block the measured loopback path; no external no-leak claim.
- Fresh Linux source tests:104 units,29 Chromium +Windows TLS skip,4 Electron +DPAPI skip. New Windows packaging/installed tests pending authenticated CI. Concrete engine/license review and pinned-vs-Stable patch gap recorded in [fresh report](docs/MASTER_UPGRADE_REPORT.md).


## 0.2.0-dev.2 — unreleased remediation candidate

- Reproduce/fix screenshot privacy exposure outside HTML root bounds; write only opaque same-size derivatives, with size/PNG regression checks and best-effort original-buffer clearing.
- Add explicit per-step run/profile IDs and required durations; regression-test sanitized failures for all six original actions.
- Tighten UA full-version/browser-family/OS/architecture guards; measure low/high-entropy hints, controlled canvas/audio hashes, native WebGL details, generic-font metrics, permissions/media-kind counts and local-only ICE with explicit unsupported labels.
- Validate UA/client-hint headers and same-environment relaunch stability, Cache Storage/service-worker isolation and real manager-death/live-Chromium lock retention.
- Reject malformed public-IP bodies and newer-major Chromium backups; preserve compatible JWE/gzip behavior.
- Reproduce/fix persistence-after-COMMIT memory divergence; restore old in-memory state after failed durable writes, clean exclusive partial files and retain previously durable data.
- Report incomplete shutdown/changed lock ownership; add actual installed Windows fingerprint and Electron-interruption tests and controlled HTTPS-proxy trust fixtures without production TLS bypass.
- Keep all original tests and source/runtime trust pins; CI remains read-only/artifact-only, with both platform jobs required for overall success. No tag/release/main merge authorized.
- Actual final results and remaining blockers: [remediation report](docs/REMEDIATION_REPORT.md).


## 0.2.0-dev.1 — published development prerelease

Published the exact installer from successful CI run 40507389557 at source e6089a8. Windows Server 2025: 73 unit / repeated runtime 12 / browser 20 / Electron+DPAPI 4 / installed corruption-repair 1 passed. Manual Windows 10/11 checks and signing remain pending. v0.1.1 stays latest stable; no main merge.

- Add non-destructive archive/unarchive, description and last session-activity metadata, bounded startup URLs/homepage and opt-in native tab/session restoration; legacy JSON fields load with additive defaults.
- Four-step profile wizard, typed browser preference controls, archive filter/recently-used sort, sequential bulk requests and encryption/restore dialogs. Version labels come from package.json.
- Add native DPR, explicit opt-in geolocation and Chromium non-proxied-UDP policy, honest observed diagnostics and prelaunch custom-UA/native-OS/version consistency guards. Unsupported hardware/canvas/audio/font/WebGL spoofing remains unsupported.
- Add local-only real-browser HTTP Basic/SOCKS5 and fail-closed proxy tests, measured probe latency and user-entered region labels.
- Add bounded delay/current-URL/exact-URL/title/selector-state automation steps and report run IDs/durations; preserve private result/criterion omission and masked screenshots.
- Add authenticated compact-JWE password backups using pinned jose/WebCrypto and bounded PBES2/AES-GCM algorithms; retain gzip compatibility and authenticate before extracting any files. No password recovery or plaintext password persistence.
- Reproduce/fix proxy-save race when a profile starts while DPAPI encryption is pending; reject writes after shutdown. Keep process-ownership, archive limits and strict IPC security intact.
- Actual local evidence and incomplete Windows/production gates: [implementation report](docs/V02_IMPLEMENTATION.md). Prerelease publication subsequently authorized; no main merge authorized.

## 0.1.1 — published

### Fixed
- Automation now emits ordered records for all six attempted actions with start/end timestamps, safe failure/cancellation outcomes, job timing and screenshot references. Unique files, directory recreation and explicit report-write failure messages replace timestamp collisions and false completion reporting.
- Reports omit raw page titles, URLs, selectors, fill values and exceptions. Screenshots mask page content to avoid saving passwords/cookies rendered by websites. IPC job-message shape remains compatible.
- Launch reservation covers asynchronous initialization; concurrent launches and launch/shutdown races are guarded. Close/cleanup is idempotent and bounded. Unknown browser exit retains locks rather than trusting an Electron PID or transport-disconnect alone.
- Malformed locks fail closed; recovery is gated and ownership-marked. Startup distinguishes unresolved browser history from completed launches.
- Retained HTTP proxy credentials cannot silently turn into authenticated SOCKS5 settings. Credential failures are redacted and fail closed.
- Windows development invocation no longer attempts to execute a Unix `.bin/electron` shim.
- License listing recognizes actual bundled browser notice files rather than falsely reporting an unprovisioned runtime.

### Hardened
- Checked-in archive SHA256 pins plus per-file identity/inventory verification; no ordinary manifest bootstrap/overwrite. ZIP inventory validation precedes extraction. No unverified ffmpeg/headless sibling runtimes are promoted.
- The shared strict runtime verifier runs before browser launches and packaging. A Windows packaging preflight rejects Linux/macOS runtime bundles.
- Backup per-file/count/total/archive/expansion limits, bounded file reads, canonical base64, Unicode/case duplicate and parent-file collision rejection, symlink/path defenses, unique temporary files and cleanup of partially restored profiles.
- Explicitly denied renderer permission checks and webviews without relaxing CSP, IPC authorization or Node isolation.
- Additional unit, real-browser, desktop-security and installed-runtime-tamper regressions. Installer resources are narrowed to the required Chromium revision, with source maps/dev dependencies excluded from packaged app files.
- Build CI remains SHA-pinned and read-only; automatic GitHub Release publication was removed. Build artifacts are not release authorization.

### Limitations
- Backups remain unencrypted. There is no unsafe PID-kill/force-unlock fallback. Some orphan/malformed-lock cases require manual review.
- Screenshots are privacy-masked rather than full-content exports. Stored page-title content is intentionally omitted from reports.
- No stealth, anti-detection, DNS/WebRTC leak-prevention or universal fingerprint-consistency guarantee.
- Windows 10/11 compatibility must be confirmed against the recorded Windows CI and manual installation results. No digital-signature claim is made.

## 0.1.0

Initial published Windows x64 installer with bundled Chromium. See the existing GitHub release for its historical artifacts; v0.1.1 work does not overwrite them.
