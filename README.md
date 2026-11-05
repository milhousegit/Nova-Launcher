# Nova Launcher

![Nova Launcher](app/assets/nova-wordmark.png)

A controller-first game launcher for Windows, with a cinematic console interface and a compact desktop library.

## Download

Version **0.1.8 is a local, unpublished preview**. Download the current stable **nova-launcher-v0.1.7.exe** from [Releases](https://github.com/milhousegit/Nova-Launcher/releases). Windows 10/11 x64 is required for the EXE. A Linux x86_64 AppImage preview is also available in the same release; see the release notes for platform limitations. English is the default interface language; Italian is available in Settings → Language.

This initial release is unsigned. Windows may display a publisher warning. Verify the SHA-256 checksum provided with the release before installing.

Visit [Nova Web](https://novalaunchergame.vercel.app) for the animated product home and your private cloud library.

## Features

- Automatic stable-release checks, verified installer downloads and release notes in Settings. Installation is initiated by the user.
- Purple default accent, extended Nova wordmark and matching application/favicon/fallback artwork.
- Private web friends list relayed from Nova on Windows; presence older than 90 seconds is marked as last activity.
- Console and desktop layouts, gamepad navigation, persistent focus, and on-screen keyboard options.
- Unified installed games and connected store libraries, source selection, favorites and search.
- Steam Guard QR sign-in with an encrypted local session, automatic session reuse and token renewal.
- Steam friends and achievements, merged Steam/Discord friend identities, and Hydra progress where supported.
- SteamGridDB artwork selection, portrait covers, background art, logos and a fullscreen screenshot gallery.
- Game news, achievements and metadata in the game page, with HowLongToBeat estimates when available.
- Personalized discovery, wishlist, release calendar, release countdowns and offer comparison links.
- Nova account synchronization for library metadata, preferences and online artwork.
- Console quick settings for sound, Wi-Fi and Bluetooth. Temporary Steam-only network blocking requires Windows administrator approval and ends when Nova closes.

## Accounts and data

Nova profile sign-in is required. Connect stores separately to retrieve their online libraries; otherwise only installed copies are eligible. Store session credentials are encrypted with Windows and remain on the current PC. They are not included in cloud synchronization. Sign in once per device; Steam can request another sign-in if the session expires or is revoked.

Runtime data is stored in `%APPDATA%\Nova Launcher`, outside the installation directory, and is preserved during upgrades and uninstall. No personal library, cached profile, credentials or game artwork is shipped with this repository or installer.

The default build uses the Nova Supabase project configured in `app/cloud.cjs`. Its publishable key is public by design; database access relies on owner-scoped row-level security. Fork maintainers should configure their own backend before distributing a fork.

## Current limitations

- This is an initial v0.1 release. Store services, privacy settings and SDK permissions affect available data.
- Recently acquired sorts verified acquisition dates, not detection or installation timestamps. Games without a date appear last. Steam dates require the authenticated license list; other stores may not provide them. Real-account date import still needs broader validation.
- Steam QR sign-in is implemented using community Steam protocol libraries; it is not an official Valve SDK integration. A Web API key remains a compatibility path for supported Steam API methods.
- Ubisoft achievements are not yet supported. GOG data is read from an installed Galaxy client. Discord presence depends on Social SDK permissions; voice activity is shown only when supplied by Discord.
- Hydra remains responsible for downloads and their sources. Adding a title to an account does not download or install it.
- Bluetooth LE-only devices are not supported by the pairing helper.
- News and store descriptions retain the language supplied by their sources. Prices and dates can change; confirm the final offer with the store.
- AnyFSE is a separate, optional installation. Nova does not replace Windows system components.

## Development

The application uses Electron, Node.js and plain JavaScript/CSS. See [BUILDING.md](BUILDING.md) for reproducible build instructions and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) for dependencies.

```powershell
npm ci
npm --prefix app ci
npm --prefix tools ci
npm test
npm run start
npm run dist
```

The application code is MIT licensed. Third-party components retain their own licenses. Nova is not affiliated with Valve, Discord, SteamGridDB, Hydra or the listed stores.

## Nova Web companion

Use [Nova Web](https://nova-launcher-web-ten.vercel.app) with the same Nova account to browse the cloud library, discover games and edit your wishlist. Explore and Wishlist refresh automatically when opened. Store sessions remain on your PC; Supabase contains synchronized library metadata, preferences and progress. Nova account sign-in is managed separately by Supabase Auth.

Version 0.1.1 adds the desktop bridge: keep Nova open and signed in to receive web requests to update store libraries. The bridge also merges concurrent wishlist changes instead of overwriting another device's edits. See [web/README.md](web/README.md).
