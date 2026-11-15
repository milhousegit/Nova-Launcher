## Nova Launcher 0.1.13

### Fixed

- **Interrupted updates**: a silent update could leave Nova half removed, so that it no longer opened ("Failed to uninstall old application files" from the installer, then a blank or restarting Nova). The installer started while Nova was still saving and closing, and AnyFSE, the sign-in start or the updater's own relaunch could start Nova again while its old files were being removed. The Windows installer now makes the old copy unstartable for the duration of the update, gives Nova a few seconds to close, and then closes every process running from the installation folder (Nova, the Discord adapter, the bundled Node runtime, the device service). If that, or removing the old version, is not possible, the installed copy is restored untouched and started again.
- The installer (Windows) and the new AppImage (Linux) start only after Nova has exited, so the new version is no longer turned away by the copy that is still closing.
- **Update downloads**: a download now stops only after a minute without data instead of after five minutes in total, so slower connections can download the installer. A verified download stays ready across later checks and is not downloaded again.
- The Updates screen shows a readable error instead of "Error invoking remote method 'nova'".

### Changed

- The Windows installer now includes the Discord Social SDK, so the published EXE works with Discord without replacing it by hand.

### Validation and platform limitations

- Automated tests cover the restart-after-exit helpers for both platforms, the ready state across checks, stalled downloads and the installer hooks. The Linux restart helper was run against a real process. The Windows installer with the new hooks was compiled by GitHub Actions.
- Not yet run on a Windows PC: the installer closing Nova and its helper processes, blocking restarts from AnyFSE during the update, and restoring the old copy when an update fails. Updating from 0.1.12 uses the 0.1.12 updater with the new 0.1.13 installer; the restart-after-exit helper takes effect from the next update.
- If an earlier update already left Nova unable to open, install `nova-launcher-v0.1.13.exe` from Releases by hand; data and accounts are kept.

## Nova Launcher 0.1.12

### Added

- **Library collections**: Recently played, Favourites, Installed and Never played as rows, plus your own collections (create, rename, delete, add a game from its options). The full grid with filters is one press away and search always uses it. Collections are stored on this device.
- **Downloads**: a header button before Wi-Fi shows a ring that fills with the progress of active Steam and Hydra downloads and opens the list.
- **Storage**: free space per drive and the size of every installed game. Uninstalling is handed to the store that owns the game; Nova never deletes game files.
- **System updates** (Windows): pending Windows Update items and drivers, listed separately, with a restart notice and shortcuts to Windows Update and optional updates. Installation stays in Windows Settings.
- **Window priority**: as the full-screen console, Nova stays above store clients and apps. It steps aside when a game is on screen, and yields to anything the user opens from Nova or switches to (Game Bar, task switcher) until Nova is focused again. Clients and Discord started by Nova open in the background. The option is in Settings → Console and controls.

### Changed

- Directional focus picks the nearest element in line, measured between edges, instead of comparing centres.
- The play button, controller glyphs and state badges use one neutral colour. The Home hero shows the title, playtime, achievements, description and actions only; the status chips and the Continue badge are gone.
- News and Apps are below the games on Home again. The header shows the Nova symbol only and the footer wordmark is removed.
- Every sidebar has the same width. The Discord sidebar shows the current call first, with three equal controls, then the servers.
- Game options open from cards inside a collection row.

### Validation and platform limitations

- Automated tests cover directional focus, downloads, storage sizes, uninstall routes, the Windows Update parser, window priority and the focus guard. The real interface was driven in Chromium with a synthetic library, keyboard and a simulated controller (`node scripts/ui-check.cjs`).
- Not yet run on Windows or in a packaged build: window priority and background client start (including Hydra's `--hidden`), the Windows Update and driver search, drive sizes and Steam download progress. This is also the first version that 0.1.11 installs in place, silently; that route has not been run on Windows either.
- Nova cannot register itself as the home app of the Xbox full screen experience: Windows offers no public registration for unpackaged apps, so a helper such as AnyFSE is still needed. Inside that experience, Game Bar remains the in-game overlay; Nova does not ship its own.
- Epic, GOG and Ubisoft downloads are not shown; Steam downloads do not distinguish paused from active. Linux has no system-updates page.

## Nova Launcher 0.1.11

### Added

- **Console mode** (Settings → Console and controls): start Nova in full screen when you sign in (Windows login item, Linux autostart entry), return to Nova when a game closes, quick start from Home, an optional global shortcut (default Ctrl+Alt+Home) that brings Nova back over a running game, and Windows settings pages opened from Nova. Silencing Windows notification banners is an opt-in, experimental, per-user switch that asks for confirmation and restores the previous value when Nova closes or at the next start.
- **Launch sessions**: every game moves through Play → Starting → Running, with errors and time-outs reported. A store client opening is not counted as the game running; a second press cannot start the game twice; the exit is detected by the main process, so Nova returns even while hidden behind a fullscreen game.
- **Smart launch**: the game executable is used when the copy is not tied to a store client; Steam is started with `-silent -applaunch` when it is not running and through its protocol when it is; Epic keeps its silent protocol. A per-game launch method (Automatic, Direct, Through the store) is available in the game options. No licence, sign-in or anti-cheat check is bypassed.
- **Detection**: installed GOG and Ubisoft Connect games are read from the Windows registry and merged with account libraries without duplicates. Any installed game can be added by choosing its executable, and removed again.
- **Controller-first Home**: larger covers, a clear selection, Continue playing, a bounded rail with a shortcut to the whole library, Games / News / Apps sections on LB/RB, and state badges on cards.
- **Controls**: A starts the selected game on Home, X is the quick action, Y searches, Menu opens options, View opens the controls guide. Keyboard equivalents exist for every action, all of them can be reassigned for keyboard and controller, and the hints at the bottom follow the focused element and the device in use.
- **Performance diagnostics**: start-up timings, memory, CPU and the current game-check interval.
- **In-place updates**: installing an update from Settings now replaces the installed version in the same folder and reopens Nova. Windows runs the verified installer silently; Linux replaces the running AppImage file. Shortcuts, the login item and tools that start Nova by path (such as AnyFSE) keep working without changes. If the in-place route fails, the installer opens as before.

### Changed

- The interface starts loading before the Nova profile is fetched, so the boot screen appears immediately instead of an empty window.
- The process list is read by the main process at an adaptive pace (1–1.5 s while a game starts or closes, 4 s while it runs, 10 s when idle) instead of every 3 s from the interface.
- Running games are matched against the folder chosen by the user or found by Nova, not only the one reported by the store.

### Validation and platform limitations

- Automated tests cover the launch plan, session states, console-mode switches, registry parsing and merging, manual games and shortcuts. The real interface was driven in Chromium with a synthetic library, keyboard and a simulated controller (`node scripts/ui-check.cjs`).
- Not yet run on Windows or in a packaged build: the silent in-place update, login-item registration, notification silencing, the global shortcut, focus return after a real game, Steam `-silent` start, and registry detection against real GOG / Ubisoft installs. Not yet run in a Linux AppImage: the in-place AppImage replacement, the autostart entry and real game launches.
- Updating from 0.1.10 to this version still opens the installer by hand, because the silent route ships with this version. To go back, install the 0.1.10 EXE or AppImage from the Releases page.
- Linux has no notification silencing and no system-settings pages; games started through Proton or Wine may not be recognised as running.
- A controller cannot bring Nova back while a game has focus; EA app, Battle.net and Xbox/Game Pass installs are not detected automatically and can be added by hand. Nova does not replace the Windows shell: the desktop is visible briefly at sign-in before Nova opens.

## Nova Launcher 0.1.10

### Fixed

- Hydra installation detection now includes the LevelDB runtime in packaged builds. Installed executables and completed downloads are detected locally and retained after cloud synchronization.
- Opening Discord from Nova starts the desktop client minimized when necessary, waits for connection and reuses an existing client.
- Discord IPC sends complete frames in a single write and closes failed handshakes instead of accumulating connections. Startup and command deadlines account for client initialization.
- Shut down PC now saves Nova state and requests system shutdown directly, without a mouse-only confirmation dialog. Windows forcibly closes applications; Quit Nova remains separate.
- Packaging checks reject missing Hydra runtime dependencies. Linux packages include the database reader and scan the Linux configuration directory using Electron's Node runtime.

### Validation and platform limitations

- Desktop regression tests and native Discord protocol tests pass on Windows. Local Hydra installation scans and real Discord server loading were verified without including personal data in release artifacts.
- Shutdown commands were mocked in tests; the test suite never shuts down its host.
- GitHub Actions builds Windows EXE and Linux AppImage from the same commit. Linux native Discord voice, Windows store discovery and Windows device controls remain unavailable; Linux desktop execution has not been verified on the Windows development machine.

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
