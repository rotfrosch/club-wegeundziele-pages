# Login-Korrekturen und Freigabeprüfung

Stand: 29.10.2026. Branch: `fix/login-logo-production`. Ausgangscommit: `cabe9b37352a78a5ea005f71c705d991b1b092d7`.

## Ergebnis

Beide gemeldeten Fehler sind behoben. Alle 69 Prüfungen des abgeschlossenen Laufs sind bestanden, keine fehlgeschlagen oder übersprungen. Die Ergebnisse mit Zeitstempeln, Browser-Version, Einzelprüfungen und SHA-256 der getesteten Dateien sind in [login-validation/results.json](login-validation/results.json) gespeichert.

Kein Merge nach main und kein Deployment. Keine Supabase-Änderung, keine Änderung der Live-Website und keine Übernahme anderer Entwicklungsbranches. Die Korrekturen werden ausschließlich auf dem oben genannten Branch gesichert. Eine Veröffentlichung benötigt die nächste ausdrückliche Freigabe des Eigentümers.

## Geänderte Dateien

| Datei | Zweck |
| --- | --- |
| `index.html` | Sichtbarer Ladehinweis mit Neu-laden-Schaltfläche; abgefangener dynamischer Authimport; 12-Sekunden-Zeitlimit; Prüfung der benötigten Modulmethoden; Fehlerbehandlung beim Sitzungsstart; aktualisierte CSS-Cachekennung. |
| `assets/portal.css` | Auf Login, Portal, Ladehinweis und Verwaltungslink beschränkte `[hidden]`-Regel mit Vorrang vor Flex-/Button-Darstellung. |
| `.gitignore` | Ausschließlich lokale Testabhängigkeiten, alte lokale Ergebnisdateien und generierte Login-Testartefakte ausschließen. |
| `tests/package.json` | Separates, gepinntes Playwright-Testpaket und Testkommando. |
| `tests/package-lock.json` | Reproduzierbare Abhängigkeiten und Integritätswerte. |
| `tests/login-regression.cjs` | Alle bisherigen Login-Prüfungen und neue Fehler-/Berechtigungsregressionen; eigener temporärer HTTP-Testserver. |
| `docs/login-validation/results.json` | Ergebnisse des tatsächlich abgeschlossenen Laufs. |
| `docs/login-freigabe-report.md` | Dieser Bericht. |

Weitere Anwendungsdateien werden nicht geändert. Insbesondere sind `assets/auth.js`, `assets/config.js`, `admin/index.html`, `maut-laenderinfo/index.html` und das originale Logo bytegleich zum Ausgangscommit; die Ergebnisdatei enthält ihre Hashwerte. Keine spanischen Inhalte oder Freigabemanifeste wurden übernommen. Der Commit-Verlauf baut direkt auf dem vorgegebenen Login-Branch auf, ohne Merge eines anderen Branches.

## Verhalten nach der Korrektur

Ein Verwaltungslink mit `hidden` erhält jetzt tatsächlich `display:none`, auch wenn seine Buttonklasse Flex-Darstellung vorgibt. Er bleibt für normale Mitglieder nach Passwortanmeldung und bei bestehender Sitzung unsichtbar. Bei bestätigtem `admin:manage` bleibt er sichtbar.

Der Ladehinweis steht bereits im HTML. Ein nicht erreichbares Modul, ein syntaktisch fehlerhaftes Modul, fehlende Exporte, ein hängender Modulabruf sowie ein Fehler beim Sitzungsstart führen zu: „Die Anmeldung konnte nicht geladen werden. Bitte prüfe deine Internetverbindung und lade die Seite erneut.“ Der Mitgliederbereich bleibt verborgen. „Seite neu laden“ funktioniert nach Wiederherstellung der simulierten Verbindung. Bei erfolgreicher Initialisierung verschwindet der Ladehinweis. Ohne JavaScript erklärt ein noscript-Hinweis die notwendige Aktivierung.

Das CAMPIONS CLUB-Logo, Formularfelder, Passwortanmeldung, E-Mail-Link mit `shouldCreateUser:false`, Rücksprungadresse, Berechtigungsabfragen und vorhandene Abmeldefunktion bleiben erhalten. Der normale Login wurde auf allen drei Geräteformaten visuell kontrolliert.

## Ausgeführte Prüfungen

`npm --prefix tests ci` und anschließend `npm --prefix tests test` wurden erfolgreich ausgeführt. Node.js, Python-unabhängiger Testserver und `/usr/bin/chromium` wurden verwendet. Ein anderer Chromium-Pfad ist über `CHROMIUM_PATH` möglich. Für einen einzelnen Lauf kann `PORTAL_TEST_DEVICE='iPhone 13'` oder `PORTAL_TEST_DEVICE='iPad (gen 7)'` gesetzt werden. Standardmäßig laufen alle drei Formate. Ergebnisse und Screenshots entstehen in `tests/login-artifacts/`.

| Geräteformat | Bisherige Login-Prüfungen | Zusätzliche Regressionen | Ergebnis |
| --- | --- | --- | --- |
| Desktop, 1440 × 1000 | 14 | 9 | 23 bestanden |
| iPad (gen 7), Chromium-Emulation | 14 | 9 | 23 bestanden |
| iPhone 13, Chromium-Emulation | 14 | 9 | 23 bestanden |
| Gesamt | 42 | 27 | 69 bestanden |

Die 14 Prüfungen pro Gerät decken sämtliche zuvor geprüften Verhaltensweisen ab: anonymer Start mit originalem SDK, Original-Logo, Layout und erreichbare Bedienelemente, Tastatur und fehlende E-Mail, falsches Passwort, normale Mitgliederanmeldung, fehlende Mitgliedsfreigabe, fehlerhafte Berechtigungsabfrage, vorhandene Mitglieds-/Admin-/verweigerte Sitzung, E-Mail-Link-Anfrage, E-Mail-Link-Fehler und ausgefallenes Authmodul mit erfolgreichem Neu-laden. Die früheren drei gerätespezifischen Layoutfälle werden nun innerhalb jedes vollständigen Geräte-Laufs als Logo-, Layout- und Tastaturprüfung ausgeführt.

Zusätzlich werden pro Gerät fünf Lade-/Sitzungsfehler und vier Berechtigungsfälle geprüft. Der Timeout-Test hält den Modulabruf tatsächlich offen, bis der sichtbare Fehler erscheint. Er endet nicht bloß durch einen späteren Netzwerkfehler.

Ein erster zusätzlicher Timeout-Testlauf war durch ein zu kurzes Navigationszeitlimit des Testaufbaus blockiert. Nach Korrektur des Test-Warteverhaltens wurde die gesamte Suite erneut ausgeführt; nur dieser abschließende vollständige Lauf ist als Ergebnis gespeichert.

## Berechtigungen und Grenzen der Aussage

Die produktive Anbindung in `assets/auth.js` bleibt unverändert: `current_user_has_permission` wird serverseitig per Supabase-RPC aufgerufen; nur ein boolesches `true` wird als Freigabe angenommen. Der Schutz der Adminseite in `admin/index.html` bleibt ebenfalls unverändert.

Die zusätzlichen Tests laden diese unveränderten Dateien und simulieren ausschließlich die SDK-/Serverantwort an der lokalen Testgrenze. Direkte Aufrufe von `/admin/` mit verweigerter, fehlerhafter oder nicht boolescher RPC-Antwort werden zum Portal zurückgeleitet und lesen keine Länder-Verwaltungsdaten. Eine explizit bestätigte Adminantwort erlaubt die bestehende Ansicht. Der CSS-Fix ersetzt keine dieser Prüfungen.

Damit sind die unveränderte Einbindung der serverseitigen Entscheidung und das Verhalten gegenüber verweigerten Antworten geprüft. Die tatsächlichen produktiven RPC-Definitionen, RLS-Regeln und Mitgliedszuordnungen wurden weder geändert noch mit echten Mitgliedern Ende zu Ende geprüft. Es wurden keine Testzugänge bereitgestellt; keine echten Passwörter verwendet und keine echten Anmeldelinks verschickt. Ein frischer anonymer Start mit dem originalen SDK lädt nur öffentliche statische Ressourcen; reale Backend-Anmeldeanfragen werden im Test blockiert. Alle Passwort-, E-Mail- und Mitgliedsszenarien verwenden lokale Testantworten. Die Ergebnisse sind keine Behauptung eines durchgeführten produktiven Berechtigungs- oder Zustellungstests.

Die Geräteprüfungen sind Chromium-Emulationen und ersetzen keine Safari-Prüfung auf echten Apple-Geräten.

## Veröffentlichung

Der bestehende GitHub-Pages-Prozess veröffentlicht aus `main`, Verzeichnis `/`. Der Ausgangsstand von main ist `cd3595477ab20b18f9b0861a006340d7985f33f5`. Weder main noch die Pages-Konfiguration werden durch diesen Auftrag verändert. Der Branch-Push ist ausschließlich eine Sicherung zur späteren Veröffentlichungsentscheidung.
