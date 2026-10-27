> Current master-stage findings/results: [fresh report](docs/MASTER_UPGRADE_REPORT.md). Diagnostics now have a six-second private-error boundary and stale-result guard; production proxy probes explicitly enable Chromium sandboxing. Controlled Linux STUN still sends loopback UDP with the requested policy and an HTTP proxy: **not a UDP firewall/no-leak promise**. Fresh Windows/security-patch qualification remains pending.

# Security policy and boundaries

Phantom Browser is a local-first profile manager, not a stealth or anonymity product. This repository has not received an independent penetration test or a complete third-party security audit. Do not disclose credentials, cookies or private profiles in public issues. Use GitHub private vulnerability reporting if enabled; otherwise ask the maintainer for a private contact without publishing exploit material or session data.

## Credentials and Electron

Production proxy secrets are encrypted only by Windows Electron `safeStorage` with its async encryption-availability check. On unsupported systems or unavailable encryption/decryption, credential operations fail closed. There is no production plaintext/AES fallback. The AES adapter in tests is test-only. SQLite queries are parameterized; profile metadata is not encrypted. Protect the Windows account and application-data directory.

The renderer uses context isolation, a sandbox, no Node integration and web security. A frozen preload bridge exposes only strict Zod-validated requests. Main-process IPC checks sender ID, exact trusted URL and main frame. External renderer navigation, new windows, webviews and permission requests are denied. No general shell, filesystem or arbitrary JavaScript IPC exists. CSP was not relaxed for this release.

## Runtime trust

Ordinary provisioning requires both checked-in archive SHA256 pins (`scripts/runtime-archives.json`) and the version/platform/architecture/file manifest. There is no auto-bootstrap or trust-on-first-download mode. Archives are bounded, hash-verified before ZIP extraction, inventory-validated, extracted in a new staging directory and file-verified before promotion. Missing/extra/changed files, extra directories, duplicate/case-colliding paths, symlinks, unexpected manifest fields and identity mismatches fail closed.

The same verifier runs before profile and proxy-test browser launches; packaged manifests are embedded in the main-process bundle. This costs disk I/O on each launch and intentionally avoids a stale verification cache. It is not a signature check and cannot defend against an attacker who can modify both the application and its trust data, an already compromised upstream, or all filesystem changes in the interval between checking and execution. Windows code signing and installer ACLs are separate defenses, not supplied by a checksum.

## Processes and locks

Locks carry Electron PID, actual Chromium PID when available, profile UUID and a unique launch ID. Launches pass an ownership marker to Chromium; OS inspection checks the marker, complete user-data-dir argument and executable path, and records process birth identity when available. PIDs alone never authorize termination. PID reuse/live-but-unrelated PIDs may conservatively block recovery rather than risk another process. There is no arbitrary OS PID-kill fallback.

Shutdown cancels starting launches, bounds graceful close, and retains locks/state when exit is unknown. Startup labels unresolved history `recovery_required` instead of claiming a live orphan exited. Unknown/malformed locks and inaccessible OS inspection require manual review. Do not delete locks while a browser might be using the profile. Before manual recovery: back up application data, close all Phantom instances and associated Chromium windows, verify the profile directory and processes in Windows tools, then have the maintainer review the lock. The app intentionally does not offer an unsafe one-click force-unlock.

## New unreleased remediation issues/fixes

Published v0.2.0-dev.1 automation screenshots mask only the HTML bounding box; fixed-position content can fall outside it and remain visible. A real-browser regression reproduced this. Treat existing reports as sensitive; no user reports are automatically deleted. The 0.2.0-dev.2 development fix captures only in memory, creates a bounded fully opaque same-size PNG derivative in the main process, clears the original buffer best-effort and writes no source pixels. This is **not a readable content screenshot**. It does not rely on untrusted page CSS/layout or pretend that a placeholder is a full screenshot.

Database transaction persistence could fail after SQL COMMIT while leaving changed memory that a later close saved. Reproduced create/edit failures now restore the pre-transaction database image and retain foreign-key enforcement; temporary writes use exclusive unique files and cleanup. Disk failure does not falsely create a durable profile or resurrect rejected changes.

Each automation step now has its own run/profile IDs and required duration. Changed lock ownership and rejected shutdown closes are reported while preserving conservative locks. New diagnostic native hashes are identifying data: keep app data private; no third-party fingerprint/ICE/DNS endpoint is contacted. HTTPS positive transport tests change certificate trust **only in disposable elevated Windows CI**, remove the exact temporary CA and add no production TLS bypass.

## Backups and reports

In published v0.1.1, backups are **gzip, not encryption**. This unreleased branch adds an opt-in/recommended authenticated compact-JWE option; legacy gzip remains unencrypted. Browser cookies, local storage and session databases can grant account access; store archives privately. Windows-bound cookies may not decrypt on another account or machine. Proxy assignments/credential storage are not exported. User-entered notes, launch URLs and browser-session files may still be sensitive; the application does not claim to find or scrub every secret a user intentionally stored in a profile.

The encrypted option uses maintained pinned `jose` 6.2.13 with WebCrypto, standard RFC 7516/7518 compact JWE, PBES2-HS512+A256KW (310,000 iterations, library-generated salt) and A256GCM. The authenticated content type identifies the gzip backup. Algorithms and PBES2 iteration count are allowlisted/bounded during decrypt; authentication must complete before decompression/creating a profile. Unique salt/IV generation is delegated to the library; no custom cipher, password hash or nonce construction is implemented. Use a strong unique 12–1024-character password; there is no recovery or stored backup password. Encoded key buffers are cleared best-effort, but JavaScript strings/GC, OS memory/swap and an already compromised account are not secure erasure boundaries. Passwords cross the isolated local IPC only when explicitly submitted; they are absent from snapshots/history/logs. Filename, file size and local backup-history metadata are not encrypted. Encryption is not a digital signature or proof of who created an archive.

Gzip manifest format v1 is retained inside either envelope. Limits: 400 MiB compressed input, 400 MiB decompressed JSON, 256 MiB total decoded files, 64 MiB per file, 50,000 files. Restore validates all names, base64, lengths and SHA256 hashes before creating a new UUID profile, rejects duplicate normalized paths and file/directory collisions, writes exclusive files and removes partial restores. Ordinary archives are not an authenticity/signature mechanism: an attacker who rewrites data and hashes can create a different valid archive.

Automation reports include every attempted step, safe timestamps/outcomes, monotonic per-step/total duration, run IDs and screenshot references. Raw errors, titles, selectors, URLs and fill values are omitted. New report screenshots are fully opaque derivatives generated outside page layout; they are intentionally not full-content screenshots. The earlier DOM-bound mask privacy issue is described above. Files use unique job IDs and restrictive permissions where supported. Report-write failures are explicitly reported. Windows permissions ultimately depend on the account/parent-directory ACLs, not POSIX modes alone.

## Proxies and diagnostics

HTTP/HTTPS proxy servers and unauthenticated SOCKS5 are supported subject to Chromium/platform behavior. SOCKS5 authentication is rejected, including retained credentials during protocol changes. Proxy tests have launch, credential, navigation and close bounds and make an intentional request to api.ipify.org; they are not telemetry. DNS resolution, WebRTC traffic routing and complete IP-leak prevention are not guaranteed. No WebRTC/DNS leak firewall is implemented. Test in your own network environment.

The development branch adds explicit geolocation grants (denied otherwise), native DPR and an optional documented Chromium non-proxied-UDP policy. That switch is not a leak firewall or leak certification. Local HTTP Basic/SOCKS5 transport and fail-closed behavior are integration-tested; HTTPS transport and external DNS/STUN/provider behavior are not yet verified. Region fields are user labels, not IP-derived evidence.

Diagnostics report observed browser values and configured mismatches. User agent, viewport, locale, timezone and motion settings do not guarantee a consistent hardware fingerprint, `webdriver: false`, anonymity or undetectability.

## Platform/release status

Windows 10/11 x64 is the intended installation target; current candidate verification status and actual CI environment are recorded in SECURITY_REMEDIATION.md. A hosted Windows Server runner is not proof of every Windows 10/11 configuration. Installers are unsigned unless an actual signature has been independently verified. Uninstall retains user profiles; back up data before upgrading. No release is published by the build workflow automatically.
