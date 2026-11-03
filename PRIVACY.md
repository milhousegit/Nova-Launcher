# Privacy

Nova uses a Nova account to synchronize library metadata, preferences, friend identity mappings, achievement metadata and online artwork references with Supabase. Installed paths and store authentication sessions remain local. Windows protects stored credentials through Electron safeStorage.

Store connections communicate with their respective services. Artwork, news, metadata and offers may be requested from Steam, SteamGridDB, HowLongToBeat and store comparison providers. Opening an offer sends you to that store.

The application has no separate analytics or crash-upload service. Local diagnostics are written in the application's data directory. Review and remove personal information before sharing logs.

Signing out of Nova ends the local profile session; it does not delete your cloud profile. This initial release has no account-deletion interface. Repository issues are public: never post credentials or private library exports there.
