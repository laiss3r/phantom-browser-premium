# Master upgrade — complete changed-file rationale

Relative to actual starting feature HEAD `6c0029c`. 37 changed/new files. No original tests, runtime pins or user data deleted.

| File | Why |
|---|---|
| `.github/workflows/ci.yml` | Retain existing immutable gates; separate suite output directories and allowlist controlled JSON artifacts. |
| `CHANGELOG.md` | New unreleased-stage changes without claiming publication. |
| `README.md` | Current-source/push/Windows/runtime-gap warning and report link. |
| `SECURITY.md` | Bounded diagnostics, probe sandbox and measured local-UDP limitations. |
| `WORK_CHECKPOINT.md` | Current local source, test results, push block and development-only status. |
| `docs/BACKUP_RESTORE.md` | Current-scope caveat/guide update; retains historical records and accurately labels fresh Windows/runtime/network limits. |
| `docs/FINGERPRINT_CAPABILITIES.md` | Current-scope caveat/guide update; retains historical records and accurately labels fresh Windows/runtime/network limits. |
| `docs/MASTER_ENGINE_DECISION.md` | Fresh audit, concrete engine decision, exact-source evidence/verification or full handoff report; does not reuse old Windows proof. |
| `docs/MASTER_ENGINE_SOURCE_SNAPSHOT.json` | Fresh audit, concrete engine decision, exact-source evidence/verification or full handoff report; does not reuse old Windows proof. |
| `docs/MASTER_LOCAL_FINGERPRINT_OBSERVATIONS.json` | Fresh audit, concrete engine decision, exact-source evidence/verification or full handoff report; does not reuse old Windows proof. |
| `docs/MASTER_LOCAL_STUN_OBSERVATIONS.json` | Fresh audit, concrete engine decision, exact-source evidence/verification or full handoff report; does not reuse old Windows proof. |
| `docs/MASTER_UPGRADE_AUDIT.md` | Fresh audit, concrete engine decision, exact-source evidence/verification or full handoff report; does not reuse old Windows proof. |
| `docs/MASTER_UPGRADE_CHANGED_FILES.md` | Fresh audit, concrete engine decision, exact-source evidence/verification or full handoff report; does not reuse old Windows proof. |
| `docs/MASTER_UPGRADE_REPORT.md` | Fresh audit, concrete engine decision, exact-source evidence/verification or full handoff report; does not reuse old Windows proof. |
| `docs/MASTER_UPGRADE_VERIFICATION.json` | Fresh audit, concrete engine decision, exact-source evidence/verification or full handoff report; does not reuse old Windows proof. |
| `docs/PROXY_LIMITATIONS.md` | Current-scope caveat/guide update; retains historical records and accurately labels fresh Windows/runtime/network limits. |
| `docs/REMEDIATION_REPORT.md` | Current-scope caveat/guide update; retains historical records and accurately labels fresh Windows/runtime/network limits. |
| `docs/RUNTIME_UPDATES.md` | Current-scope caveat/guide update; retains historical records and accurately labels fresh Windows/runtime/network limits. |
| `docs/TROUBLESHOOTING.md` | Current-scope caveat/guide update; retains historical records and accurately labels fresh Windows/runtime/network limits. |
| `docs/WINDOWS_INSTALL.md` | Current-scope caveat/guide update; retains historical records and accurately labels fresh Windows/runtime/network limits. |
| `docs/desktop-dashboard.png` | Regenerated synthetic desktop test screenshot; no user profile data. |
| `docs/desktop-profiles.png` | Regenerated synthetic desktop-test screenshot; no user profile data. |
| `src/main/fingerprint-observation.ts` | Bounded already-granted geolocation measurement; richer hints typing. |
| `src/main/fingerprint.ts` | Desktop/x64/repeated-version and high-entropy/coordinate consistency. |
| `src/main/service.ts` | Legacy host normalization, diagnostic deadline/private errors/stale guard, probe sandbox and derived stopping. |
| `src/renderer/main.tsx` | Existing UI stopping guards/filter, host validation, explicit support labels and experimental UDP request. |
| `src/renderer/style.css` | Stopping-state badge. |
| `src/shared/fingerprint-capabilities.ts` | Honest diagnostic-only/native/UDP/geo boundaries. |
| `src/shared/schema.ts` | Validated canonical transport host and stopping-state schema. |
| `tests/browser.integration.spec.ts` | Real coordinate assertions, HTTP407/no fallback, SOCKS hostname routing, local STUN and native evidence. |
| `tests/desktop.integration.spec.ts` | Real renderer/IPC invalid-host and canonical IPv6 save plus diagnostic-only labels. |
| `tests/diagnostic-failure.unit.test.ts` | Private errors/deadline/stopped-profile persistence guard. |
| `tests/fingerprint.unit.test.ts` | Repeated/32-bit UA and simulated high-entropy/coordinate validation; not native proof. |
| `tests/lifecycle.unit.test.ts` | Pending-stop state and production sandbox-option regressions. |
| `tests/proxy-address.unit.test.ts` | Invalid DNS/IP/bracket regressions and canonical IPv6 serialization. |
| `tests/proxy-fixture.ts` | Controlled proxy-side alias resolution and received-host recording. |
| `tests/stun-fixture.ts` | Loopback-only RFC5389 synthetic TEST-NET test server, never production. |
