> **2026-10-30 official channel check:** Stable `156.0.8078.80` versus pinned `156.0.8078.4`. This records a version gap, not a claim about a specific CVE. The update and Windows qualification gates below remain open.

> **Master-stage update:** Fresh official channel check reports Stable156.0.8078.47 vs pinned156.0.8078.4. A reviewed compatible Playwright/runtime update and new Windows gates are stable-release blockers. Do not generate new trust automatically from a download or silently substitute a fork; see MASTER_ENGINE_DECISION.md.

# Chromium runtime update and rollback

No unchecked in-app runtime updater is implemented. A bundled engine change is a reviewed application build, not a URL a renderer/user can supply. Current trusted Chromium: 156.0.8078.4, Playwright revision 1248, Windows/Linux x64 only.

## Update gate

1. Preserve private copies of user data with every app/browser stopped. Test only disposable copies first. Never have two browser versions open the same directory concurrently.
2. Select a supported Playwright/Electron/toolchain combination. Review release notes, security advisories and browser data-format compatibility; changing only a version string is insufficient.
3. Obtain upstream archives on a trusted reviewer machine using official HTTPS sources and verify independently published signed provenance/checksums where available. Matching Playwright CDN and Google bucket bytes is useful corroboration, **not independent signed attestation**. Document exactly what was/was not verified. If provenance is not adequate for the threat model, do not promote the runtime.
4. Independently review and commit new archive SHA256 pins in `scripts/runtime-archives.json` and matching per-file manifests under `scripts/runtime-manifests/`, including exact identity/platform/version/revision, required marker files and bounded ZIP inventory. Ordinary `npm run provision` must never generate/overwrite the trust baseline.
5. Update provisioning paths, build gates, embedded manifest imports, UA-major validation source and test expectations together. Do not accept platform mismatch, extra files, case-colliding paths, symlinks or unsafe extraction paths.
6. Run clean `npm ci`, audit/typecheck/lint/unit/runtime tests, provision/verification, full real-browser and Electron tests on Linux and Windows. Test sessions from the prior runtime on disposable data copies; native cookie encryption can still be Windows-account-bound.
7. Build on Windows x64; install the real EXE and test runtime corruption/rejection/repair. Execute the consumer Windows 10/11 upgrade/uninstall checklist. Record actual hash/signature status and run URLs. Keep automatic publication disabled; require explicit release authorization.

## Rollback

Keep the previous exact reviewed app installer/runtime pins and a **pre-upgrade user-data snapshot**. Downgrading Chromium or the app against data already written by a newer version is not assumed safe. First stop all app/browser instances and verify ownership/locks. Restore the old application and its matching runtime together; test using a separate copy of the pre-upgrade data. Never mix an old manifest with a new executable or silently remove current user data/locks to force a rollback. Newer authenticated backups still require an app that supports their format/password; they are not automatic backward-compatible old-app imports.

## Trust limits

Hashes detect changed bytes relative to reviewed source, not a compromised upstream, replacement of the app plus its pins, or every file swap between verification and execution. A real Windows signature, trusted distribution and directory ACLs are separate controls. Runtime integrity checks do not provide stealth, website compatibility or DNS/WebRTC leak certification.
