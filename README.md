# Campions Club · Wege & Ziele

Statisches Mitgliederportal für GitHub Pages. Dieser Entwicklungsbranch rekonstruiert technische Korrekturen auf Basis von `cd3595477ab20b18f9b0861a006340d7985f33f5`. Die frühere Sitzung und ihr Commit `509b61cf87b7a482bdefc61ea7632e0fd3c3b5c5` sind nicht verfügbar; dies ist eine neue, separat prüfbare Implementierung.

## Lokale Entwicklung

Im Checkout `python3 -m http.server 8000 --bind 127.0.0.1` starten. Die Anwendung benötigt keinen Build. Externe Laufzeitabhängigkeiten sind Supabase, das gepinnte Supabase-JavaScript-Modul auf jsDelivr und optionale Google Fonts. Bei Ladeproblemen erscheinen eine verständliche Meldung und ein Hinweis zum erneuten Laden. Ohne JavaScript wird die erforderliche Aktivierung erklärt.

Supabase schützt Mitgliederdaten und Berechtigungen serverseitig per RLS. Die lokalen Tests verwenden ausschließlich kontrollierte Auth-/Datenantworten; sie verändern keine Supabase-Daten und verschicken keine Anmeldelinks. Öffentliche Anwendungskonfiguration steht in `assets/config.js`; private Zugangsdaten gehören nicht ins Repository.

## Prüfungen

`npm --prefix tests ci`, anschließend bei laufendem HTTP-Server `npm --prefix tests test`. Erforderlich sind Node.js und Chromium; ein abweichender Browserpfad lässt sich mit `CHROMIUM_PATH`, die Testadresse mit `PORTAL_TEST_URL` setzen. Playwright ist im separaten Test-Lockfile gepinnt. Ergebnisse werden lokal in `tests/results*.json` geschrieben. Mit `PORTAL_TEST_DEVICE='iPhone 13'` oder `PORTAL_TEST_DEVICE='iPad (gen 7)'` lässt sich der vollständige Lauf zusätzlich in Geräte-Emulation starten.

Die Tests umfassen 18 Browser-Regressionen, sämtliche 126 Kombinationen sichtbarer Fahrzeugfelder mit sieben Detailthemen (882 Ansichten), 14 festgelegte Sollwertfälle, vier Statuslogik-Prüfungen sowie Desktop-, iPad- und iPhone-Emulation. Einzelheiten und Grenzen: [Reparaturbericht](docs/recovery-report.md).

## Entwicklungs- und Veröffentlichungsstand

`club_modules.status = live` beschreibt den Modulstatus und bestätigt keine vollständige Länderfreigabe. Die Oberfläche zeigt die gemeldeten Länderstatus und Revisionen getrennt von der Online-Version. Das neue versionierte [Release-Manifest](docs/release-manifest.md) verknüpft den HTML-Commit und Hash mit explizit offenen Länderrevisionen und Freigaben. Die tatsächliche fachliche Zuordnung ist weiterhin offen; die produktive Datenbankintegration ist noch nicht implementiert. Fehlende oder fehlerhafte Abfragen werden nicht als Freigabe gewertet.

Dieser Branch ist ein Entwicklungskandidat. Der bestehende veröffentlichte V65-Stand wird durch diese Arbeit weder überschrieben noch neu veröffentlicht. Kein Merge, Deployment oder Datenbankeingriff gehört zum Auftrag. Eine spätere Veröffentlichung benötigt eine ausdrückliche Entscheidung; siehe [Entscheidungsvorlage](docs/release-decision.md).

## Freigabemanifest prüfen

`node scripts/check-release-manifest.mjs` prüft den vorhandenen Entwurf offline gegen Git und HTML. `node scripts/check-release-manifest.mjs --require-approved` liefert für diesen ausdrücklich offenen Entwurf erwartungsgemäß Exitcode 2. Ungültige Daten liefern 1. Eine vollständige Freigabe kann nicht aus dem Modulstatus abgeleitet werden. `npm --prefix tests test` führt jetzt zusätzlich die Manifesttests aus.

Ablauf für Freigabe, Aktualisierung und Rücknahme: [Manifestvertrag](docs/release-manifest.md). Spätere Datenbankänderungen sind ausschließlich als [Vorschlag](docs/database-integration-proposal.md) dokumentiert.

## Spanien-Entwicklung

Auf `feat/spain-country-integration` ist Spanien als fünftes Land mit ausdrücklich ungeprüften Entwurfsansichten ergänzt. Der aktuelle CLI-Standard ist Manifest 0002 (Schema 2). Fachliche Inhalte und unabhängig bestätigte kommunale Umweltzonenregeln sind wegen gesperrter offizieller Quellen noch nicht freigabefähig. Keine Veröffentlichung erfolgt. [Stand, Tests und konkrete Freigabebedingungen](docs/spain-release-review.md).
