## Nova Launcher 0.1.6

### Added

- Personal profile page with a customizable display name, bio, avatar and banner.
- Most-played games, recently played games and locally detected current game activity.
- Personal profile links and shortcuts to store account management.
- A private activity feed for newly observed achievements, library additions and wishlist additions.
- Settings to show or hide profile sections and feed categories.
- Separate resets for appearance, activity feed or the personal profile, requiring RESET confirmation. Your library, wishlist, Nova account and store sessions are preserved.
- Linux x86_64 AppImage packaging and separate Windows/Linux release builds.
- Persistent project instructions requiring launcher changes to cover both Windows EXE and Linux AppImage.

### Fixed

- Selected artwork now retains an online URL for cross-device synchronization and is applied by the web companion.
- Concurrent artwork and favorite edits merge without overwriting changes to other games.
- Public Steam cover recovery works without a SteamGridDB key, with web image fallbacks and preservation of previous artwork when recovery fails.
- SteamGridDB API-key synchronization uses a separate owner-scoped table and reports synchronization failures.
- Mobile web library layout now has readable filters, larger touch controls, an adaptive grid and responsive game details.
- Linux updates select and verify an AppImage instead of a Windows installer.
- Desktop-mode profile navigation and preservation of unsaved edits during background updates.
- Wishlist feed entries resolve cached game titles when available, including games outside your library.
- Removed the legacy Playnite integration, exporter and dedicated binaries.

### Important notes and limitations

- A SteamGridDB API key is optional for public Steam covers and viewing previously selected online artwork. It is needed to search SteamGridDB alternatives.
- Artwork saved only as local files by older builds may need to be selected again to synchronize across devices.
- The feed records new activity after the update; your existing library establishes its initial baseline. Profile data remains private to your Nova account.
- Apply `web/supabase/artwork-credentials.sql` to enable SteamGridDB API-key synchronization. The personal profile requires no additional database tables. Deploy the web companion separately: publishing this release does not update the website.
- Linux remains a preview. Windows-specific local store discovery, the native Discord adapter, Wi-Fi/Bluetooth controls, Steam firewall controls and AnyFSE have not been ported. Game detection depends on accessible local processes and may not recognize Proton/Wine launches. Credential protection requires a supported desktop keyring.
- Automated tests and synthetic UI checks have passed locally. Real-account sign-in, production synchronization and complete native workflows require further validation. The Windows installer is unsigned.

Download the package for your operating system and verify it against `SHA256SUMS.txt`.
