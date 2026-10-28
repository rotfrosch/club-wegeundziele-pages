# Spanien: Entwicklungsstand und gesperrte Veröffentlichung

Basis: `fix/portal-readiness-recovery`, Commit `55a83177b003d1013f1912fcad0461e166975793`.
Arbeitsbranch: `feat/spain-country-integration`, vor Änderungen auf GitHub gesichert.
Stand: 28.10.2026 laut Aufgaben-Datum. Kein Merge, Deployment oder Supabase-Schreibzugriff.

## Tatsächlicher Ausgangsstand

Remote-Abfrage ergab `main` bei `cd3595477ab20b18f9b0861a006340d7985f33f5` und den gewünschten Recovery-Branch. Dessen Manifest 0001 enthält für HR, AT, IT und FR ausdrücklich offene Revisionen, Quellenprüfungen und Freigaben. Die Bezeichnung „vier fertige Länder“ ist daher keine nachgewiesene Veröffentlichungsfreigabe. Alle vier Datensätze werden in Manifest 0002 exakt unverändert übernommen; Manifest 0001 bleibt unverändert. Die vier Basis-Datenobjekte im HTML sind gegenüber dem Ausgangscommit ebenfalls unverändert.

## Implementiert

Spanien steht in derselben Länderauswahl mit allen acht Fahrzeugprofilen und sieben Themenansichten. Separate Eingaben erfassen Fahrzeugklasse, zulässige Masse, Achsen, Gesamthöhe und bei Gespannen Anhängerachsen. Die Eingaben erkennen fehlende/ungültige Werte, die 3.500-kg-Grenze und Widersprüche zum gewählten Wohnmobilprofil. Sie berechnen ausdrücklich keine ungeprüften Tarife, Tempowerte oder Zufahrtsberechtigungen. Achs- und Höhengrenzen in der Eingabe sind technische Eingabegrenzen, keine spanischen Rechts- oder Tarifgrenzen.

Die Umweltzonenansicht enthält eine durchsuchbare, ausdrücklich unvollständige Recherche-Prüfliste für Madrid, Barcelona, València, Málaga, Sevilla und Bilbao. Suche ignoriert Großschreibung und Akzente und behandelt Eingaben als Text. **Null kommunale Regelungen wurden unabhängig bestätigt.** Die Liste ist kein verifiziertes Zonenregister und bestätigt weder Inkrafttreten noch Zugang, Registrierung oder Ausnahmen. Deutsche Wohnmobile erhalten keine pauschale Einfahrtsfreigabe.

Schema 2 ergänzt ES; Schema 1 bleibt für die unveränderte Historie lesbar. ES darf weder fehlen noch durch Schema-Rückstufung verschwinden. Die Veröffentlichungsauskunft verlangt nun auch den ES-Datensatz; fehlende produktive ES-Metadaten führen zu einer unvollständigen Freigabeanzeige. Es wurden keine solchen Daten angelegt. Der CLI-Standard prüft Manifest 0002. Dieses bindet den HTML-Commit und SHA-256 und verweist mit Hash auf 0001.

## Quellenzugriff und fachliche Grenzen

HTTPS-Abrufversuche für `https://www.boe.es/buscar/act.php?id=BOE-A-2003-23514` und `https://www.dgt.es/` wurden vom konfigurierten Proxy mit HTTP 403 abgewiesen. Ein weiterer BOE-Versuch nach Speicherung des Umgebungsentwurfs blieb gesperrt. GitHub und npm funktionieren mit dem erlaubten Netzwerk-Ausführungsmodus. Die frühere Socket-Sperre im normalen Sandbox-Modus ist davon zu unterscheiden.

Die Links im HTML sind ausschließlich Rechercheziele. Es wird weder behauptet, sie gelesen zu haben, noch ein aktueller Rechtsstand bestätigt. Weitere Betreiber- und Kommunalabrufe sowie unabhängige Gegenprüfung stehen aus. `source_review.checked_on` und `reviewed_by` bleiben null; `sources` bleibt leer, statt versuchte Links als abgeschlossene Prüfung auszugeben.

Vor einer Freigabe erforderlich:

1. Offizielle Rechercheziele in den Umgebungseinstellungen freigeben und den tatsächlichen Zugriff erneut prüfen. Installation und Startanleitung sowie Domains sind als Entwurf gespeichert; das speichert keine produktive Website und aktiviert noch keine Netzwerkänderung.
2. BOE/DGT-Regeln mit Rechtsstellen für Pkw, Autocaravana/Aufbauart, Masse bis einschließlich/über 3.500 kg und Gespanne prüfen; Straßenarten, innerörtliche Unterschiede, Überholzeichen und Sonderanordnungen berücksichtigen. Erst dann belastbare Zahlen und Aussagen ergänzen.
3. Relevante mautpflichtige Betreiber/Strecken festlegen. Je Betreiber aktuelle Tarifordnung mit Fahrzeugklassifizierung, Achsen/Bereifung, Höhenmessung, Anhängerregeln, Datum und Grenzen dokumentieren. Keine Betreiberpauschale. Boxakzeptanz und Vertragskosten separat belegen.
4. Kommunale Primärquellen und unabhängige Bestätigung für jede als geprüft markierte ZBE dokumentieren: Zone, Beginn, Betriebszeiten, Emissionsklassen, ausländische Kennzeichen, Registrierung, Ausnahmen und Gültigkeit. Ungeklärtes weiter ausdrücklich als Einzelprüfung darstellen.
5. Die derzeitigen Entwurfsansichten fachlich vervollständigen und mit unabhängig begründeten Sollwerttests für alle Rechts-/Tarifgrenzen prüfen. Die bestandenen Entwurfstests bestätigen diese fachliche Vollständigkeit nicht.
6. Zuständige Freigaben und Revisionen aller Länder belastbar zuordnen; dabei bestehende Historie bewahren. Neues Manifest mit neuer HTML-Bindung und vollständigen Nachweisen prüfen. `--require-approved` muss erfolgreich sein.
7. Live-Authentifizierung, Veröffentlichungsweg und produktive Metadaten getrennt prüfen. Datenbankänderungen benötigen die vom Eigentümer verlangte separate Prüfung und Freigabe. Keine Zugangssperre umgehen. Danach vollständige Regression wiederholen und erst bei erfüllten Bedingungen Merge/Deployment vornehmen.

## Technische Tests und Aussagegrenzen

Die ausführlichen Ergebnisse der tatsächlich abgeschlossenen Läufe werden in `docs/spain-validation/` gesichert. Die Suite prüft pro Gerät 18 Browserregressionen, die bisherigen 126 Profile/882 Detailansichten, 14 festgelegte Sollwertfälle und vier Statuslogikfälle. Für Spanien prüft sie acht Profile/56 Themenansichten, elf Eingabe-/Grenzfälle und vier Suchfälle. Zusätzlich prüfen 31 Manifesttests Historie, Vollständigkeit, Hashbindung und Freigabesperren. Die CLI liefert für den gültigen offenen Entwurf mit `--require-approved` erwartungsgemäß Status 2.

Geräteprüfungen sind Chromium-Emulationen für Desktop, iPad (gen 7) und iPhone 13. Sie ersetzen keine Safari-Prüfung auf echten Apple-Geräten. Authentifizierung und Datenantworten sind ausschließlich kontrollierte lokale Testantworten; externe Browseranfragen werden abgefangen. Kein Zugriff auf produktive Supabase-Daten, keine Anmeldung im Namen echter Mitglieder und keine Umgehung der produktiven Zugangskontrolle. Fachliche Richtigkeit, vollständige kommunale Abdeckung und Live-Betrieb sind damit nicht geprüft.

**Veröffentlichungsentscheidung: blockiert. Spanien ist nicht live veröffentlicht.**
