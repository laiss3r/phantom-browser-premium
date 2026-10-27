> **Master-stage update:** Historical remediation/green-CI record. The subsequent MASTER_UPGRADE_REPORT.md has new code and local verification, but fresh Windows CI is pending. Do not apply this old installer/CI proof to newer source.

# Remediation and capability report — 0.2.0-dev.2 candidate

Date: 2026-10-27. Branch: `feat/local-workspaces-v0.2`. **Unreleased; no new tag, release or main merge authorized.** Actual starting point was v0.2.0-dev.1, not the historical v0.1.0. Stable v0.1.1 and all previous release assets are preserved.

## 1. Executive assessment

This remains a free, local-first Windows profile manager with the existing Electron/React/sql.js/Playwright architecture. It is **not a GoLogin-equivalent native antidetect engine**. The audit found and reproduced a real screenshot privacy exposure and a failed-durable-write consistency bug, then fixed them with regressions. It also strengthened fingerprint observations/guards, step attribution, archive compatibility and process recovery instead of adding decorative unsupported settings.

A published dev.1 screenshot could expose fixed-position content outside its masked HTML root. Treat existing report PNGs as sensitive; development fixes do not retroactively repair them. New screenshot actions write only an explicitly opaque derivative, never readable page pixels. No private profile/report data was removed or committed.

**Final hosted CI: both Linux and Windows passed** in [run 40565021705](https://github.com/emmanuellaisa00/phantom-browser/actions/runs/40565021705), exact code source `02d0a4bc6b326d663a0ae5220fc49eaa85d793b2`. [Machine-readable verification](REMEDIATION_VERIFICATION.json) records actual jobs, tests and independently checked installer bytes. Earlier failed runs remain failed and are described below. A documentation-only follow-up does not change tested production code.

## 2. Exact reproduced findings and changes

| Finding / source | Reproduction | Remediation / regression |
|---|---|---|
| `automation.ts::runAutomation` DOM-root screenshot mask misses fixed-position elements outside root bounds | Actual Chromium: secret red pixel `[255,0,0,255]` survived old mask | `private-screenshot.ts::privateScreenshot`: bounded opaque PNG derivative created in main process; actual decoded region becomes `[17,19,24,255]`. Source buffer is memory-only and cleared best-effort; no source pixels copied. CRC/dimension/overflow/invalid-input tests. |
| `Database.transaction/persist`: SQL committed, disk save failed, changed memory later saved | Failed create/edit regressions initially failed; dangling metadata could outlive removed create directory | Snapshot before transaction, restore memory after failed durability; retain foreign keys; exclusive unique partial files and cleanup. Atomic-rename failure asserts unchanged original disk bytes/no partials. |
| `Service.shutdown/release`: rejected closes discarded, replaced owner's lock could look idle | Two lifecycle regressions initially failed | Redacted incomplete-shutdown summary; recovery error on changed/unreleasable lock; keep conservative locks and idempotent shutdown. No arbitrary PID termination. |
| `scanProcesses`: denied individual same-user reads treated like absent processes | New permission-denied regression returned `[]` rather than unknown | Linux same-UID process inspection fails conservatively on denied reads, tolerates actual ENOENT/ESRCH races. Windows parser retains unknown/incomplete Chromium rows. Verified OS scans, UUID+directory+executable identity remain required. |
| Step IDs/duration incomplete in type/output | Regression required run/profile IDs on each step | Explicit step attribution and required duration; sanitized failure tests for six original actions, cancellation/write-failure/unique screenshots retained. |
| `fingerprintIssues`: contradictory family/OS/architecture/full-version UA claims | Guard regressions accept native/reduced UA, reject conflicting desktop/mobile/ARM/browser tokens | Native supported desktop scope, no randomization/prototype patches; real consistency validator and shared UI capability matrix. |
| `Service.diagnose`: mainly booleans and low-entropy fields | Earlier diagnostics did not measure behavior/higher hints | Real controlled canvas/audio SHA256, low/high-entropy hints, masked/unmasked WebGL, generic-font metrics, permission/media-kind counts, local ICE summaries/API availability. No device IDs/candidate addresses persisted. |
| `proxyTest` accepted non-IP `deadbeef` | Public-IP test regression | Node `net.isIP`, bounded/redacted explicit probe; no change to fail-closed routing. |
| `restore` compatibility not enforced | Newer-major archive regression | Reject declared newer Chromium major before destination creation; unknown/older formats still not universal compatibility proof. |
| Cache/SW/orphan/packaged diagnostic coverage absent | Real additional browser and installed fixtures | Cache Storage/service-worker simultaneous isolation and restart; actual detached-browser survival after manager death; installed EXE native diagnostics and actual Electron interruption. |

Full initial audit and architecture evaluation: [REMEDIATION_AUDIT.md](REMEDIATION_AUDIT.md). Fingerprint implementation: `src/main/fingerprint.ts`, `fingerprint-observation.ts`, `src/shared/fingerprint-capabilities.ts`, `Service.diagnose`; renderer displays the same capability matrix.

## 3. Audit matrix across the 12 work areas

States: **T** implemented and tested in stated environment; **I** implemented but incompletely tested; **P** partial; **M** missing; **A** unavailable in current supported architecture, requiring separate engine qualification/build.

| Area | State | Evidence / boundary |
|---|---|---|
| Whole-repository audit | T | Main/preload/IPC/service/SQL/renderer/schemas/provisioning/runtime archive/manifests/build/package/workflows/dependencies and every test module reviewed; exact gaps above and audit file. Not an external penetration-test certificate. |
| Persistent profile settings and browser identity | T/P | Versioned native-UA/viewport/screen/DPR/locale/timezone/color/motion/geo preferences persisted and observed; native measurements expanded. General hardware/graphics/font identity control A; public DNS/STUN M. |
| Proxy modes, secrets and routing | T/P | HTTP Basic, unauthenticated SOCKS5, simultaneous per-profile routing, bounded IP validation and no direct fallback. Windows DPAPI/no plaintext; HTTPS positive/negative transport tests. Authenticated SOCKS5 M/disabled; provider-wide compatibility I. |
| Browser-state isolation | T/I | Actual independent cookies/localStorage/IDB/CacheStorage/SW, simultaneous contexts, persisted restart and native session restoration. New-UUID restores/duplicate/path bounds. Exhaustive browser preference/extension states, crash-time cookie flushing, OS account portability and large-scale load I. |
| Lifecycle and ownership | T/I | UUID ownership, Electron vs Chromium identities, single-profile lock, PID reuse/unknown exit, replaced owner, concurrent/interrupted startup, bounded/idempotent close, genuine live orphan. Installed interruption gate status is stated separately. Full power-loss and all OS-account permission cases I. |
| Automation/report attribution | T | Native allowed actions retained: navigate/title/wait/click/fill/screenshot/read URL/delay/selector/URL/title conditions. Each step has run/profile IDs, number/action/times/status/sanitized error/duration/screenshot path; unique safe files/failure/cancellation/write errors covered. Screenshots intentionally opaque, not readable screenshots. |
| Runtime/update supply chain | T/I | Independently committed archive/file pins, HTTPS, bounded strict extraction/inventory/path/link rejection, fail-closed startup, immutable Actions, reviewed rollback procedure retained. Upstream independently signed/reproducible provenance and resistance to replacement by the same local account I/M; no claim of publisher-signed binary. |
| Backup/archive compatibility | T/I | Maintained jose compact JWE; authentication before decompression; legacy gzip clearly plaintext; counts/sizes/hashes/types/paths/duplicates/links/collisions, fresh UUID/no overwrite, partial cleanup, credentials excluded. Newer-major rejection; cross-device DPAPI cookies and all old browser migrations I. |
| Existing React desktop UI | T/P | Eight pages retained, wizard/manual management/search/tags/archive/bulk actions/runtime/proxy/report/backup views, guarded async state and explicit diagnostic capability labels. Unsupported controls are not presented as completed spoofing; no cloud/account/subscription. Consumer usability/assistive-tech review I. |
| Security/dependencies | T/I | Sandboxed isolated manager renderer, no Node integration, exact authorized top-frame IPC/strict schemas/SQL binding, CSP/navigation/webview/permission denial, DPAPI, no shell execution/telemetry, runtime pins and dependency audit. No independent security assessment or signing I. |
| Browser and Windows validation | T/I | Real local browser/desktop plus hosted source/package/install/native observations. Actual results below; manual consumer Win10/11/UAC/SmartScreen/hardware/upgrade/uninstall I. |
| Docs/candidate/publication | T/P | New capability/proxy/backup/troubleshooting/audit/release/verification docs and changed-file list. Candidate only; no new publication authorized. |

## 4. Architecture decision and real fingerprint evidence

Stay on independently pinned supported Playwright Chromium. Neither a new text field nor an `initScript` creates native hardware identity. No qualified alternate fork is integrated. A custom Chromium patch set needs a reproducible Windows build farm, auditable licensing/distribution, security update/rebase ownership, API/worker/header/native consistency tests, signing and storage. These are actual missing dependencies/maintenance commitments, not silently claimed features. See [fingerprint capability guide](FINGERPRINT_CAPABILITIES.md).

The actual **installed Windows EXE** diagnosed its **bundled profile browser** on a synthetic loopback secure context and compared a real second browser launch. The controlled artifact is [REMEDIATION_INSTALLED_OBSERVATIONS.json](REMEDIATION_INSTALLED_OBSERVATIONS.json), with originating commit/run. Evidence from a passing individual test does not make an otherwise failed run successful.

Observed in the actual installed browser, final Windows CI run 40565021705 (both OS jobs passed):

- UA `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36`; actual request UA and `sec-ch-ua-platform` assertions passed.
- Low hints Chromium/156, Windows, mobile false; high hints Chromium `156.0.8078.4`, architecture `x86`, bitness `64`, platform `Windows`, platformVersion `10.0`, wow64 false. This is observed supported metadata, not a claim of native OS-build identity substitution.
- `en-GB`, languages `[en-GB]`, `Africa/Nairobi`; viewport 1000×700, screen 1400×900, DPR 1.25; geo permission granted with opt-in configured coordinates, camera/microphone denied.
- Native platform `Win32`, 4 logical processors, deviceMemory 16. No arbitrary CPU/memory spoofing.
- Native WebGL `WebKit` / `WebKit WebGL`; unmasked `Google Inc. (Google)` / `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`. This CI software renderer is not evidence about a consumer GPU.
- Canvas SHA256 `73f0196d44bda23050d3544476768572f0b4eda9589a2097ac17817d5d8d5a8b`; audio SHA256 `b71e648ca8437bd608b31584cd8ab90852c646248aa948e969c719ff570566e6`. Both and high-entropy hints equal after stop/relaunch in that test; no hashes are injected into pages.
- Generic metrics serif 246.2265625 / sans-serif 258.6953125 / monospace 237.515625; **not** an installed-font enumeration. Media kinds empty, labels 0, identities omitted; API availability measured, no microphone/camera access.
- **WebRTC still observed a local `host`/`udp` candidate even with the requested non-proxied-UDP argument present.** Addresses were omitted. This is explicit evidence against treating the launch flag as a no-leak certificate. No external STUN/TURN or authoritative DNS test was performed.
- `navigator.webdriver === true` observed and retained. No undetectability claim, webdriver concealment, per-launch identity randomness, or security-disabled stealth.

An empty mismatch list means no detected contradiction among the observed configured values; unavailable/blocked values and native-only controls remain incomplete, not verified spoofing.

## 5. Profile, proxy and backup behavior

Persistent contexts use different UUID data directories and profile locks. Tests include same-origin simultaneous storage/SW/cache isolation, browser close/relaunch persistence and explicit tab/session restoration. JSON profile values do not replace native browser SQLite state. Native crash-time writes, arbitrary extensions, all preferences and every OS/provider combination are not certified.

HTTP/HTTPS use supported Chromium proxy transport and optional Basic authentication; SOCKS5 authentication is rejected rather than silently discarded or relayed insecurely. DPAPI secrets never go to renderer snapshots/backups. HTTPS rejects untrusted certificates; a trusted disposable-CA Basic test passed on Windows run 40562097219. The fixture alone temporarily updates the ephemeral elevated CI machine Root store through .NET and removes the exact CA; production does not alter trust stores or ignore TLS. HTTP Basic on a plaintext HTTP proxy remains plaintext on that transport.

Public-IP probes require explicit user action, fixed production endpoint, actual IP parsing and bounded timeout. Latency is total probe duration. Region is manually entered. Public DNS/WebRTC protection and every provider's auth scheme are not certified. See [proxy guide](PROXY_LIMITATIONS.md).

Compact JWE uses pinned jose 6.2.13/WebCrypto, PBES2-HS512+A256KW (310,000 iterations) plus A256GCM; password 12–1024 characters, never saved, no recovery. Gzip is not encryption. Restore authenticates/validates before creating a fresh UUID, enforces bounds and rejects newer engine majors. Proxy assignments/credentials excluded; Windows native cookies can remain machine/account-bound. JS string erasure is not guaranteed. See [backup guide](BACKUP_RESTORE.md).

## 6. Test commands and actual results

Latest full local production changes through process-inspection fix:

| Command | Actual result |
|---|---|
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | **94 passed, 12 files** |
| `npm run test:runtime` | 12 passed; strict runtime unit tests retained |
| `npm run verify:runtime` | Passed: 303 Linux runtime files, Chromium 156.0.8078.4 |
| `npm run test:integration` | **26 passed; 1 Windows-only trusted-TLS test skipped on Linux** |
| `npm run build` | Passed |
| `xvfb-run -a npm run test:desktop` | **3 passed; 1 Windows-only DPAPI test skipped on Linux** |
| `npm audit --omit=dev --json` / `npm audit --json` | Passed: zero vulnerabilities in both full and production dependency audit |
| `npm run licenses` | Generated dependency license inventory; no claim of legal review |

No original test was removed, skipped to hide a failure, or weakened. New Linux `/proc` regressions are necessarily OS-specific; the platform-independent Windows parser regression runs on both OSes. Chromium sandbox is enabled in production headed browsers. The Linux root-container desktop test's `--no-sandbox` applies only to that test's Electron shell, not a production stealth setting.

Windows run 40561257686: Linux passed; Windows 26 browser tests passed but the new trusted-CA import timed out during CurrentUser Root import (interactive trust UI suspected, not manually observed). Fixed the **test fixture**, not TLS validation. Windows run 40562097219: all 89 then-current units, 27 browser tests and 4 desktop tests passed; installed smoke and native fingerprint tests passed, interruption test failed on launcher PID vs actual manager PID assumption. Linux dependency install separately timed out on the Azure mirror. Both failed runs remain failed. The corrected fixture verifies actual attached Electron manager PID/executable/user-data root and OS identity before killing; package network setup uses the official HTTPS Ubuntu archive with signed metadata and bounded retries/timeouts. No checks are bypassed. Run 40563672125 then passed the **entire Windows job**, including all three installed-app tests; its stricter Linux scanner conservatively blocked on an unrelated non-dumpable runner process. A follow-up distinguishes known non-Chromium names/argv from unknown/Chromium identities and adds explicit denied-exe regressions without treating denied Chromium inspection as exit proof. Local full browser/desktop checks pass again; both-platform final gate 40565021705 now passes.

### Final hosted results — run 40565021705

| Gate | Windows Server 2025 x64 | Ubuntu 24.04 x64 |
|---|---|---|
| Overall job | **Passed** | **Passed** |
| Unit tests | **90 passed, 4 Linux-only /proc tests skipped**, 12 files | **94 passed**, 12 files |
| Separate runtime-unit command | 12 passed | 12 passed |
| Strict runtime inventory | 307 files passed | 303 files passed |
| Real browser integration | **27 passed**, including trusted HTTPS Basic | **26 passed, 1 Windows-only TLS skip** |
| Real Electron desktop/IPC | **4 passed**, including Windows DPAPI | **3 passed, 1 Windows-only DPAPI skip** |
| Actual installed NSIS EXE | **3 passed**: offline/tamper/repair; native fingerprint relaunch; verified Electron-main termination and persisted metadata/ownership recovery | Not a Linux installer target |
| Typecheck/lint/build | Passed | Passed |

Actual candidate installer: `Phantom-Browser-Setup-0.2.0-dev.2-x64.exe`, **297,344,549 bytes**, SHA256:

```text
1cf8ac18c68abdaf8dd6cfd906159a384acf8777d560d86883d4c0a442853670
```

The downloaded artifact ZIP matched GitHub's API digest; the contained EXE was independently streamed/hashed and matched the workflow checksum. Checksum text is committed alongside verification JSON. Download the **Phantom-Browser-Windows-Setup** artifact from the linked Actions run (not a new release); artifact expiry is recorded in verification JSON. An initial local reviewer expected the name without its `-x64` suffix and rejected it; after checking the actual ZIP member, the exact x64 filename/PE header/size/hash were verified. No application test was altered for this tooling correction.


## 7. Windows packaging and remaining manual checklist

The workflow builds NSIS with `--publish never`, installs the actual setup executable and drives the installed app/browser. Runtime alteration is rejected and repaired in a real installed smoke test; installed fingerprint capture is not a helper-only or mocked diagnostic. Interruption test kills a path/root/OS-verified actual manager, not an arbitrary PID. Old-browser cleanup occurs only after launch UUID + exact profile directory + bundled executable identity matches.

This is hosted **Windows Server 2025 x64 automation**, not manual consumer certification. The installer is **unsigned** unless an independently verified signing result is recorded; no such result exists. Manual Windows 10/11 install/upgrade/uninstall/data preservation, UAC/SmartScreen interaction, antivirus/provider quirks, physical GPU/audio/display/hardware behavior and consumer power-loss recovery remain unchecked. Follow [WINDOWS_INSTALL.md](WINDOWS_INSTALL.md); use a private pre-upgrade data copy and never downgrade the only copy.

## 8. GoLogin-oriented comparison (Phantom capability, not parity certification)

GoLogin is a separate commercial product with different engine/cloud/management capabilities. This table describes this repository's boundaries rather than asserting that marketing labels or numbers establish security equivalence.

| Workflow/capability | Phantom status | Important limit |
|---|---|---|
| Local profile CRUD, metadata/tags/search/archive, manual/concurrent sessions | Complete within tested scope | No unlimited-load or every-cookie-state claim |
| Local cookies/site storage/session restoration | Complete within tested scope | Native crash/OS encryption/portability caveats |
| Per-profile proxy assignment and test | Partial | HTTP/HTTPS Basic, unauthenticated SOCKS5; no authenticated SOCKS5/provider-wide/DNS certificate |
| Stable supported locale/timezone/screen/DPR/geo/UA settings | Partial | Desktop native-OS Chromium scope, not arbitrary native identity |
| Real native fingerprint observations/consistency report | Complete within diagnostic scope | Null/blocked/native-only fields and limited fonts/ICE explicit |
| Independent per-profile native CPU/memory/OS/WebGL/canvas/audio/font/media spoofing | Unavailable | Requires qualified engine APIs/fork/custom maintained build |
| Undetectability, guaranteed no leaks, bypassing service policies | Unavailable / not promised | Automation signal observable; public DNS/STUN not certified |
| Local bounded automation and private step reports | Complete within supported actions | No arbitrary script/shell/code editor; screenshots opaque |
| Local authenticated encrypted backups | Complete within validated archive scope | No password recovery or universal native-cookie portability |
| Cloud sync, hosted remote browser, shared team/RBAC/billing/proxy marketplace | Unavailable by local-only design | No mandatory account/subscription/telemetry; no cloud substitute implemented |
| Broad consumer-Windows hardware/installer/signing assurance | Partial | Hosted automation only; unsigned/manual checklist remains |

## 9. Residual risks / genuine blockers

- Arbitrary native fingerprint identity controls need separately qualified and maintained engine support; unsupported fields remain unsupported.
- Public DNS/STUN/TURN leak certification needs controlled opt-in external infrastructure and provider/environment tests. Local UDP observation is not a pass badge.
- Manual Windows 10/11/physical hardware/upgrade/uninstall/UAC/SmartScreen and verified signing are outstanding.
- Runtime trust pins are independently committed relative to normal downloads, not a new upstream signed/reproducible attestation. A compromised same-account administrator can replace application/verifier too; TOCTOU is not eliminated.
- Site content can recognize Playwright/native automation. Fingerprint hashes are identifiers; local app-data/backup/report confidentiality remains the user's responsibility.
- The published dev.1 screenshot exposure remains in that old binary. A tested replacement release requires fresh explicit publication authorization; no existing assets are silently changed.
- Exhaustive profile/extension preference portability, sudden power-loss browser writes and stress/load limits are not certified by bounded regression tests.

## 10. Changed-file inventory

The complete file list relative to published source `e6089a8` is generated in `REMEDIATION_CHANGED_FILES.md`, including docs-only prior-publication records and the two regenerated **synthetic** desktop screenshots. No profile, cookie, backup, token, CA private key or raw page screenshot is committed.

## 11. Candidate and handoff

Preserve `feat/local-workspaces-v0.2`; package version is `0.2.0-dev.2` without a tag. Documentation-only final commit can follow the exact tested code source and is explicitly identified. Git bundle/checksum are refreshed after that commit for durable recovery; they contain source/history, not the large CI installer. No merge into main, new tag, release publication or old-asset deletion is performed. Stable v0.1.1 remains latest; previous dev.1 release is retained.

Guides: [fingerprints](FINGERPRINT_CAPABILITIES.md), [proxies](PROXY_LIMITATIONS.md), [backups](BACKUP_RESTORE.md), [troubleshooting](TROUBLESHOOTING.md), [security](../SECURITY.md), [runtime updates](RUNTIME_UPDATES.md), [candidate notes](RELEASE_NOTES_v0.2.0-dev.2.md).
