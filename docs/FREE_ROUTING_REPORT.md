# Zero-account country routing — 0.2.0-dev.4

## What now works without user configuration

Choose a country in the ordinary creation form. With no paid provider configured,
Phantom first checks matching saved connections, otherwise automatically downloads
the pinned official Tor client, bootstraps a country-restricted public Tor route,
and verifies its actual exit IP/country over HTTPS. Only a successful matching
observation enables profile creation. No Webshare token or ipapi.co key is required.

This is **Free Tor**, not a free residential or dedicated proxy service. Exits are
shared, can be slow/blocked, and some countries have no usable exit. No direct
fallback is substituted on failure. Chromium over Tor is **not Tor Browser** and
is not an anonymity, fingerprint or leak-prevention certification.

## Implementation and security

- Tor expert bundle 15.0.26 / Tor 0.4.9.14, Windows x64 and Linux x64. On-demand
  official download: about 22/31 MiB respectively. The NSIS installer does not
  redistribute these binaries or require manual Tor setup. App-local download,
  no admin rights or operating-system proxy changes.
- Upstream signed checksums verified during implementation with Tor Browser
  Developers primary fingerprint `EF6E286DDA85EA2A4BA7DE684E2C6E8793298290`, signing
  subkey `022DA248432D2A0E0F54E65E316C1FACD62D07D9`; GPG returned GOODSIG/VALIDSIG.
  Signed checksum files are preserved under `docs/free-routing/`. Client downloads
  validate the pinned SHA-256, enforce a 64 MiB limit/60s timeout/no redirects,
  extract only pinned regular files (no links/arbitrary paths), and verify every
  runtime file before executing. No client-generated replacement trust hashes.
- Owned local Tor processes, loopback SOCKS5, maximum three country routes;
  bounded bootstrap, owned-process cleanup, parent-process death monitoring,
  idle-route eviction, no adoption/killing of unrelated system Tor instances.
- Saved Tor assignment survives restart; ensure/re-probe restores the local
  daemon/port before browser launch. Existing profile directories/cookies and
  manual settings are preserved. Replacing shared routes requires stopping users
  of that route. A new circuit may still choose the same public exit.
- Keyless `country.is` is the production default. Its official documentation
  permits free commercial use without keys (infrastructure rate limiting applies).
  Cloudflare's Tor marker **T1 is not a country**: validate the observed public IP,
  then explicitly look up that same IP; reject changed/private/invalid IPs and
  unknown responses. Never render T1 as a verified flag.
- Ignore optional legacy ipapi keys for Free Tor. Optional paid credentials remain
  encrypted and under Advanced settings. No secrets embedded or plaintext fallback.
- New Free Tor profiles request Chromium's non-proxied UDP restriction (not a
  no-leak guarantee). Locale is inferred from detected country when the lookup
  supplies no language; timezone is observed where available, otherwise device
  timezone is retained explicitly. GPS is not invented and remains denied.

## Actual verification

A live Linux test used the actual application Service, automatically installed
Tor, actual bundled Chromium and live HTTPS country.is — **no mocks or account
keys**. Requested Germany, observed Germany/Europe-Berlin, created a SOCKS5
Free Tor profile, launched the persistent browser and reached public HTTPS.
Provider-secrets table had zero rows. Public IP was deliberately omitted from
published evidence. See `FREE_ROUTING_LIVE_LINUX.json`.

Focused tests cover modified/partial runtimes, unsupported platforms, country/path
injection, shutdown, zero-account creation, saved manual connections, T1 explicit
lookup/mismatched IP rejection, optional-key non-use, and no direct fallback.
Existing provider/browser/desktop/security tests remain. A new **strict live
installed-Windows test** exercises the actual form, automatic Tor download,
verified Germany, persisted assignment, actual browser launch/public HTTPS and
zero stored credentials. Its extended timeout is confined to this new live test;
legacy tests are not relaxed. Final CI/installer evidence follows after execution.

## Sources

- https://download.torproject.org/tor/ — official stable bundle/platform/version.
- https://dist.torproject.org/torbrowser/15.0.26/sha256sums-signed-build.txt
- https://country.is/ — keyless/commercial allowance, API/errors and lookup fields.

Production availability is not guaranteed by the public Tor network or keyless
lookup service. No payments, accounts, private endpoints or services were created.
