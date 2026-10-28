# Current checkpoint — zero-account routing, 0.2.0-dev.4

Application source commit: 88d163dc21881fabbbedf6a81b977eb99d9d1fdc.
Implemented automatic official pinned Tor downloads/country routes and keyless
real exit verification. Live actual Linux Service + managed Tor + bundled Chromium
proved Germany, public HTTPS and zero provider keys. 174 unit cases pass;
browser 35 passed/1 Windows-only skip; Electron 8 passed/1 Windows DPAPI skip.
Typecheck/lint/build pass. New strict installed-Windows live test is added.

Push attempted to authorized feature branch, failed because GitHub authentication
is absent (no credential stored, no remote altered). Exact dev.4 Windows installer
and CI qualification remain pending. No main/release/tag changes. Historical dev.3
evidence below is not dev.4 evidence. See docs/FREE_ROUTING_REPORT.md.

---

# Master-upgrade checkpoint — 2026-10-27

- Branch feat/local-workspaces-v0.2; local source commits86d58a2/f47161d; exact tested source `9c0e9b33daae58b702f2449e26e8cb71189e44a5`. Package remains unreleased0.2.0-dev.2.
- **Not pushed**: Git non-interactive push dry-run failed authentication; no stored credential or connected GitHub tool is available. Remote feature baseline6c0029c; main316dcb0 remains separate. No new release/tag/main merge/permission change.
- Fresh Debian13/Node24.22:104 units/14 files,29 browser +Windows-only TLS skip,4 desktop +DPAPI skip,12 separately repeated runtime tests, strict303 files, typecheck/lint/build/licenses and both dependency audits passed.
- New fixes: coherent desktop/high-entropy validation, proxy address normalization/errors, bounded private/stale-safe diagnostics, already-granted geo coordinates, production probe sandbox, stopping UI; HTTP407/SOCKS DNS/local STUN regressions.
- Actual loopback STUN UDP remains under policy, including actual HTTP-proxy routing. No public DNS/STUN/IPv6-provider certification. Native hardware/graphics/font/media identity controls remain diagnostic only.
- Latest CfT Stable156.0.8078.47 vs pinned156.0.8078.4: reviewed patch/runtime qualification pending. Fresh Windows install/DPAPI/manual10/11/signature checks pending; old CI40565021705 is old-source evidence only.
- Current report/audit/engine decision/controlled observations/verification JSON/change inventory are under docs/MASTER_*. Source-history bundle and checksum will preserve local commits for authenticated push; no fresh EXE is fabricated.
