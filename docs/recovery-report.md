# Rekonstruktion der Portal-Korrekturen

Ausgangsstand: `cd3595477ab20b18f9b0861a006340d7985f33f5`.
Entwicklungsbranch: `fix/portal-readiness-recovery`.
Die verlorene Implementierung und ihre Testartefakte konnten nicht wiederhergestellt werden. Die Tests in diesem Branch sind neu erstellt; die frühere Anzahl von 14 geänderten Dateien ist kein Nachweis für Identität der Implementierungen.

## Änderungen

- `assets/readiness.js`: gemeinsamer sichtbarer Ladestatus, Zeitgrenze für CDN-Laden und Startvorgang, verständliche Fehlermeldung.
- `index.html`: abgefangener Startfehler, Hinweis bei `denied=1`, getrennte Darstellung von Modulstatus und Länderfreigabe, JavaScript-Hinweis.
- `admin/index.html`: Behandlung fehlender/fehlerhafter Versions- und Länderabfragen; Textausgabe statt HTML-Einfügung für Datenbankfelder; Hinweis bei leerer Länderliste.
- `maut-laenderinfo/index.html`: abgefangene Auth-/Startfehler, gemeldete Revisionen und offene HTML-Zuordnung, verknüpfte Labels für alle neun Auswahlfelder, ignorierte Werte unsichtbarer Zusatzfelder in Berechnung und Details, JavaScript-Hinweis.
- `assets/portal.css`: `hidden` bleibt auch bei als Flexbox gestalteten Verwaltungslinks wirksam.
- `assets/publication.js`: keine Freigabe allein aus Modulstatus oder vorhandenen Länderzeilen ableiten.
- `tests/*`, `.gitignore`: separater, gepinnter Browser-Testaufbau und lokale Ergebnisdatei.
- `README.md`, `docs/*`: tatsächlicher Entwicklungsstand, Prüfumfang und offene Release-Entscheidung.

## Prüfstatus

Alle Prüfungen bestanden im lokalen Chromium mit kontrollierten Datenantworten. Der vollständige Prüfumfang lief auf Desktop, iPad (gen 7) und iPhone 13; zusätzlich enthält jeder Lauf repräsentative Navigation über alle drei Emulationen.

| Prüfung | Je Geräteprofil |
| --- | ---: |
| Browser-Regressionen | 18 bestanden |
| Fahrzeugprofile | 126 bestanden |
| Detailansichten (7 je Profil) | 882 bestanden |
| Feste fachliche Sollwertfälle | 14 bestanden |
| Statuslogik | 4 bestanden |
| Unbehandelte JavaScript-Fehler | 0 |

Die Matrix wird aus tatsächlich sichtbaren Zusatzfeldern erzeugt, nicht auf die gewünschte Anzahl aufgefüllt. Die 14 Sollwertfälle prüfen feste Mautklassen und Geschwindigkeitsangaben aus dem Ausgangsstand für alle vier Länder und ausgewählte Achs-, Brems-, Höhen- und Gewichtsschwellen. Sterne an den vorhandenen Pkw-Mautklassen bleiben Teil des Sollwerts. Bei der Testentwicklung wurden Bereitschafts- und Sichtbarkeitsbedingungen präzisiert; frühere abgebrochene Läufe werden nicht als erfolgreiche Prüfungen gezählt.

Die neun verknüpften Auswahlbeschriftungen, Tastaturnavigation, `denied=1`, Logout, JavaScript-Deaktivierung, gescheiterte CDN-/Auth-Abfragen sowie fehlende und leere Admin-Daten sind Bestandteil der Regressionen. Auch die Bestandsregel für verborgene Verwaltungslinks wird geprüft. JavaScript-Syntaxprüfung, `git diff --check` und Installation mit `npm --prefix tests ci` bestanden.

Die geprüften Anwendungsdateien stammen aus Commit `c783008`; anschließend wurden nur die Testbereitschaft und dieser Bericht ergänzt. Maschinenlesbare Geräteergebnisse und die 14 festen Sollwerte stehen in [validation-results.json](validation-results.json). Laufzeit: Node 24.19.0, Playwright 1.58.2, Chromium 154.0.8037.57. Die vollständigen lokalen Profilmatrizen bleiben in den ignorierten `tests/results*.json`.

## Grenzen

Testantworten ersetzen Authentifizierung und Supabase-Datenzugriff; alle externen Anfragen der JavaScript-Browsertests werden blockiert. Kein echter Mitgliederzugang, keine Produktions-RLS-Prüfung, keine Datenbankänderung und keine Veröffentlichung. Chromium emuliert iPad/iPhone; dies ist kein Test von Safari/WebKit oder echter Hardware. Labels, Tastaturbedienung und JavaScript-Hinweise werden gezielt geprüft; es erfolgt keine vollständige WCAG-Zertifizierung. Maut- und Verkehrsangaben werden auf Bestandsverhalten geprüft und nicht als unabhängig rechtlich verifiziert erklärt.
