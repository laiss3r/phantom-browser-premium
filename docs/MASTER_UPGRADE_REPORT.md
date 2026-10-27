# Master engineering upgrade — implementation and verification

**2026-10-27 · branch `feat/local-workspaces-v0.2` · remains a development build.**

**Exact locally tested source: `9c0e9b33daae58b702f2449e26e8cb71189e44a5`.** Documentation-only commits may follow. Starting remote feature HEAD was `6c0029c42bb15da5ca029a5af10a206b583f3662`, separate remote main `316dcb0ffcbd6b7edb6cec1f763ed4a3abe22b28`. Published development prerelease remains v0.2.0-dev.1, stable v0.1.1; working package remains **unreleased 0.2.0-dev.2**. Historical dev.2 verification is not fresh proof for this stage.

**Push/fresh Windows CI blocked:** no authenticated Git credential is available in this restored session; a non-interactive push dry-run failed on authentication. These new commits are local and provided in a complete source-history bundle. No new public tag/release, asset overwrite, main merge or repository-permission change was performed. An exposed old credential was not written into files or reused as a new stored credential.

## 1. Changes actually implemented

- Restored feature-branch Git metadata from the verified bundle without replacing working source; compared actual remote refs/releases. Preserved the differing older workflow in an external patch and restored the feature's full immutable-action Windows/Linux workflow instead of silently losing installed/security gates.
- **Proxy addresses:** validate DNS labels, canonical IPv4/IPv6, bracket pairs, and separate host/port; reject malformed or ambiguous numeric hosts/URL-like entries. Canonicalize bracketed IPv6 and validate retained records before constructing exactly one pair of URL brackets. Existing valid DNS/IP profiles remain usable. IPv6 syntax/serialization is tested, not an actual external IPv6-provider claim.
- **Fingerprint consistency:** reject conflicting repeated Chromium versions and non-x64 custom desktop UA; compare high-entropy full version, architecture, bitness, platform/mobile/WOW64 where available. Do not fabricate absent hints or support arbitrary OS/hardware identities.
- **Diagnostics:** bound browser observation to six seconds, replace page exceptions with a static private error, and reject stale observations after profile stop/runtime replacement. Read and compare coordinates only after an existing geolocation grant; bounded call, no prompt and no location read when denied. Geolocation data is identifying: protect the local database.
- **Production probe security:** explicitly enable Chromium sandboxing for production headless IP probes; keep the pre-existing private test-constructor exception separate from renderer/IPC/production construction. The new option is unit-tested; fresh installed Windows execution remains pending.
- **Lifecycle/UI:** derive and display `stopping` while close is pending; include it in active/bulk guards/status filter and disable conflicting row actions. Preserve existing React structure and all eight pages. Proxy form now validates locally and shows a useful host error; its canonical IPv6 save is tested through real Electron IPC.
- **Truthful labels:** show **Supported / Partial / Diagnostic only / Unsupported**. Requested UDP policy is explicitly experimental, not a leak blocker/firewall.
- **Network coverage:** real wrong/stale fixture credentials (simulated provider407; not a real provider expiry/TTL test) produce407 without forwarding or direct destination hits; a SOCKS5 fixture receives an unresolved `.invalid` hostname and resolves it inside the proxy; local RFC5389 STUN traffic is measured under default/requested policy and with an actually forwarding HTTP proxy.
- Save only controlled synthetic-profile native fingerprint/STUN observations; CI upload allowlist includes these small JSON artifacts, not user profiles, candidate addresses, arbitrary reports or CA private keys.

Regression-first failures are recorded in [fresh audit](MASTER_UPGRADE_AUDIT.md). Source commits: `86d58a2` (fixes/coverage/UI), `f47161d` (controlled evidence retention), `9c0e9b3` (separate output directories prevent later suites deleting browser evidence). No engine swap, dependency update or source-level stealth patch was introduced.

## 2. Engine decision and important patch gap

Concrete primary-source review covers current supported Playwright Chromium, CloakBrowser, ungoogled-chromium, rebrowser library patches, Camoufox and a custom Chromium build. Maintenance timestamps, exact revisions, license distinctions, listed Windows assets, security/API limitations, unmeasured performance and ongoing build/update costs are documented in [MASTER_ENGINE_DECISION.md](MASTER_ENGINE_DECISION.md), with [retrieved metadata](MASTER_ENGINE_SOURCE_SNAPSHOT.json).

Retain the current supported engine for this stage. CloakBrowser wrapper MIT does not grant redistribution of its separately restricted binary; ungoogled-chromium is a privacy patchset rather than demonstrated per-profile identity control and documents security/privacy trade-offs; rebrowser patches the library, not browser; Camoufox is a different Firefox engine with a prerelease warning. None was silently installed or treated as independently qualified native fingerprint control.

**New stable-release blocker:** official Chrome-for-Testing Stable reports **156.0.8078.47**, but this branch pins **156.0.8078.4**. Reviewed Playwright/runtime update, provenance and full Windows regression qualification are required. A patch gap is not a CVE determination; zero npm audit vulnerabilities does not audit Chromium CVEs. Do not regenerate trusted pins from an unreviewed download or call the pinned browser current.

## 3. Actual fingerprint/network evidence

[Fresh Linux native observations](MASTER_LOCAL_FINGERPRINT_OBSERVATIONS.json) came from a real persistent Chromium profile, actual controlled request headers and a second browser launch—not mocked browser data or old Windows measurements.

- UA: native Linux x64 desktop form with Chrome/156.0.0.0; high-entropy Chromium full version156.0.8078.4, architecture x86, bitness64, platform Linux, mobile false/WOW64 false. PlatformVersion was empty: **unavailable**, not a spoofing success.
- Language/languages en-GB/[en-GB], timezone Africa/Nairobi, viewport/screen1280×800, DPR1.25; configured preferences matched; no detected mismatch among observed fields.
- Native hardwareConcurrency2 and deviceMemory2; software WebGL `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`. These are host observations, not user-set hardware identity.
- Canvas SHA256 `4e4021b679471fce0d72a3e6d0a1a6f2d19318bb858d0d1a4781cd65ecd05ef9`; audio `b71e648ca8437bd608b31584cd8ab90852c646248aa948e969c719ff570566e6`. Equal across stop/relaunch in the same environment, not guaranteed after driver/browser updates.
- `navigator.webdriver` true, retained. Media IDs/candidate addresses omitted. Fonts are generic-family metrics, not installed-font enumeration. Denied geo records `not-granted/null`; the separate explicit-grant integration test observes latitude−0.3/longitude36 and compares coordinates after diagnosis.

[Controlled STUN evidence](MASTER_LOCAL_STUN_OBSERVATIONS.json): each of three cases recorded **one UDP binding request** and `host`/`srflx` candidates. The HTTP-proxy case also forwarded real HTTP requests, so assignment was not decorative. The STUN server deliberately supplies a **TEST-NET synthetic mapping** over loopback; this is a genuine protocol fixture, **not an observed public Internet IP**. It demonstrates that the requested policy does not prevent this local UDP path, not that a particular public provider leaks or is safe.

The SOCKS5 hostname test proves the proxy received the unresolved hostname; it does not establish absence of every local DNS/preconnect request. Public egress/provider credentials, authoritative DNS, Internet STUN/TURN, OS interfaces and provider-specific behavior still require separately controlled opt-in infrastructure. No TLS verification is bypassed; untrusted TLS rejection and Windows-only trusted-CA test remain intact.

## 4. Exact fresh test results

**OS:** Debian GNU/Linux13 x64, Node24.22.0, Electron45, Playwright1.64.1, pinned Chromium156.0.8078.4. **Source:** `9c0e9b33daae58b702f2449e26e8cb71189e44a5`. Raw logs are retained in `/home/user/audit-20261027/`; [verification JSON](MASTER_UPGRADE_VERIFICATION.json) records their SHA256.

| Command | Actual result / scope |
|---|---|
| `npm ci` | Baseline6c0029c install passed; identical unchanged package/lock used for final source, no dependency version changes |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed |
| `npm test` | **104 passed /14 files**, no skips on this Linux run |
| `npm run test:runtime` | **12 passed** separately; also included in full unit suite, not104+12 unique tests |
| `npm run verify:runtime` | **303 files verified**, unchanged trusted inventory |
| `npm run test:integration -- --output=test-results/browser` | **29 passed /1 Windows-only trusted-TLS skip**, 56.0s |
| `npm run build` | Passed |
| `xvfb-run -a npm run test:desktop -- --output=test-results/desktop` | **4 passed /1 Windows-only DPAPI skip**, 8.7s |
| `npm audit --json` | **0 vulnerabilities** in dependency audit |
| `npm audit --omit=dev --json` | **0 vulnerabilities** |
| `npm run licenses` | Passed dependency/license listing; not independent legal certification |
| Fresh Windows x64 packaging/installed app/DPAPI | **Pending — no fresh authenticated CI run or Windows host** |
| Manual Windows10/11 install/upgrade/uninstall/UAC/SmartScreen/hardware | **Pending** |

Initial failures are not hidden: missing snapshot runtime correctly failed verification and browser launches; normal pinned provisioning repaired generated runtime. Xvfb and GTK3 were missing locally; after installing system dependencies, baseline desktop3 passed/DPAPI skip. New regressions failed before fixes. All original tests remain; no retry-to-hide-failure policy or reduced assertions were added.

Existing suite retains real multi-profile cookies/localStorage/IDB/history/cache/SW isolation and graceful restart; native session/tab restoration; actual dead-manager/live-Chromium conservative ownership; failed launch/cancellation/report-write/opaque-screenshot tests; malicious archive/wrong-password/tamper cleanup; SQL durability; renderer isolation/navigation/authorized IPC; runtime corruption/extraction/inventory rejection. These passed within the commands above. Mocked option/validator unit tests are not presented as packaged native proof.

## 5. Windows evidence — precise boundary

Historical [CI40565021705](https://github.com/emmanuellaisa00/phantom-browser/actions/runs/40565021705) passed both OS jobs for **02d0a4b**, before this stage: Windows Server2025 x64, browser27, desktop4/DPAPI, installed3 (offline/tamper/repair; native fingerprint/relaunch; verified actual Electron-main termination/persisted metadata/recovery). Old installer297,344,549 bytes, SHA256 `1cf8ac18c68abdaf8dd6cfd906159a384acf8777d560d86883d4c0a442853670`. Historical [verification](REMEDIATION_VERIFICATION.json) and [Windows observation artifact](REMEDIATION_INSTALLED_OBSERVATIONS.json) remain unchanged.

**That installer does not contain these new changes.** No new installer was produced or uploaded, no fresh Windows success inferred, no valid publisher signature verified. The complete original Windows workflow remains and now also collects allowlisted controlled network/fingerprint JSON. Push new commits using authenticated Git, then wait for both jobs and review actual installed results before promotion. A source build or historical hosted Server2025 success cannot certify manual consumer Win10/11, crashes/power loss on every system, GPU/drivers or SmartScreen/UAC.

## 6. Definition-of-done assessment

| Area | Current state |
|---|---|
| Existing working architecture/features | Retained and fresh Linux regressions pass |
| Major new regressions | Automated tests added; pre-fix failures reproduced |
| Supported fingerprint configuration | Fresh native evidence and stronger validation; native hardware/graphics/font/media substitution **unsupported** |
| Proxy behavior | HTTP/HTTPS/SOCKS5 supported boundaries retained; new host/auth/DNS-fixture coverage; authenticated SOCKS5 disabled; external leak/provider certification partial |
| Profile isolation/lifecycle/recovery | Existing real source tests pass; stopping state corrected; crash vs graceful persistence limits explicit; no arbitrary PID killing |
| Backup encryption/malicious archives | Existing wrong-password/tamper/path/bounds/new-profile/cleanup regressions pass; gzip clearly plaintext, proxy credentials excluded, OS-bound cookies not universally portable |
| Electron/runtime security | Bound diagnostics/private errors and production probe sandbox improved; original isolated sandboxed renderer/IPC/CSP/runtime checks retained |
| UI | Existing pages retained, real backend controls, stopping guards, host errors and explicit diagnostic-only/unsupported labels verified in Electron |
| Windows/current packaging | **Fresh validation pending**; historical evidence explicitly source-bound |
| Documentation | Current audit, engine trade-offs, capabilities, test results, known issues and source-only handoff recorded |

## 7. Remaining bugs, unsupported capabilities and release recommendation

**Recommendation: development build only, not ready for stable release.**

1. Fresh Windows x64 source/package/install/DPAPI gates are blocked by unavailable authenticated push/Windows runner access; manual Windows10/11 and valid signing remain unverified.
2. Runtime security-patch update/qualification is pending (official Stable156.0.8078.47 vs bundled156.0.8078.4).
3. Requested UDP policy does not block the measured loopback STUN path; public routing/DNS/STUN/TURN protection is not certified. Provider-wide authentication, timeouts, external IPv6 and leak behavior require environment testing.
4. Arbitrary per-profile CPU/memory/OS/WebGL/canvas/audio/font/media identities remain unsupported. No qualified free redistributable native fingerprint engine is integrated; no universal website acceptance/undetectability/GoLogin parity claim.
5. Complete worker/frame/platformVersion consistency, every extension/site preference, native crash-time cookie flushing/power loss, large-scale resource limits and cross-account cookie portability remain incompletely tested.
6. Native samples/location/configuration and backups are identifying data; protect local app data. JWE protects archive contents, not a running compromised session or JS/OS memory; passwords have no recovery and JS string erasure is not guaranteed.
7. Published dev.1 still has the earlier screenshot privacy exposure. Old binaries/assets were not silently replaced; old report PNGs should be treated as sensitive.

Complete changed-file rationale: [MASTER_UPGRADE_CHANGED_FILES.md](MASTER_UPGRADE_CHANGED_FILES.md). Runtime/backup/security guides remain applicable within these stated boundaries. Source bundle contains new local commits and full available history, not a fresh Windows executable. Do not publish, tag, merge main or replace old assets as part of the handoff.
