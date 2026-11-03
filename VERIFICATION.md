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
