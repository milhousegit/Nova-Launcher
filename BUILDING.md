# Building Nova Launcher

Use Windows 10/11 x64, Node.js 24 and npm. The root package builds the Electron app; `app/package.json` lists runtime dependencies.

1. Run `npm ci` in the repository root and `npm --prefix app ci`.
2. Run `npm --prefix tools ci` to install the standalone Node helper dependencies.
3. Run `node scripts/prepare-tools.cjs` to download the official Node.js 24.22.1 Windows x64 executable and Ludusavi 0.29.0 from their upstream releases. The script verifies Node against the official SHA-256 manifest. Inspect upstream provenance before redistribution.
4. Native Windows helpers and their source are included under `tools/` and `native/`. The Discord adapter uses the Discord Social SDK, which is distributed under Discord's terms rather than the application MIT license. Build changes to this adapter with the matching SDK and your application's public Client ID.
5. Run `npm test`, `npm run start`, and `npm run dist`.

The NSIS installer is written to `dist/nova-launcher-v0.1.1.exe`. Signing is not configured; use your own code-signing certificate for a signed distribution. Keep all runtime `data/`, profile sessions, tokens and `.env` files out of source control and installer inputs.

Store credentials are never build inputs. Tests use synthetic fixtures and do not log in to an account.



## Linux AppImage preview (x86_64)

Use Node.js 24 on Linux x86_64:

```sh
npm ci
npm --prefix app ci
npm test
npm run dist:linux
```

The artifact is `dist/nova-launcher-v0.1.6-linux-x86_64.AppImage`.
Make it executable with `chmod +x` before launching. Systems without FUSE can use
`./nova-launcher-v0.1.6-linux-x86_64.AppImage --appimage-extract-and-run`.
Windows helper binaries are excluded from Linux packages. This is an experimental
Linux build: local Windows store discovery, Discord native adapter, Wi-Fi,
Bluetooth, Steam firewall controls and AnyFSE are not ported. Account credential
storage needs a supported Linux desktop keyring; plaintext fallback is not enabled.
Headless startup validates the account gate, not real store sign-in or game launch.
Apply the artwork credentials database migration before testing key synchronization.

## Personal profile (shared EXE / AppImage implementation)

The Profile navigation item and Settings → Profile and feed use the same renderer
and main-process handlers on Windows and Linux. Name, bio, PNG avatar/banner,
profile links, visibility and a bounded activity journal sync in the existing
owner-scoped Nova profile payload; no additional database migration is required
for these profile fields. Store login sessions are not part of this payload.

The first library observation establishes a baseline. Subsequent library additions,
wishlist additions and newly observed unlocked achievements create feed entries.
Disabled feed categories do not collect new entries; hiding a category filters its
existing entries. The journal retains up to 200 events and displays the latest 50.
Profile data is private to the signed-in Nova account, not a public social page.

Reset name/images, clear feed and reset personal profile each require typing RESET.
These actions preserve the account, store sessions, installed games, library and
wishlist. Reset cutoffs are merged across devices so old feed entries are not
reintroduced by a stale device. Previously hidden journal data is not claimed to
be deleted from backups. Currently playing reflects local process detection:
Windows uses the existing process provider, Linux reads accessible /proc executable
paths. Proton/Wine launchers or inaccessible processes may prevent detection.

Validation: `node tests/personal-profile.cjs` (also included in `npm test`).
