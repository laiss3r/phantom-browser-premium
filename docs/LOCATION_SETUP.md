# Current default: automatic Free Tor (0.2.0-dev.4)

1. Open **Create profile**, enter a name and select a country.
2. Wait for the first official Tor download and connection verification; this can take a few minutes.
3. Create only after **Connected**. The requested and verified country flags remain separate.

**No account, subscription, API key or manual proxy configuration is required.**
Free Tor uses shared public exits; some countries have none and sites/ISPs may block
Tor. Failure is reported honestly, never replaced with a direct connection. This
is not Tor Browser or a privacy/leak guarantee. First use downloads about 22 MiB
on Windows x64 (31 MiB Linux) from Tor Project. Keyless country.is verifies IP
location. Optional paid settings are under Advanced and are not needed.

See [implementation and evidence](FREE_ROUTING_REPORT.md). New source is locally
committed; GitHub push authentication and exact new installed-Windows qualification
are pending. Do not use historical dev.3 installer evidence as proof of dev.4.

---

## Historical paid-provider setup (still optional in Advanced)

# Name + country creation: required setup

This is a real provider-backed workflow, not bundled free proxy traffic. Phantom does not have a Webshare or GoLogin subscription built in. Your GitHub token is **not** a proxy-provider token.

## One-time setup (Windows)

1. Obtain a Webshare account with a **direct-mode proxy list in its default plan**, including endpoints in the countries you want. Country availability is account-specific. This adapter does not support Webshare rotating residential/backbone plans, plan purchases, arbitrary provider API URLs or billing mutations.
2. Obtain the API token from Webshare. Open Phantom **Settings → Country connections — Webshare**, paste **Webshare API token**, and select **Save and check provider**. Tokens are stored using the existing Windows DPAPI path; they are never returned to the UI or included in profile backups. Linux/macOS cannot save these credentials: there is no plaintext fallback.
3. For a packaged/production build, supply a valid **ipapi.co geolocation subscription key** in the same section. Use **Save geolocation key** independently, or supply both keys with Save and check provider. ipapi.co's no-key trial is intended for development/testing, not production deployment; packaged builds refuse trial fallback. Check each service's current terms, quota and pricing. No subscription purchase is performed by Phantom.
4. Country inventory is based on the first 500 valid public-IPv4 direct endpoints; a truncated inventory is explicitly labelled. Requests have finite timeout, response-size and page limits. A plan without usable direct endpoints cannot produce a working country connection. A future adapter can implement the small `ProxyProvider` interface; only Webshare is implemented now.

## Ordinary creation

1. Click **Create profile**. Accept the generated name or enter one.
2. Select **Desired country** from the offline country/territory list. Provider availability is checked separately; an unavailable provider does not remove country choices or silently choose direct.
3. Selection automatically connects. **Retry connection / Connect country** can repeat the attempt. Phantom obtains an endpoint and its credentials through Webshare, stores proxy credentials with DPAPI, and makes a separate actual Chromium request through that proxy to the fixed HTTPS location service.
4. Check the status. **Connected** requires a valid observed IP, country, timezone and language. Requested and observed countries must match before country creation is enabled. An IP-geolocation observation is approximate, not GPS or leak certification. A provider's country label alone does not pass this test.
5. Click **Create profile** or **Create and launch**. Locale/timezone derive from observed data. Stable supported defaults are viewport 1280×800, screen 1920×1080 and DPR 1. Geolocation permission is denied by default; no GPS coordinates are invented. WebRTC stays at native default, not an unverified privacy setting.

**Advanced Settings** contains deliberate locale/timezone overrides and a startup URL. **Open full advanced profile setup** preserves the existing manual proxy/browser/startup/tag/group controls. Existing edit uses the full editor and preserves the requested country/managed-launch flag. Overrides are allowed even if they differ from the detected location; Phantom does not silently rewrite them on future launches.

**No proxy — use my own connection** is explicit direct mode. Websites see your normal IP; no alternate country is configured or verified. This mode requires no provider account. Direct mode still works on existing profiles without adding provider metadata or changing saved browser preferences.

## Connection states and recovery

- **Not configured / authentication required:** configure the provider token in Settings. An expired API token or inaccessible plan does not generate an endpoint.
- **Connecting:** a real provider/connection operation is in progress. No saved setting is treated as proof of connection.
- **Connected:** the latest actual probe passed country comparison. The checked timestamp and observed IP/country are shown. A prepared result is usable for creation for five minutes.
- **Connection failed:** reachability, transport or cleanup failed. Check credentials, traffic/plan availability and retry. Some transport errors cannot conclusively identify authentication; do not infer that an unspecified failure proves password rejection.
- **Authentication required:** real HTTP 407 / Chromium proxy-auth evidence identifies rejected endpoint credentials. Provider and geolocation API authentication errors are also explained separately.
- **Location mismatch:** observed country differs from requested country. Do not create/launch the country-managed profile; retry or select a different endpoint.
- **Location unavailable:** the lookup is incomplete, rate-limited or production licensing/key setup is missing. It is not marked Connected.

The profile list shows connection state and observed IP/country. Click profile name → **Proxy** for full observed status, **Retry location test** and **Replace country endpoint**. Replacement selects a different endpoint already in your plan; it does not buy or provision a new one. Stop the profile before replacing. Failure leaves the old profile-to-proxy relationship intact. Successful replacement changes only the relationship; cookies, browser preferences and user overrides remain untouched. If your plan has only one endpoint in that country, no replacement is invented; retry the existing connection or update your subscription inventory. Prepared/failed endpoints remain visible in Proxy Manager for inspection/deletion after unassignment.

Country-managed launches re-probe the assigned route and requested country before opening the persistent browser. Failure preserves data and records a safe error, never Running. Legacy/direct/manual profiles are not forced through this new external dependency. Static direct endpoints are the supported model; the observation is not a guarantee that any provider can never change routing between requests.

## Data safety

SQLite upgrades from v1 to v2 by adding a provider-secret table. Existing v1 databases are copied to a uniquely named `*.pre-v2-*.bak` before migration. Profile/proxy rows, directories, sessions and existing configuration are not rewritten. New metadata has defaults for old JSON records. Preserve the original database and backup if startup reports a migration problem. Do not delete profile storage to repair a provider outage. Newer incompatible database versions fail closed.

Removing API keys does not erase existing profiles or encrypted endpoint credentials. Reconnection/inventory requests need the provider token; launch checks need the location service key in packaged builds. Backups exclude provider keys and proxy passwords. A restored country-managed profile has no proxy credentials/assignment and must be reconnected before launch; it never silently falls back to direct. OS-bound Chromium cookies retain their existing portability limits.

## Verified vs unverified

See `GOLOGIN_PARITY_REPORT.md` for exact tests. Unit provider transports and synthetic geolocation fixtures are **not** live provider qualification. Actual controlled Chromium tests exercise authentication, route use, coherent settings, persistence and outage failure. No paid Webshare or ipapi.co account was supplied for a live acceptance test. Windows DPAPI and packaging passed exact-commit hosted CI; manual Windows 10/11 qualification remains outstanding.

## Identifying the fixed installer

Country/Location table and offline SVG flags ship in **0.2.0-dev.3**, setup filename `Phantom-Browser-Setup-0.2.0-dev.3-x64.exe`. Check the app sidebar version after installation. Earlier `0.2.0-dev.2` installs do not contain this fix. Download the exact feature-branch CI artifact identified in [COUNTRY_LOCATION_FIX_REPORT.md](COUNTRY_LOCATION_FIX_REPORT.md), not an older release asset. Existing direct profiles remain direct until you deliberately assign a proxy; Phantom cannot infer a missing country choice retroactively.
