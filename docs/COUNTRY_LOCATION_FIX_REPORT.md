# Country/location and proxy display fix — 0.2.0-dev.3

## Investigation

Inspected the exact public feature branch tip `e0b1cb5e4030e9e6f8e5b6d9e66c3b9f32b7f7d2`, not main or an old release. Recovered its Git metadata from the preserved source bundle and confirmed the public remote SHA. Workspace initialization had supplied an older CI file; preserved that file separately and restored the branch's actual pinned workflow before making the documented build-order/evidence changes.

Confirmed source defects:

1. `main.tsx` rendered name, runtime status, browser, proxy and last-used, but **no Country/Location column and no flags**. Requested country was only a small ISO code inside the proxy cell.
2. `SimpleCreate` populated its selector only from provider inventory. With missing credentials, empty inventory or an API outage, only the default direct option remained. That explains how a user could create a genuinely direct profile while expecting a country workflow. It was not evidence that a proxy had been assigned and then dropped.
3. The old IP-only `proxyTest` persisted `connection:null`, so a successful IP test could show Not configured in the newer table. It now records actual IP-only connectivity explicitly, with no invented country. An IP-only test intentionally invalidates prior exit-country evidence; use Retry for a complete location check.
4. Proxy verification did not persist Connecting while awaiting network work. The table could continue displaying the old result. Pending probes are now visible; interrupted probes become retryable failure after restart, not permanent Connecting.
5. Shared proxy result state was relative to the last tester's requested country. A France-requesting profile sharing a Germany exit now shows its own mismatch, independently of another Germany-requesting profile.

No installed executable, installed version, provider account or network trace was supplied from the user's device. An outdated installed build or account failure there cannot be diagnosed as a fact. Previous changes reused `0.2.0-dev.2`; this fix bumps the app and setup filename to **0.2.0-dev.3** so the new build is distinguishable.

## End-to-end behavior

- Country/territory choices remain visible independently of account inventory. Selecting a country automatically obtains and checks a provider endpoint; it cannot silently become direct when the provider fails. Create stays disabled until country verification passes. Direct requires the explicit no-proxy choice.
- `prepareLocation` uses the existing Webshare adapter, bounded API requests, encrypted endpoint credentials and actual Chromium proxy probe. `createLocated` checks fresh successful observed IP and matching country before saving `proxyId`, requested ISO code and canonical English country name. Existing JSON storage is additive/backward compatible; no SQL migration or session-directory rewrite is needed.
- Country-managed launch re-verifies the assigned proxy; it never substitutes direct routing. Existing session/profile/assignment behavior is retained.
- The table retains name, browser version, runtime status, proxy and last-used. It adds **Country / Location**, explicit Requested vs Verified exit (last test), country names and **offline SVG flags**. SVGs are pinned maintained MIT assets, not hardcoded geolocation outcomes or unsupported Windows flag emoji. License/provenance is included.
- Requested flags are clearly labelled as user intent. Detected flags require a proxy assignment and successful observed country/IP result. Direct, unknown, pending and failed routes show no verified exit flag. Saved proxy region labels do not become geolocation.
- Statuses show Not configured, Connecting, Connected, Failed and Location mismatch, with authentication/location-unavailable details. Retry is available directly in the profile row. Failed retries clear obsolete observed flags but retain the assignment and requested country.

## Verification so far

- Local Linux: typecheck, lint, build and pinned runtime verification passed; **165 unit cases / 18 files**, **35 browser/integration cases passed + 1 existing Windows-only TLS skip**, **8 actual Electron cases passed + 1 existing Windows DPAPI skip**.
- New built-renderer test uses the real request dispatcher and Service, a controlled provider inventory, a real authenticated local HTTP proxy, and explicitly synthetic geo response data. It selects Germany in the actual built form, automatically connects, saves the profile, checks persisted code/name/assignment, displays actual SVG images, launches through the assigned proxy and proves additional proxy forwarding. A changed synthetic exit produces a US-vs-Germany mismatch. Separate built-form cases cover missing provider, empty inventory and provider outage with zero unintended direct profiles.
- Actual Electron table test uses a real temporary SQLite database populated by actual controlled proxy verification, then checks connected, shared-profile mismatch, unverified manual labels and direct rows. It verifies flags load offline, restarts the application, and checks failed Retry retains proxy assignment and clears the detected flag.
- The same table regression is added to the **installed Windows EXE** suite. Review of the initial installed-Windows screenshot caught horizontal clipping on the hosted screen. Country/Location now sits beside the name, long names wrap, and the real app/EXE test asserts an observed flag is in the minimum 1000×680 viewport without horizontal scrolling (ordinary vertical scrolling to the row is allowed). Final hosted Windows build/install evidence is recorded below when available; it must not be inferred from Linux or from a source-only renderer test.

The screenshot `country-location-controlled.png` contains explicitly synthetic country/IP data from the controlled test. It is not a paid-provider or real-world US/Germany exit claim.

## Required external setup

For real country-managed profiles, configure your own **Webshare API token**, default-plan direct proxies in the requested country, and an **ipapi.co production subscription key** in Settings. A GitHub token is not a provider credential. Do not paste provider secrets into chat. No paid provider/geolocation accounts were available for this task; live subscription acceptance remains unrun. No proxy traffic purchase or rotating residential/backbone integration is implied. See [LOCATION_SETUP.md](LOCATION_SETUP.md).

Manual Windows 10/11 install/upgrade/uninstall, executable-signature qualification and public-network leak certification remain outside the hosted tests. Existing main, releases and tags are not modified.
