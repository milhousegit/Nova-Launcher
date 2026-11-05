## Nova Launcher 0.1.8

Windows EXE and Linux AppImage are built from the same shared code.

### Added

- Per-device startup preference for BigScreen or Desktop mode, with explicit `--bigscreen` and `--desktop` launch overrides.
- Seven organized settings categories with consistent spacing and controller-friendly controls.
- Illustrated profile recap with most-played games, recent games, playtime, unlocked achievements and genre statistics.
- Steam Family library retrieval through the authenticated Steam Guard session, with exclusions, deduplication and explicit sync status. An API key alone is not enough for Steam Family.
- Optional account mode: Nova works as a local guest without an account. Sign in from Profile to enable cloud features. Added Sign out in the profile menu and account settings.
- Opt-in encrypted credential backups for the Steam Web API key, the SteamGridDB key and the Steam Guard QR session. Encryption happens on the device with AES-256-GCM and a key derived from your recovery passphrase using scrypt; the passphrase is never uploaded. Backups are protected by owner-scoped row-level security. Steam session backups contain only the refresh token and SteamID (no passwords, cookies or guard secrets); restoring reconnects to Steam and may require a fresh QR. Other store sessions remain local.
- Credential storage choice is part of each connection flow: Steam has an opt-in cloud switch below its QR, and SteamGridDB asks for local or cloud storage before opening its form.
- SteamGridDB: official API documentation link and a saved-key connection check.
- Compact Steam, Epic and GOG connection actions for empty libraries, platform symbols on store rows, and an "Other accounts" section with Spotify app/account shortcuts (no Spotify session synchronization).
- Profile menu: removed the redundant fullscreen action, added a close icon for Quit Nova, and added a separate confirmed PC shutdown action. Windows shutdown closes applications forcibly; Linux uses systemd poweroff.
- The Xbox integration entry is now named BigScreen Full Experience and states explicitly when it depends on AnyFSE.
- Packaged local preview commands (`npm run preview`, `preview:win`, `preview:linux`) that keep Nova Launcher branding and disable update checks.

### Fixed

- Friends panel keeps the complete roster, including offline friends, and shows separate total and online counts. The header badge counts online people only, with linked Steam/Discord profiles counted once.
- Steam busy, away, snooze, invisible and missing presence states are normalized; unknown states no longer count as online.
- Profile history uses real achievement unlock dates and verified platform acquisition dates. Import timestamps are no longer shown as acquisition events.
- "Recently added" sorting uses verified store acquisition dates only; titles without a date sort last.
- Historical unlocked achievements are included in the profile recap and refreshed in the background for played games, with bounded concurrency and cached results. Steam Guard sessions can request achievement progress without a separate Web API key.
- Profile totals use the live visible library, with Steam Family titles counted once and separate Steam personal/family counts. Fixed stale home library counts while panels are open and owned-game API entries missing from local license metadata.
- Corrected the Steam `family_shared` flag in both import paths.
- SteamGridDB keys are verified before replacing a saved key, with separate messages for authentication, network and service errors. Legacy automatic key synchronization is disabled.
- Disconnecting a store removes that source from the visible library while keeping copies from other connected stores. Installed files and saves are preserved.
- Profile artwork overrides and achievement deduplication are included in recap statistics. Controller confirmation now works with profile form fields and switches.

### Notes and limitations

- The server-side table for encrypted credential backups is `nova_credential_backups` with owner-only row-level security. Existing legacy server records are not migrated automatically.
- Count diagnostics list identified software/demos and personal entries missing from the last Steam API response. No titles are removed to force a numerical match; the difference between Nova's total and the Steam library count still needs verification against real account data.
- Xbox Game Bar's predefined launcher row has not been extended: no supported public registration interface was found.
- Recap statistics use available play history and do not represent a yearly report.

### Validation

- Automated tests passed on Windows. The Windows build was run locally as a packaged preview.
- The Linux AppImage is built by the release workflow; it has not been run on a Linux machine, so Linux-specific behavior is not manually verified.
