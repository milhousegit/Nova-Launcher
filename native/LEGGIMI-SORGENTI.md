# Sorgenti della versione autonoma

L’applicazione Electron è distribuita come codice leggibile in `resources/app`:

- main.cjs: finestra, IPC, credenziali protette, avvio, chiusura, AnyFSE, dispositivi e sincronizzazioni.
- independent.cjs: installazioni Steam/Epic, importazione Hydra, unificazione copie, rilevamento processi e chiusura verificata.
- steam.cjs: API Steam per libreria online, amici e obiettivi personali.
- artwork-worker.cjs: controlli sulle dimensioni e recupero automatico Steam/SteamGridDB.
- library.cjs: archivio e metadati locali, notizie.
- ui.js, style.css, index.html, preload.cjs: interfaccia e navigazione.

`tools/snapshot.cjs` e `tools/achievements.cjs` leggono Hydra tramite copie temporanee con classic-level e il runtime Node incluso. `tools/discord/DiscordAdapter.cs` è il sorgente dell’adattatore Social SDK: carica la DLL dalla propria cartella e segue la durata del processo Nova. Compilato con Roslyn per .NET Framework 4. Per una redistribuzione pubblica serve rispettare le condizioni del Discord SDK.

NovaDevices.cs e le classi Nova-WifiConsole.cs / Nova-BluetoothConsole.cs implementano il servizio JSON audio/Wi-Fi/Bluetooth; riferimenti NAudio e Newtonsoft.Json. Il renderer ha contextIsolation e sandbox attivi e non riceve credenziali memorizzate.

Non pubblicare data, Backups, sessioni o credenziali con i sorgenti. Per ricreare l’app su una macchina pulita servono anche i normali file di distribuzione Electron presenti accanto a NOVA.exe.
