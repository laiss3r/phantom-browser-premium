# Phantom Browser: first session

Phantom stores everything locally. No account or subscription is required. A **profile** is a separate browser-data directory: its sign-ins, cookies and site storage do not belong to your other profiles. This is not a promise of anonymity or GoLogin fingerprint equivalence.

## Short default creation

The ordinary dialog is now **name → country → Connect country → Create/Create and launch**. Configure a real provider account and production geolocation key once in Settings; follow the [country setup guide](LOCATION_SETUP.md). Direct mode is explicit and needs no provider. Optional technical settings are under **Advanced Settings**.

## Full advanced setup (optional)

1. Select **Create profile** on Dashboard or Browser Profiles, expand **Advanced Settings**, then **Open full advanced profile setup**. A unique suggested name is filled in. Change it if you like; description, tags, notes and a group label are optional. Groups are searchable labels, not movable filesystem folders.
2. **Basics:** optionally set a homepage or up to ten startup URLs, one per line. Restore-session behavior takes priority when an existing session is available. Otherwise startup URLs, then legacy Launch URL, then homepage determine startup.
3. **Browser preferences:** keep native defaults unless you need a locale/timezone for testing. Expand **Advanced browser settings** for viewport, screen, DPR, color/motion, WebRTC policy, custom UA and explicit geolocation consent. Phantom cannot change your real desktop operating system or native hardware identity. A custom UA must match the bundled Chromium major and desktop OS.
4. **Proxy connection:** direct connection is valid. Alternatively select an existing proxy or choose **Add a new proxy**, save it, then **Test selected proxy**. Saving alone does not test connectivity. The test performs a real public-IP request; country detection is not implemented.
5. **Review:** choose **Create profile**, then Launch from the list; or **Create and launch** to save and launch immediately. A failed launch keeps the saved profile/data and shows an error, never a successful running state. You can also save native defaults early without completing every step.

The dashboard supports search (including tags/groups), status and connection filters, sorting, selection and bulk actions. Browser Profiles has the full paginated list and archive filter. Click a profile name for details. The dashboard shows at most ten matching workspaces; use **View all profiles** for the rest.

## Manage connections

**Proxy Manager** supports add/edit, real Test and sequential **Test all proxies**, import, assignment and deletion. Endpoint, protocol, protected-credential indicator, assignment count and last test result/time are shown. Connected results include the actual observed public IP, not a predicted location. Provider/region fields are your labels, not verified geolocation. Do not put passwords or access tokens in names, notes, region or provider labels.

Supported: HTTP, HTTPS and **unauthenticated SOCKS5**. Chromium does not support authenticated SOCKS5 here. Obtain real endpoints from your own trusted provider; Phantom sells none.

### Batch import

Paste into **Import proxies…**, or select a UTF-8 text file up to 64 KiB. At most 100 physical lines are accepted. These are **syntax examples only**, not usable services:

```text
proxy.example:8080
proxy.example:8080:your-username:your-password
https://your-username:your-password@proxy.example:443
socks5://[::1]:1080
```

Preview shows only protocol/endpoint and whether credentials are present; invalid lines have safe line-numbered errors. Pasted secrets are still visible in the editor, so close it when finished. Blank lines are ignored. Every nonblank line must validate before import is enabled. The main process validates again and saves the entire batch in one transaction; invalid input, encryption or storage failure saves nothing. Windows DPAPI must be available to import or save credentials—there is no plaintext fallback on Linux/macOS.

On proxy edit, blank credential fields **retain** existing protected credentials. Use **Remove existing credentials** to clear them explicitly. After changing endpoint or credentials, the previous test is reset: test again.

## Assign, replace or remove a proxy

Click **Assign** in Proxy Manager to choose a profile. Or click a profile’s **Proxy** button / profile name → **Proxy** tab, select a connection and choose **Save assignment**. Choose **No proxy (direct)** and save to remove it. Test assigned proxy operates on the saved relationship, not an unsaved selection.

Changes apply to **subsequent launches**. Stop the profile before changing its connection or editing a shared proxy. If multiple profiles use a proxy, editing it affects every assigned profile on their next launch. Assignment changes only the connection relationship: it does not reset session data, browser preferences, notes or tags. Unassign all profiles before deleting a proxy; deletion also needs native confirmation.

## Profile details and sessions

The details window separates Overview, Proxy, Browser configuration, Cookies & session, Startup URLs, Automation, and Activity & diagnostics. Configuration displays saved intent, not proof that every site observes it. Launch and run **Fingerprint Diagnostics** to see actual observations; graphics/fonts/hardware identities remain native/diagnostic only. The activity tab provides last use and stored diagnostic results, not a full historical event timeline.

- **Show browser tab** calls Playwright’s tab bring-to-front. OS foreground-window activation is not guaranteed.
- **Stop** closes the managed browser using the existing clean-shutdown path.
- **Archive** removes a profile from the active list without deleting its data. Use Browser Profiles → Archived profiles → Unarchive to return it.
- **Duplicate** uses the existing stopped-profile copy path. Stop before editing, copying, backing up or deleting.
- **Export…** offers password-encrypted JWE backups; keep the password separately. Legacy gzip is not encrypted. Backups exclude proxy credentials, and Windows-encrypted browser cookies may remain tied to the original OS account/machine. Restore creates a new profile.
- Cookie values are not shown or edited in this app. Use browser site controls; treat data folders and backups as sensitive authentication material.

## Troubleshooting

| Symptom | Next step |
|---|---|
| Proxy saved, but not connected | Run Test. Check endpoint/protocol/port, provider subscription, credentials and provider IP allowlisting. SOCKS5 must have no authentication. |
| Credential save/import fails | Use Windows with available DPAPI under your own account. No plaintext fallback is permitted. |
| Profile launch fails | Read the actionable error; check assigned proxy, runtime verification and profile lock/recovery state. Do not erase the directory to make an error disappear. |
| Cannot edit or change a connection | Stop the profile first. For shared proxy edits, stop every assigned profile. |
| Desktop API unavailable | Open the Electron desktop app, not a standalone HTML/Vite preview. The preview does not simulate backend success. |
| Unexpected website language/location | Region labels do not configure or verify location. Set compatible locale/timezone deliberately; verify actual observations yourself. |

A successful connection test is **not** DNS/WebRTC leak certification. The experimental WebRTC policy is not a leak blocker. No native fingerprint spoofing or undetectability guarantee is provided.

## Screenshots from real desktop tests

Synthetic data only; these are actual Linux Electron screenshots, not design mockups or Windows qualification.

- [Dashboard](desktop-dashboard.png)
- [Browser preferences wizard](ux-browser-wizard.png)
- [Import preview](ux-proxy-import.png)
- [Profile connection details](ux-profile-details.png)
- [Review](ux-review.png)
- [Saved profile after failed launch](ux-launch-error.png)
