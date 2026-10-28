# Premium typography and new development repository

Date: 2026-10-28. New public development home: https://github.com/laiss3r/phantom-browser-premium . The user explicitly authorized creating this repository and importing the project. The original repository and published releases are not modified. Historical audit/release documents retain their original commit-scoped results; their old authentication-blocker notes are historical, not the delivery status of this new import.

## Typography changes

- Self-hosted **Inter Variable**, weight range 100–900, optical sizing, conservative character features and platform fallbacks. No Google Fonts/CDN/network dependency or new npm dependency.
- Refined heading hierarchy and tracking; modestly larger forms, table labels and secondary text; consistent medium/semibold emphasis rather than widespread tiny captions.
- Tabular numerals for resource metrics and tables; native monospace remains for code/diagnostics. Existing dark palette and navigation architecture retained.
- Isolated `src/renderer/typography.css` layer after existing styles for maintainability. No service, database, runtime, fingerprint or credential behavior changes.
- Font provenance pinned in `src/renderer/fonts/PROVENANCE.json`, including source revision and SHA-256. Original SIL Open Font License 1.1 retained beside the font and copied through Vite's public assets to `app/renderer/licenses/Inter-OFL.txt`, included in the Electron package. `npm run licenses` lists the font explicitly. Font name is a CSS alias only; the upstream binary is unmodified.

The bundled UI font does **not** change browser-profile fonts or native fingerprint surfaces.

## Verification performed locally

- Node 24.22.0; `npm ci`.
- Typecheck and lint: passed.
- Unit suite: **121 passed / 16 files**, including new pinned font hash/license/WOFF2/local-only CSS assertions.
- Production build: passed; hashed font asset and font license present in renderer output.
- Actual Electron desktop suite with Xvfb: **6 passed, 1 existing Windows DPAPI-only skip**. Original IPC/restart/CRUD/security/wizard/archive/JWE/import/assignment/failure tests retained. New test turns the browser context offline, loads the actual bundled face, verifies document/headings use it, checks numeric alignment and rejects external font-resource requests.
- Real screenshots: [premium dashboard](premium-dashboard.png), [profile wizard](premium-profile-wizard.png). Existing beginner screenshots refreshed with the new typography. Synthetic data only.

This typography task does not claim a new local browser-network suite run, actual Windows DPAPI validation, installer signature verification or manual Windows installation qualification. GitHub Actions results must be checked against the new repository's exact pushed commit. A green Linux desktop test is not Windows qualification.

## Source import boundaries

Publish the tracked application source, complete ancestry of the imported development branch, tests, pinned runtime manifests, existing documentation, synthetic screenshots and licensed font assets. Do not publish tokens, local profile data, cookies, `node_modules`, downloaded browser binaries, generated builds, temporary test output or workspace credentials. Runtime provisioning remains reproducible through existing scripts. No original release tags/assets are republished.
