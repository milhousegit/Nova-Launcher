## Nova Launcher 0.1.6

### Aggiunto

- Pagina profilo con nome, bio, icona e banner personalizzabili.
- Statistiche con giochi più giocati, recenti e gioco in esecuzione rilevato sul dispositivo.
- Link ai propri profili e accesso alla gestione degli store.
- Feed personale con nuovi obiettivi, giochi aggiunti alla libreria e alla wishlist.
- Impostazioni per mostrare/nascondere sezioni e categorie del feed.
- Reset separati per personalizzazione, feed o profilo personale, con conferma RESET; libreria, wishlist, account e sessioni degli store vengono conservati.
- AppImage Linux x86_64 e pipeline di rilascio con build separate Windows/Linux.
- Istruzioni permanenti del progetto per mantenere le modifiche su entrambe le piattaforme.

### Corretto

- Locandine scelte salvate come URL online, sincronizzabili tra dispositivi e applicate anche dal companion web.
- Fusione delle modifiche concorrenti ad artwork e preferiti senza sovrascrivere altri giochi.
- Recupero delle copertine Steam senza chiave SteamGridDB, con fallback web e conservazione dell'immagine precedente in caso di errore.
- Sincronizzazione della chiave SteamGridDB in una tabella privata separata dalla libreria; errori di sincronizzazione espliciti.
- Layout mobile della libreria web: filtri leggibili, controlli touch, griglia adattiva e dettagli gioco.
- Updater Linux: selezione e verifica dell'AppImage anziché dell'installer Windows.
- Navigazione del profilo in modalità desktop e conservazione delle modifiche non salvate durante aggiornamenti in background.
- Titoli della wishlist risolti dalla cache, quando disponibili, anche per giochi non posseduti.
- Rimosse l'integrazione e l'esportatore storico di Playnite, inclusi i binari dedicati.

### Note e limiti

- La chiave SteamGridDB è facoltativa per le copertine pubbliche Steam e la visualizzazione delle immagini già selezionate; serve per cercare alternative sul servizio.
- Le vecchie locandine salvate solo come file locali potrebbero richiedere una nuova selezione per sincronizzarsi.
- Il feed registra le nuove attività dall'aggiornamento; la libreria preesistente costituisce la base iniziale. Il profilo rimane privato all'account Nova.
- Applicare `web/supabase/artwork-credentials.sql` per abilitare la sincronizzazione della chiave SteamGridDB. La pagina profilo non richiede nuove tabelle. Il companion web va distribuito separatamente: questa release non pubblica il sito.
- Linux è ancora un'anteprima: discovery locale Windows, adattatore Discord nativo, controlli Wi-Fi/Bluetooth, firewall Steam e AnyFSE non sono portati. Il rilevamento dei giochi dipende dai processi accessibili e può non riconoscere avvii Proton/Wine. La protezione delle credenziali richiede un keyring desktop supportato.
- Test automatici e prove UI con dati sintetici eseguiti. Sign-in con account reali, sincronizzazione di produzione e flussi nativi completi richiedono ulteriore verifica. Installer Windows non firmato.

Scaricare il formato per il proprio sistema e verificarlo con `SHA256SUMS.txt`.
