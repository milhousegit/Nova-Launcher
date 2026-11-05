## Nova Launcher 0.1.9

Windows EXE and Linux AppImage are built from the same shared code.

### Added

- **Console design layer** for the whole launcher: one radius and surface scale, monospace system labels, tinted controller glyphs (Xbox A/B/X/Y and PlayStation symbols) and a refreshed header, footer, panels, loading states and toast.
- **Settings redesign**: grouped, numbered sections with uniform rows, icon tiles, consistent toggles with ON/OFF labels and a status chip with the version and platform. Switching category now updates only the content column, with no page rebuild or scroll jump.
- **Profile menu and game options** redesigned: an account card with grouped Session / Account / System actions, and a game card with cover, store and installed badges and clearly grouped sections.
- **Automatic game location**: Nova finds an installed game's folder and executable by itself (next to the games already in the library, plus Program Files), skipping uninstallers, redistributables and crash handlers. Choices made by hand always win, and "Find the game", "Change folder" and "Change executable" are available in the game options. Pressing Play on a game without a known executable runs the search first. Windows only.
- **Launch options** per game, editable in the game options. Steam uses the documented `steam://run/<id>//<options>/` form; Epic does not accept options from outside the client and the panel says so.
- **SteamGridDB**: the game is matched automatically (Steam id first, then title) when opening Cover, Background or Logo, remembered, and can be changed with "Change game".
- **Hydra downloads**: finished downloads are read from Hydra's local data, so games downloaded in Hydra are detected even without a configured executable. After connecting a Hydra account Nova opens Hydra if needed and verifies downloads and save locations. While Nova and Hydra are open together, Nova re-checks whenever Hydra's data changes and when Hydra closes. Windows only.
- **Friend profiles**: automatic suggestions for friends who share a display name on Steam and Discord (accents and case ignored), never merged without confirmation. The merge page now shows statistics, suggestion cards with avatars, merge-all, dismiss and restore, merged profiles and a searchable manual picker.
- **Discord voice**: a Discord button in the header, after Friends. The panel lists any current call (server, group or private) with its participants, your servers with icons, voice channels with the avatars of who is inside, joining and leaving, and microphone and deafen controls. The same controls appear in Settings → Audio during a call. Friends have a menu with "Call on Discord" (opens the conversation in Discord) and, for Steam friends, the Steam profile. Voice uses the local Discord client and requires the `rpc` permission described below. Windows only.

### Fixed

- Navigation is smoother: one light transition per view change, no blur in animations, no smooth-scroll lag, cheaper translation of the interface, and a background blur that updates in steps while reading a game page.
- Arrow keys now leave the search field instead of trapping focus.
- Steam and Steam Family Sharing are one platform in the library filter, as are Ubisoft Connect and the Xbox/Microsoft Store variants.
- Game news no longer shows BBCode tags, template placeholders such as `{LINK}`, invisible or replacement characters, decorative separator lines or broken accents. Ordinary bracketed words such as "[Early Access]" are kept.
- The confirmation toast is white with dark text again, and the animated selection border is unchanged.

### Notes and limitations

- Discord voice needs the Discord desktop app open and the `rpc`, `rpc.voice.read` and `rpc.voice.write` scopes. Discord grants these to the application owner and to testers added in the developer portal, or to approved applications; other accounts will see an authorization error in the Discord panel. Existing Discord links keep working for friends and presence; press "Enable calls" to grant the voice permission.
- Calling a friend from Nova opens the conversation in Discord, where the call is started; direct calls from Nova are not available.
- Hydra download detection, the Hydra monitor, game location and Discord voice read Windows-specific data and are not available on Linux in this release.
- The Discord adapter (`tools/discord/DiscordAdapter.exe`) is rebuilt from `DiscordAdapter.cs` and the new `DiscordVoice.cs`.

### Validation

- All automated tests passed on Windows, including a new end-to-end test of the Discord voice adapter against a simulated Discord client. The voice feature has not been exercised against a real Discord account.
- The Windows build was run locally as a packaged preview. The Linux AppImage is built by the release workflow; it has not been run on a Linux machine, so Linux-specific behavior is not manually verified.
