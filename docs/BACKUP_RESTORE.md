> **Master-stage update:** Authenticated encrypted backups do not protect a currently running compromised browser/session or OS/JavaScript memory. Newly derived stopping state is supported by this development schema; use separate pre-upgrade data copies rather than forcing an older strict app to read newer saved data.

# Backup and restoration guide

Stop the profile and wait for pending work before backup, duplicate or edit. Browser profile contents can grant account access. Protect the application-data directory and backups independently of the installer.

## Export

1. Select a stopped profile in Backups (or its profile action menu).
2. Keep **Password-encrypted JWE** selected for authenticated encryption; use a strong unique 12–1024-character password and confirm it. Store it separately: there is no recovery or saved password.
3. Confirm the sensitive-session warning and choose the archive location in the native file dialog.
4. Record the SHA256 shown in backup history. The hash detects changed bytes but is not a signature/author identity.

The maintained pinned `jose` library/WebCrypto implements standard compact JWE with PBES2-HS512+A256KW, 310,000 iterations and A256GCM. Salt/IV construction and cryptographic primitives are delegated to the library. Encryption protects archive contents, not filename, size, local backup-history metadata, OS memory/swap or a compromised account.

Deselecting encryption produces legacy `.gz`. **Gzip is compression, not encryption.** Proxy credential storage and assignments are excluded in both formats. User-entered notes/URLs and native Chromium state can still contain sensitive data.

## Restore

Choose encrypted/legacy format explicitly and supply the password for JWE. Wrong-password/tampered/unsupported encrypted content is rejected **before** decompression or profile creation. A plaintext archive cannot silently be treated as password-protected. All validated restores create a fresh UUID/directory; existing profiles are not overwritten.

Names, canonical base64, SHA256/size/count, parent/file collisions, normalized duplicate paths, symlinks/reserved paths and unsupported file types are checked before writes. Partial destination profiles are removed on failure. Limits: 400 MiB input/expanded JSON, 256 MiB decoded files, 64 MiB per file, 50,000 files. JWE's base64 overhead counts against the input cap; the implementation is memory-bounded, not a streaming large-profile archive service.

An archive that declares a **newer Chromium major** is now rejected to avoid silently opening newer browser data with an older engine. Older/unknown engine formats still require manual compatibility checks; a string comparison does not certify native SQLite/cookie/extension compatibility. Chromium cookies can be bound to the original Windows account/machine. Cross-device cookie decryption is not guaranteed.

## Upgrade and rollback

Before installing a development candidate, stop all browsers and privately copy the entire user-data directory to a separate location. Newly saved JSON fields can be unreadable by older strict app versions. App/browser downgrade must use a separate pre-upgrade data copy; never have two versions use the same directory concurrently. See [runtime update/rollback](RUNTIME_UPDATES.md) and [Windows checklist](WINDOWS_INSTALL.md).

Database write failures must not leave changes in memory that a later close can resurrect. The new durability regression suite verifies memory rollback, unchanged disk data, created-directory cleanup and exclusive temporary-file cleanup when persistence/atomic rename fails.
