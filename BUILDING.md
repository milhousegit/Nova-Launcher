# Building Nova Launcher

Use Windows 10/11 x64, Node.js 24 and npm. The root package builds the Electron app; `app/package.json` lists runtime dependencies.

1. Run `npm ci` in the repository root and `npm --prefix app ci`.
2. Run `npm --prefix tools ci` to install the standalone Node helper dependencies.
3. Run `node scripts/prepare-tools.cjs` to download the official Node.js 24.22.1 Windows x64 executable and Ludusavi 0.29.0 from their upstream releases. The script verifies Node against the official SHA-256 manifest. Inspect upstream provenance before redistribution.
4. Native Windows helpers and their source are included under `tools/` and `native/`. The Discord adapter uses the Discord Social SDK, which is distributed under Discord's terms rather than the application MIT license. Build changes to this adapter with the matching SDK and your application's public Client ID.
5. Run `npm test`, `npm run start`, and `npm run dist`.

The NSIS installer is written to `dist/nova-launcher-v0.1.exe`. Signing is not configured; use your own code-signing certificate for a signed distribution. Keep all runtime `data/`, profile sessions, tokens and `.env` files out of source control and installer inputs.

Store credentials are never build inputs. Tests use synthetic fixtures and do not log in to an account.

