# Istruzioni permanenti del progetto

## Parità tra Windows e Linux

- Ogni richiesta di modifica, correzione o nuova funzionalità del launcher si applica per impostazione predefinita **sia alla versione Windows EXE sia alla versione Linux AppImage**, anche quando l'utente non ripete entrambe le piattaforme. Una richiesta esplicitamente limitata a una piattaforma prevale su questa regola.
- Usa il codice condiviso per il comportamento comune. Quando servono integrazioni native, implementa i percorsi appropriati per entrambe le piattaforme; non considerare sufficiente compilare lo stesso codice se una funzionalità dipende da helper disponibili solo su Windows.
- Mantieni coerenti versioni, dipendenze, configurazioni di packaging, aggiornamenti, documentazione e note di release per entrambi i formati. Gli aggiornamenti Linux devono usare AppImage e quelli Windows EXE.
- Verifica i test comuni e i percorsi specifici coinvolti. Per richieste di build o release prepara entrambi gli artefatti, salvo esplicita indicazione diversa dell'utente; una richiesta relativa solo al codice non implica automaticamente pubblicare una release.
- Non dichiarare parità o verifica completa se una piattaforma non è stata provata. Se mancano strumenti, accessi o supporto nativo, completa il lavoro possibile e indica con precisione ciò che resta da implementare, compilare, testare o pubblicare su ciascuna piattaforma.
- Le limitazioni Linux già presenti non sono un'esenzione: per ogni modifica valuta l'impatto su entrambe le versioni e segnala eventuali impedimenti alla parità funzionale.

Queste istruzioni valgono per tutto il repository e per le nuove sessioni che lo aprono. Mantienile nel controllo versione affinché siano disponibili anche nei nuovi checkout.
