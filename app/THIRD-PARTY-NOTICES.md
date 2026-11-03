# Third-party notices

The Nova application source is MIT licensed. Third-party assets and binaries are not relicensed by the application LICENSE.

- Electron 45.2.1 / Chromium — MIT and third-party licenses, included in the packaged runtime.
- Node.js 24.22.1 — license included in `tools/LICENSE-Node.txt`.
- steam-session, steam-user, qrcode and dependencies — see each npm package's license. Runtime dependencies are pinned in `app/package-lock.json`.
- classic-level and dependencies — licenses included in the installed `tools/node_modules` packages.
- LiteDB 4.1.4 — MIT, David F. Alves; `tools/exporter/LICENSE-LiteDB.txt`.
- NAudio — MIT; `tools/NAudio.LICENSE.txt`.
- Newtonsoft.Json — MIT; https://github.com/JamesNK/Newtonsoft.Json/blob/master/LICENSE.md
- Ludusavi 0.29.0 — MIT; `tools/ludusavi/LICENSE`. Additional upstream dependency notices: https://github.com/mtkennerly/ludusavi/releases/tag/v0.29.0
- Outfit font — SIL Open Font License 1.1; `app/assets/OFL.txt`.
- Discord Social SDK — proprietary Discord component, included only as integrated into the application installer, not as a standalone SDK in the source repository. Its terms apply: https://support-dev.discord.com/hc/en-us/articles/30225844245271-Discord-Social-SDK-Terms. Obtain the SDK from the Discord Developer Portal when building from source. The public Client ID identifies Nova; no client secret is embedded.
- AnyFSE is an optional separate installation; MIT, https://github.com/ashpynov/AnyFSE.

Store logos and merchant marks identify their respective services. Game artwork belongs to its owners and contributors and is fetched at runtime; personal cached game artwork is not distributed.

Steam, Hydra, Playnite and other store clients are not bundled. No Simplewall code is included: the temporary Steam network filter is implemented by Nova's own Windows helper.
