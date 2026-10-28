# Core workflow parity audit — 2026-10-28

Baseline inspected: premium source fda0ddb; Electron 45, Playwright 1.64.1, pinned Chromium 156.0.8078.4; shared strict schemas, SQLite JSON records, Service lifecycle/proxy/backup/automation, DPAPI, preload IPC, React wizard and integration fixtures. No existing provider SDK, provider account integration, or observed IP-country service exists. Proxy region/provider labels are not detected locations. Existing Create is a four-step technical wizard.

## Official documentation reviewed before implementation

- GoLogin creation: https://gologin.com/docs/creating-and-managing-profiles — recommended defaults and optional proxies.
- GoLogin built-in country selection: https://gologin.com/docs/proxy/gologin-proxies/gologin-proxy-management/adding-your-first-proxy — selecting a country obtains an endpoint from purchased/available traffic, not from country metadata alone.
- GoLogin settings: https://support.gologin.com/en/articles/14854406-profile-settings — proxy/direct modes, IP-derived timezone/geolocation, profile extensions, fingerprint generation.
- GoLogin advanced settings: https://support.gologin.com/en/articles/14854407-advanced-profile-settings — IP-derived language, DNS/WebRTC limitations.
- GoLogin documented API: https://gologin.com/docs/api-reference/profile/create-profile-with-partial-parameters — defaults/partial creation, storage, extensions and fingerprint fields.
- Webshare official proxy list and authentication/response format: https://apidocs.webshare.io/proxy-list and https://apidocs.webshare.io/proxy-list/list . Chosen because direct endpoints, per-endpoint credentials, country metadata and country filtering are documented. Only existing **direct-mode proxy lists** are in initial scope, not rotating residential/backbone plans, purchases or billing mutations. Uses account's default plan. Country inventory is bounded to 500 endpoints and explicitly labelled.
- ipapi.co official API: https://ipapi.co/api/ — HTTPS client-IP country/timezone/languages; errors/rate limits are not location success. IP geolocation is approximate, not GPS or independent leak certification.

## Baseline feature matrix and implementation priorities

| Capability | Baseline Phantom | GoLogin documented equivalent / next action |
|---|---|---|
| Simple name + country creation | Missing | P0: short default dialog; technical wizard only Advanced |
| Provider-backed country choice | Missing; manual proxies only | P0: secure Webshare direct-list adapter; actual available countries; external account required |
| Connection / observed location status | IP-only explicit probe; labels not verified | P0: real proxied HTTPS IP-geolocation probe; structured state, mismatch, retry/replacement |
| Automatic coherent preferences | Manual preferences, UTC default | P0: observed timezone and language; bounded stable desktop screen/DPR; block geolocation unless explicit override; no fake coordinates |
| Create/edit/duplicate/delete/archive | Implemented | Preserve existing Service and guarded lifecycle |
| Persistent storage/cookies/session | Implemented isolated directories | Preserve; backup/import OS-cookie portability caveats |
| Launch/stop/recovery/concurrency | Implemented | Preserve; location-managed launch gate must fail closed on invalid verification |
| Manual proxy import/edit/test/assign | Implemented HTTP/HTTPS/unauth SOCKS5 | Preserve Advanced route; provider result is not inferred from save |
| Startup URLs/homepage/session restore | Implemented | Preserve Advanced settings |
| Organization | Tags/search/group labels/archive | Partial: no hierarchical/team folders |
| Profile export/import | Encrypted JWE or legacy gzip | Implemented Phantom format; no GoLogin proprietary data import |
| Diagnostics | Actual preferences/native surface observations | Partial: no full native anti-detect fingerprint engine |
| Automation/API | Bounded explicit task runner; authorized desktop IPC | Partial: no cloud REST API/SDK server; keep local boundary |
| Extensions | Persistent browser can retain supported installs; no managed installer | Partial, browser/channel-dependent; no new fake extension controls |
| Cookie editor/import API | No standalone editor; browser persistent storage/backups | Partial; no undocumented cookie migration/portability promises |
| Native graphics/font/hardware fingerprint generation | Unsupported in current engine | Engine gap; not solvable with cosmetic form fields |
| Cloud/team sharing/bundled proxy traffic | External/service dependent | Outside local-core scope; no fake subscriptions |

## Engine decision

Retain current pinned engine and launcher for working lifecycle compatibility. Supported context options already cover locale/timezone/viewport/screen/DPR/geolocation consent; no evidence supports GoLogin-equivalent native identity mutation. Existing `MASTER_ENGINE_DECISION.md` evaluates maintained Camoufox, CloakBrowser, ungoogled Chromium and Rebrowser library patches, including licensing/distribution and integration risks. Camoufox requires a Firefox/Playwright compatibility qualification; CloakBrowser binary licensing differs from its wrapper and needs permission/commercial review; library patches are not native identity engines. No unqualified binary will be substituted in a provider/workflow patch. Existing pin is behind the previously audited upstream stable patch and needs a separate verified-runtime update. No undetectability/no-leak parity claim.

## Safety plan

Add SQLite v2 provider-secret table with a pre-v2 backup for existing databases, preserving profile/proxy rows. Default new optional profile/location fields; never rewrite old profile configs. Reuse DPAPI seal/open and proxySave. Fixed provider/geo HTTPS endpoints, bounded time/bytes/pagination, no authenticated redirects, strict response schemas and safe errors. Renderer receives only country inventory, safe status and proxy IDs—never API tokens or endpoint passwords. Test doubles explicitly labelled, plus real controlled Chromium proxy tests and actual Electron flow; no live Webshare account is supplied, so paid-provider qualification remains unverified.

## Follow-up source checks during implementation

Re-read official Playwright extension guidance at https://playwright.dev/docs/chrome-extensions : persistent Chromium contexts and side-load args are supported, with channel/browser restrictions; a managed extension installer is an application gap, not an assertion that Chromium cannot support extensions. Rechecked https://raw.githubusercontent.com/daijro/camoufox/main/README.md (under-development/production suitability warning) and https://raw.githubusercontent.com/CloakHQ/cloakbrowser/main/BINARY-LICENSE.md (v1.3: redistribution/repackaging requires a separate license; latest-major subscription terms). No candidate binary was substituted or qualified.

ipapi.co official pricing/FAQ https://ipapi.co/ describes the no-key tier as a development/testing trial, not production deployment. Accordingly a separate DPAPI-protected geolocation key is supported and packaged production builds refuse unlicensed trial fallback.
