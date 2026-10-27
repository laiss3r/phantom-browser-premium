> **Master-stage update:** New source is not the old green-CI installer. See MASTER_UPGRADE_REPORT.md for exact source and fresh Windows blockers. Invalid proxy Host must omit scheme/port; bracketed IPv6 is normalized once. Diagnostics fail privately after six seconds and reject stale results after stop. Stopping is now a real displayed state. Requested UDP policy is experimental and does not block tested loopback STUN.

# Troubleshooting without losing profiles

## Browser lock / recovery required

Stop the profile normally first. Unknown exit, invalid metadata, live old manager/browser, PID reuse or changed lock ownership is **not** permission to delete a lock. The app intentionally has no arbitrary-PID killer or force-unlock button. Preserve app data, close known Phantom instances, inspect the exact user-data directory and command line/birth identity, and ask for ownership review. A PID alone is insufficient. A real dead-manager/live-Chromium test verifies that the lock remains while the owned browser lives; installed-app interruption tests cover actual Electron restart behavior on Windows CI.

Shutdown has bounded waits and reports failed closes; it may retain a lock rather than falsely report successful cleanup. Repeated shutdown is idempotent. A stopped-looking old profile with a retained lock should show a recovery error, not be treated as a cleanly reusable directory.

## Runtime integrity failure

Do not generate new trusted hashes from the failing runtime or disable verification. Re-provision/repair using the exact reviewed application/runtime pair and [documented procedure](RUNTIME_UPDATES.md). Missing, modified or extra files/directories—including empty unexpected directories—fail closed. Do not put profiles, extensions or unrelated files beside the bundled executable. Preserve user-data separately before reinstalling.

## Proxy failure

Saved is not connected. Test the assigned proxy explicitly. Check protocol/host/port and provider requirements; update credentials only after stopping assigned profiles. DPAPI failures have no plaintext fallback; SOCKS5 authentication is unsupported and rejected. A plain HTTP proxy does not encrypt Basic authentication on that transport. Untrusted HTTPS proxy certificates fail; no certificate-warning bypass is supplied. See [proxy limits](PROXY_LIMITATIONS.md).

A successful IP check or local ICE summary is not a DNS/WebRTC no-leak certificate. Public leak verification requires additional infrastructure and environment-specific tests.

## Fingerprint mismatch or unavailable APIs

Prefer native UA. Custom UA must match native desktop OS, x64 runtime and exact/reduced bundled version. No cross-OS, mobile or arbitrary browser-brand emulation is supported. Launch on a controlled secure origin before diagnosing; permission policy, insecure context, GPU/driver differences and blocked APIs may produce unavailable fields. Null does not mean spoofing succeeded. Canvas/audio hashes may change after updates/drivers. See [capability boundaries](FINGERPRINT_CAPABILITIES.md).

## Reports and screenshots

Raw selectors, URLs, titles, inputs and exceptions are deliberately omitted from persisted reports. Screenshot actions save **fully opaque derivatives**, not readable content screenshots. Published v0.2.0-dev.1 used DOM-bound masking that could expose fixed-position content; the development fix redacts every output pixel independently of page layout. Treat old report PNGs as potentially sensitive and review/store them privately; do not delete user reports automatically. A report-write failure is reported explicitly and must not be called a successfully saved report.

## Storage or backup error

Preserve the app-data directory, free space and verify Windows permissions. New DB durability tests ensure a failed disk/rename commit rolls memory back and removes only its own partial file. JWE wrong-password/tamper errors occur before any destination is created. Never overwrite a profile to force an import; restores create new UUIDs. There is no backup password recovery, universal cookie portability or automatic downgrade safety. See [backup guide](BACKUP_RESTORE.md).

## CI vs installed app

A source/helper test is not a packaged-browser test. Check the exact commit's Windows build, real setup installation and installed-fingerprint evidence. A hosted Windows Server runner is not manual Windows 10/11 upgrade/uninstall, SmartScreen/UAC, all hardware or a valid digital signature. No new release is published by CI automatically.
