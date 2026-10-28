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

## Verification

- Local Linux: typecheck, lint, build and pinned runtime verification passed; **165 unit cases / 18 files**, **35 browser/integration cases passed + 1 existing Windows-only TLS skip**, **8 actual Electron cases passed + 1 existing Windows DPAPI skip**.
- New built-renderer test uses the real request dispatcher and Service, a controlled provider inventory, a real authenticated local HTTP proxy, and explicitly synthetic geo response data. It selects Germany in the actual built form, automatically connects, saves the profile, checks persisted code/name/assignment, displays actual SVG images, launches through the assigned proxy and proves additional proxy forwarding. A changed synthetic exit produces a US-vs-Germany mismatch. Separate built-form cases cover missing provider, empty inventory and provider outage with zero unintended direct profiles.
- Actual Electron table test uses a real temporary SQLite database populated by actual controlled proxy verification, then checks connected, shared-profile mismatch, unverified manual labels and direct rows. It verifies flags load offline, restarts the application, and checks failed Retry retains proxy assignment and clears the detected flag.
- The same table regression is added to the **installed Windows EXE** suite. Review of the initial installed-Windows screenshot caught horizontal clipping on the hosted screen. Country/Location now sits beside the name, long names wrap, and the real app/EXE test asserts an observed flag is in the minimum 1000×680 viewport without horizontal scrolling (ordinary vertical scrolling to the row is allowed). Final hosted Windows build/install evidence is recorded below; it is independent of Linux and source-only renderer tests.

The screenshot `country-location-controlled.png` contains explicitly synthetic country/IP data from the controlled test. It is not a paid-provider or real-world US/Germany exit claim.

## Required external setup

For real country-managed profiles, configure your own **Webshare API token**, default-plan direct proxies in the requested country, and an **ipapi.co production subscription key** in Settings. A GitHub token is not a provider credential. Do not paste provider secrets into chat. No paid provider/geolocation accounts were available for this task; live subscription acceptance remains unrun. No proxy traffic purchase or rotating residential/backbone integration is implied. See [LOCATION_SETUP.md](LOCATION_SETUP.md).

Manual Windows 10/11 install/upgrade/uninstall, executable-signature qualification and public-network leak certification remain outside the hosted tests. Existing main, releases and tags are not modified.

## Final Windows build and installed-application qualification

- Exact application source: **`9e80952f91c079fe1f6ad761b5e2bef30c7d0d4b`** on `feat/local-workspaces-v0.2`. Documentation/screenshot follow-ups do not change application code, tests, dependencies, or CI.
- [Full Linux + Windows CI run **40707818072**](https://github.com/laiss3r/phantom-browser-premium/actions/runs/40707818072): **both jobs completed successfully**.
- Windows: **161 unit cases passed, 4 existing Linux-only process-inspection cases skipped**; 12 runtime cases passed; **36 browser/integration cases passed**; **9 actual Electron cases passed**; installer build and silent installation passed; **4 installed-EXE cases passed**, including the country-table/minimum-window test. No assertion was removed/forced and no new case was skipped for Windows.
- Local final-source Linux checks: **165 unit cases / 18 files**, **35 browser cases passed + 1 existing Windows TLS-only skip**, **8 Electron cases passed + 1 existing Windows DPAPI-only skip**, typecheck/lint/build/runtime verification passed. The new UI/actual-proxy tests are included, not separate unverifiable screenshots.
- [Installed Windows screenshot](country-location-installed-windows.png) and [controlled installed observations](COUNTRY_LOCATION_INSTALLED_OBSERVATIONS.json) were downloaded from this exact CI run. The country flags are visible at minimum window size without horizontal table scrolling. The full-page screenshot includes a vertically scrolled minimum-window view; other retained technical/action columns remain horizontally scrollable. Country/IP data is explicitly synthetic and the proxy is a genuine local fixture, **not a live paid-provider exit**.

### Exact installer

**`Phantom-Browser-Setup-0.2.0-dev.3-x64.exe`** — 297,758,247 bytes.

[Download the exact Windows Setup artifact](https://github.com/laiss3r/phantom-browser-premium/actions/runs/40707818072/artifacts/12825452316) (GitHub login may be required; artifact expiry 2027-01-26T14:37:44Z). Extract the setup executable and accompanying checksum file. This is a CI development artifact, not a newly published release/tag.

Independently verified EXE SHA-256:

```text
fe9e860dd6d84ed7bfb5b2a11e810ed52b05af7d5138486bcee94b4544803f02
```

The downloaded ZIP also matched GitHub's `sha256:ebe244509ef212dd27d47018a5ab9fe9a087d069f787e5e6891317c531aa8e97` digest. Hash integrity is **not code-signature qualification**. The compressed installer was streamed and independently hashed after extraction; this is not merely a copied filename or metadata digest.

To use it: stop your profiles and exit all old Phantom windows normally, install the exact artifact above without deleting app data, reopen and confirm **v0.2.0-dev.3** in the sidebar. Open Browser Profiles and look for **Country / Location beside the name**. Earlier directly created profiles remain direct; no missing country choice is guessed or retroactively invented. Configure the two service credentials in Settings before requesting a real country-based connection. Actual consumer-Windows upgrade/uninstall and live paid-provider acceptance remain outstanding.

Machine-readable results, artifact identity, log hashes and the exact installer hash are in [COUNTRY_LOCATION_FIX_EVIDENCE.json](COUNTRY_LOCATION_FIX_EVIDENCE.json). The companion `phantom-country-location-evidence.zip` preserves full logs and the report/screenshots; `phantom-country-location.bundle` preserves source history. Main, original releases and tags remain unchanged.
