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
