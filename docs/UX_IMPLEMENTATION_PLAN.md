# Beginner workflow upgrade — 2026-10-28

## Fresh inspection

Recovered feature HEAD702c40e from the verified master bundle without replacing user files; remote feature remains6c0029c. Preserved the older workspace workflow diff outside the repository and restored the feature's complete pinned-action workflow. Inspected React's eight-page UI/wizard, schemas, SQLite JSON persistence, Service profile/proxy/lifecycle/automation/backup methods, strict preload/top-frame IPC, package/runtime scripts and current tests. Baseline typecheck and104 unit tests pass. Existing engine/native fingerprint limitations and data directories remain unchanged.

## Priority / implementation sequence

1. **Shared proxy business logic:** bounded import parser with safe line-level validation; atomic batch persistence through existing DPAPI preparation; profile-only proxy assignment; optional provider/notes/group metadata with additive defaults; native proxy-delete confirmation; supported browser-tab focus.
2. **Beginner flow using existing React:** actionable onboarding; default profile names; basic→browser→proxy→review wizard, advanced controls collapsed; inline saved-proxy testing/adding; Create and Launch; dashboard search/table; profile details and safe assignment; proxy import preview/test-all/assignment.
3. **Regression-first or focused tests:** parser/import/DPAPI rollback/assignment persistence and busy guard; desktop onboarding/wizard/import/assignment/details/restart; retain original security/browser/archive tests. Real network fixtures remain distinct from external provider tests.
4. **Evidence and delivery:** source checks, real Chromium/desktop, Windows CI via authorized feature pushes; screenshots with synthetic data and simple guide; measured capability/limitations and exact tested commits. No main merge/tag/release or fake geolocation/no-leak/signature claims.

Credentials remain DPAPI-only, absent from snapshots/import error text/logs. Provider/region are user labels, not geolocation. Assignments apply on future launches only; running edits are rejected. Archive preserves all site data; delete requires confirmation. Proxy tests use the existing bounded actual Chromium probe and do not prove DNS/WebRTC privacy.
