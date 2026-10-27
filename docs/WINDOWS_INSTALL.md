> **Master-stage update:** Fresh master source9c0e9b3 has not produced a Windows installer or run hosted Windows tests. Historical installer/hash/results below apply only to old recorded source. New Windows10/11/DPAPI/install/signature qualification is pending; do not promote this source based on old assets.

> **New candidate:** 0.2.0-dev.2 fixes additional privacy/durability issues but is not published. See [remediation evidence](REMEDIATION_REPORT.md); do not confuse the older v0.2.0-dev.1 release with the new candidate.

> Published latest installer: v0.1.1. The development prerelease v0.2.0-dev.1 is also published after successful Linux/Windows Server 2025 CI run 40507389557, including DPAPI and installed-runtime tamper/repair. v0.1.1 remains latest stable. Manual consumer Windows 10/11 upgrade/uninstall checks remain pending.

# Windows installation

The intended end-user download is **one** `Phantom-Browser-Setup-0.1.1-x64.exe` from this repository's Releases page. It bundles the desktop application and Chromium; Node.js, Git and Playwright are not needed on the user's PC. Windows x64 is the supported target.

Release publication is gated by Linux checks, Windows browser and DPAPI tests, and a silent installation plus installed-browser smoke test. A configured workflow is not proof that a release has passed: check the actual Actions result and release assets.

1. Open https://github.com/emmanuellaisa00/phantom-browser/releases/latest
2. Under Assets, download the setup `.exe`, not the source-code ZIP.
3. Run setup, choose the installation directory, and launch Phantom Browser from Start or the desktop shortcut.
4. Create a profile and click Launch. Each profile stores its own browser data.

The installer is currently unsigned. SmartScreen may warn. Confirm the repository and optionally compare SHA256 with the release checksum. Do not turn off Windows security protections to run an untrusted download.

Profile data is stored under the application's Windows user-data directory, separate from installation files, and retained by uninstall. Keep backups before upgrades. Published v0.1.1 backups are **not encrypted**. The 0.2 development prerelease offers authenticated password-encrypted JWE, while legacy gzip remains unencrypted. Cookies protected by Windows may not transfer to another computer or user.

## Runtime provenance

Windows Chromium 156.0.8078.4 was downloaded from Playwright's HTTPS CDN and independently downloaded from Google's Chrome for Testing bucket. Both ZIP files matched SHA256 `220021ecfdad08c116fc71a153e65e3861ba841c531afc4f7acc7bd5d44b41db`. The checked-in Windows per-file manifest was generated from that archive, plus empty Playwright installation/validation markers. This establishes matching upstream delivery, not a third-party code audit or code signature.

## Verify a downloaded installer

Use PowerShell to compute the hash of the exact file you downloaded:

```powershell
Get-FileHash .\Phantom-Browser-Setup-0.1.1-x64.exe -Algorithm SHA256
```

Compare the complete value with that release's `.sha256` asset, not an older release's value. A matching checksum detects changed bytes; it is not a digital signature or proof that a compromised repository is trustworthy.

## v0.1.1 packaging gate

Build on Windows x64 with Node 24.22.0. `npm ci`, `npm run provision`, `npm run verify:runtime`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:runtime`, `npm run test:integration`, `npm run build`, `npm run test:desktop`, then `npm run dist:win`. The packaging command refuses other host platforms to avoid shipping Linux Chromium in a Windows EXE. The reviewed workflow installs the actual generated EXE and runs `npm run test:installed` with `PHANTOM_INSTALLED_EXE` set to its installed path, including runtime tampering/recovery. It uploads artifacts only; publication requires separate approval.

Windows 10/11 x64 are intended targets, not a claim that every version/driver is tested. User profiles remain in Electron's user-data directory through uninstall (`deleteAppDataOnUninstall: false`). Validate upgrades and profile persistence before release. No valid digital signature has been claimed or supplied.


## Development-branch upgrade checklist (not yet executed on Windows)

1. Close all profiles and application instances. Copy the whole user-data directory to a separate private location; verify the copy.
2. On isolated Windows 10 and Windows 11 x64 test machines, install the published v0.1.1, create disposable profiles, browse only controlled local pages, and record metadata/cookies/storage/history and file hashes.
3. Build the exact reviewed development commit on Windows through the read-only workflow. Compare installer/checksum bytes and inspect signature status; never claim a valid signature from a checksum.
4. Install the new setup over v0.1.1 without changing user-data location. Confirm profiles/settings/DPAPI credentials remain accessible, new additive defaults work, tabs restore when explicitly enabled, and two instances cannot share a directory.
5. Test encrypted/plain backup restore to new UUIDs, wrong-password rejection, bad proxy behavior, runtime tamper/repair, graceful exit and interrupted-start recovery. Verify no sensitive test data enters public artifacts.
6. Reinstall the same build; confirm storage remains. Uninstall; confirm app files are removed while the user-data directory and independently saved backups remain. Reinstall and verify profiles again.
7. App downgrade is not automatic: older strict schemas may reject newly saved JSON fields. Roll back only using a separate pre-upgrade app-data snapshot, with all browsers stopped. Do not overwrite current profiles to test a rollback.

Hosted CI covers the configured browser/desktop/DPAPI/installer-tamper tests, not all of these manual consumer-OS, UAC/SmartScreen, update and uninstall cases. An authorized workflow dispatch is not a successful result; record the actual run URL and counts before release.


## Installed fingerprint and interruption coverage

The expanded Windows workflow runs `npm run test:installed` against the actual NSIS-installed EXE. Besides the prior tamper/repair smoke test, it now diagnoses a controlled local page in the bundled profile browser, compares actual UA/headers/hints/preferences/canvas/audio across relaunch, and writes only controlled CI observations to an artifact. A separate test terminates the known spawned Electron process, restarts the installed app, verifies saved metadata and conservative lock recovery, and terminates an old Chromium process only after exact executable/launch-ID/profile-directory ownership checks. These tests are not substitutes for manual consumer upgrade/uninstall/driver/signature validation.

Final candidate run [40565021705](https://github.com/emmanuellaisa00/phantom-browser/actions/runs/40565021705) passed source browser/DPAPI tests and all three actual installed-app tests. Its independently checked installer SHA256 is `1cf8ac18c68abdaf8dd6cfd906159a384acf8777d560d86883d4c0a442853670`; see [verification JSON](REMEDIATION_VERIFICATION.json). This remains an unpublished candidate and does not complete the manual checklist above.
