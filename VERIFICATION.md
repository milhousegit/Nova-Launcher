# Verification for v0.1

Automated checks passed:

- JavaScript syntax across all application modules.
- Acquisition-date ordering, per-source dates and missing dates placed last.
- Saved Steam session reuse on restart and token renewal using synthetic protocol fixtures.
- Steam license timestamp mapping using synthetic fixtures.
- English as the default interface language, translated accessibility labels and dynamic UI labels.
- Fresh-profile boot: no personal library is exposed before Nova sign-in, protected actions reject unsigned-in users, and foreign IPC senders are rejected.

Packaging produces an NSIS Windows x64 installer. Runtime credentials and cached user data are excluded from packaging and source control.

Limitations of verification: the final native visual inspection could not complete because desktop-control approval timed out. Installation on a separate clean Windows device, live Steam date import and each store's real-account sign-in require further validation. No claim is made that every store supplies acquisition dates or achievements.

## Web companion / 0.1.1

Additional checks passed for concurrent wishlist merges, stale-revision retries, remote update request claim/completion, responsive browser model filters, synthetic signed-in UI flow and automatic Explore/Wishlist refresh on navigation. Transactional database tests verified own-profile isolation, rejected cross-user sync writes, wishlist duplicate safety and preservation of game data. Anonymous REST and function requests were rejected. Production URL returns HTTP 200; the generated deployment URL remains protected. The user confirmed sign-in and real library access from their PC; automatic refresh changes were subsequently verified with synthetic fixtures.


## Console experience (unreleased)

Automated checks passed on Linux with Node.js: `npm test`, including `tests/console-shell.cjs` (launch plan, session states, console-mode switches with a fake registry and login item, registry parsing/merging, manual games, shortcuts and wiring).

The real renderer was driven in headless Chromium by `node scripts/ui-check.cjs` with a synthetic 30-game library and a stand-in for the main process: Home layout at 1080p and 720p, one-press launch, no double launch, Starting/Running/ended states, the session menu, LB/RB sections, controller A/X/Y/Menu, search, the controls guide, console settings, confirmation before silencing notifications, keyboard and controller reassignment with a swap, diagnostics, English and Italian.

Not verified: anything that needs Windows or a packaged build (login item, `ToastEnabled` registry switch, global shortcut, window focus after a real game, Steam `-silent -applaunch`, GOG/Ubisoft registry reads), a physical controller, and real game launches on either platform. The Electron main process was exercised only through the existing fake-Electron boot test.
