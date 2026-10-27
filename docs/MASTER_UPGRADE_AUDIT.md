# Fresh master-upgrade audit — 2026-10-27

## Provenance and baseline before source edits

Remote feature branch `feat/local-workspaces-v0.2` is `6c0029c42bb15da5ca029a5af10a206b583f3662`; remote main is separately `316dcb0ffcbd6b7edb6cec1f763ed4a3abe22b28`. GitHub API confirms latest stable v0.1.1 and development prerelease v0.2.0-dev.1. Working package is unreleased 0.2.0-dev.2. Main/release metadata is not assumed equal to the feature branch.

The restored workspace had stale local Git HEAD `92de1ab`, newer files and one older CI workflow. Verified the complete preserved bundle, checked its feature HEAD against `git ls-remote`, fetched its objects and restored HEAD/index **without replacing working source**. Only `.github/workflows/ci.yml` differs from that feature HEAD; its original bytes are backed up outside the repository in `/home/user/audit-20261027/preexisting-workflow.patch`. No AGENTS.md found in the project. No profile/user backups were removed.

Inspected package/build scripts, runtime archive/manifests/verifier, main/preload/IPC, schema/SQL/service lifecycle/proxies/backups, automation, fingerprint observer/validator, renderer capability handling, and current tests/workflow. Baseline Node24.22.0: npm ci, typecheck, lint, **94 unit tests /12 files passed**. First browser run: 24 failed, 2 passed, 1 Windows-only skip because the snapshot lacked a complete verified runtime; the unchanged verifier correctly failed closed. Existing pinned provisioning repaired the generated runtime, strict inventory verified **303 files**, then real browser suite **26 passed /1 Windows-only TLS skip**. No trust manifest regenerated. Build passed. Desktop initially unavailable (missing Xvfb, then libgtk-3.so.0); environment repair and rerun will be reported separately, not called a product regression or pass. Windows DPAPI/install tests cannot run on this Linux host.

## Prioritized verified gaps

| Severity | File / function | Evidence | Proposed change |
|---|---|---|---|
| High (uncommitted workflow drift) | `.github/workflows/ci.yml` | Working copy uses mutable action tags and omits current installed/DPAPI/runtime tests relative to actual feature HEAD | Preserve old patch, restore exact feature-head workflow, retain every current gate; do not merge main or publish |
| Medium | `src/shared/schema.ts::proxyInput`, `Service.proxyOptions` | Host regex accepts malformed brackets, port-in-host, invalid numeric addresses. Bracketed IPv6 is wrapped a second time | Regression-first host validation/canonicalization and safe legacy-record handling; no claim of externally tested IPv6 routing |
| Medium | `fingerprint.ts::fingerprintIssues/observedFingerprintIssues` | Only first UA token checked; high-entropy full version compared only by major; architecture/bitness/high-entropy platform contradictions not checked | Reproduce accepted contradictory inputs and strengthen supported desktop/x64 consistency guards |
| Medium | `Service.diagnose` | Browser `evaluate` has no overall deadline; a hostile/blocked page API can never resolve; raw page exception could cross IPC | Bound diagnostic observation, return a fixed private error, retain explicit unsupported/unavailable labels |
| Partial coverage | `fingerprint-observation.ts` | Geo permission reported, but coordinates are measured only by a separate integration assertion, not the diagnostic report | Read coordinates only after existing explicit grant, with bounded call/no permission prompt; compare with configured coordinates |
| Architectural | Current supported Chromium | CPU/memory/WebGL/canvas/audio/fonts/media controls are native observations, not programmable identities | Keep truthful native-only labels; evaluate concrete alternatives against licensing/security/update/Windows/distribution constraints before migration |
| External/manual pending | Proxy/DNS/WebRTC/Windows | Local ICE is not external STUN/authoritative DNS; older installed Windows CI evidence applies only to its exact source | Add useful controlled tests where feasible; distinguish historical CI, current Linux runs, and unavailable fresh Windows10/11/provider validation |

## Retained tested foundations

Persistent UUID contexts; cookies/localStorage/IDB/CacheStorage/SW/native session restoration; conservative UUID+exe+directory ownership; atomic SQL rollback and partial cleanup; per-step automation IDs/duration and opaque derivatives; strict JWE/gzip/path/count/size/hash/new-UUID restoration; Windows DPAPI/no plaintext fallback; runtime inventory pins; Electron isolation/sandbox/CSP/authorized top-frame IPC. These are not replaced merely to change appearance.

No new stable release, release-asset overwrite, tag, main merge or permission change is authorized. Fresh Windows validation must be explicitly identified; historical green CI is not new-code proof.

## Additional findings reproduced and resolved in this stage

- `Service.profiles`: while `Runtime.closing` was true, the snapshot still reported `running`. A regression failed with expected `stopping` / received `running`; shared schema, derived state and existing renderer actions/filter now handle stopping explicitly.
- `Service.proxyTest`: production probe did not explicitly enable Playwright's Chromium sandbox. An options regression failed because `chromiumSandbox:true` was missing; production probes now enable it, using the existing private test-constructor exception only for source fixtures. Fresh native Windows execution of this change remains pending.
- Diagnostic regressions reproduced raw `PRIVATE_PAGE_TOKEN` exception exposure; fixed a six-second overall deadline and static private error, and prevent stale results from persisting after stop/runtime replacement.
- Four first-batch regressions failed before fixes (raw diagnostic exception, conflicting UA, malformed host, bracketed IPv6); stopping and sandbox regressions also failed before their fixes. No original test was weakened or removed.
- Controlled local RFC5389 STUN: one UDP binding request and `host`/`srflx` types occurred with default policy, requested limited-UDP policy, and requested policy plus an actually forwarding HTTP proxy. **Loopback synthetic mapping is not a measured Internet/public IP.** The UDP setting is now explicitly experimental/not a firewall. Source diagnostics remain address-omitting/local-only; no production STUN endpoint is added.
- Latest official Chrome-for-Testing Stable is156.0.8078.47 vs pinned156.0.8078.4. This is a stable-release update/qualification blocker; no CVE coverage or arbitrary-executable compatibility is inferred. See the new concrete engine comparison.

Fresh final local commands on code `9c0e9b33daae58b702f2449e26e8cb71189e44a5`: typecheck/lint/build passed; **104 unit tests/14 files**, **29 real Chromium tests +1 Windows-only TLS skip**, **4 Electron desktop tests +1 Windows-only DPAPI skip**, **12 separately run runtime tests**, strict303-file verification; both npm audits zero vulnerabilities. The installed-application workflow is retained and extended to upload only controlled fingerprint/STUN observations. It has **not** run for new code: authenticated Git push dry-run fails (`could not read Username`), so no fresh Windows success or installer is claimed.

The evidence-retention follow-up fixes a verified runner behavior: each Playwright command clears its own output directory, so using one shared default erased browser JSON during desktop/install commands. CI now uses distinct browser/desktop/installed output directories. Full local browser then desktop commands retained both browser JSON artifacts; fresh code/CI configuration `9c0e9b33daae58b702f2449e26e8cb71189e44a5` repeats104 unit/29 browser+skip/4 desktop+skip results.
