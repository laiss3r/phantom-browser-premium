# Local diagnostic privacy hardening

## Scope

This work improves legitimate local privacy and diagnostic transparency. It does
not add identity spoofing, country/eligibility bypass, anti-fraud evasion, stealth
patches, randomized fingerprints or claims of GoLogin equivalence.

## Implemented

New diagnostic history records omit both configured and observed precise
geolocation coordinates and canvas/audio sample hashes. The live result still
shows what the browser actually measured; the configured profile and real browser
behavior are untouched. History includes explicit redaction metadata, measured
statuses, inconsistency warnings and limits. Omitting a stored value does not mean
it was blocked, unavailable or masked in the browser.

Existing diagnostic rows, cookies, sessions, proxy assignments, profile settings
and databases are not rewritten or deleted. Other diagnostic fields can still
identify a device. This is data minimization, not anonymization or encryption.
There are no new third-party endpoints, tracking calls or permissions.

## Verification

- Dedicated regressions check sensitive-value omission, non-mutation, unavailable
  measurements, and preservation of measured status and warnings.
- An actual Service/database test stubs the browser measurement explicitly,
  compares the live result with persisted history, and verifies redaction.
- These are controlled tests, not proof of browser masking or external leak safety.
- Exact final local test counts and packaging status are recorded in the handoff.

## Next legitimate work

- Expand observable support/partial/unsupported labels, not marketing parameter
  counts. Distinguish unmeasured from verified everywhere.
- Qualify existing profile isolation/permissions in actual Chromium and Windows.
- Review the pinned Chromium security-patch gap before production use.

No Windows installer or new anti-detect engine is delivered by this change.

## Local handoff (2026-10-29)

Strict TypeScript, ESLint, build and **179 unit tests across 20 files pass**,
including the five new privacy regressions. No new live Chromium, Electron or
installed-Windows qualification was run for this patch. Earlier dev.4 network
and installer evidence must not be treated as proof of this patch.
