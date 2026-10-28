# Vorschlag für spätere Supabase-Integration – nicht ausgeführt

Dieser Auftrag enthält keine SQL-Migration und keine Datenbankänderung. Die bestehende Datenbankstruktur wurde nicht untersucht. Die folgenden Zielstrukturen sind ein zu prüfender Vorschlag; Namen und Datentypen sind kein behaupteter Ist-Zustand.

## Vorgeschlagener Datenvertrag

- Eine Release-Tabelle könnte `module`, Schema-Version, Manifestsequenz, Vorgänger-Manifesthash, Manifesthash, HTML-SHA-256, HTML-Git-Commit und Gesamtstatus speichern. Modul/Sequenz und Manifesthash sollten eindeutig sein. Release-Artefakte nach Anlage unveränderlich halten; jede Änderung wird ein neuer Stand.
- Eine Zuordnungstabelle könnte je Release genau eine Revision für HR, AT, IT und FR enthalten. Die Länderrevision muss auf einen unveränderlichen Inhaltsdatensatz zeigen. Positive Ganzzahlen sind der vorgeschlagene Validatorvertrag; der aktuelle Typ von `content_revision` und eine mögliche Konvertierung müssen zuvor geklärt werden.
- Quellenprüfungen sollten Datum, reale Prüfperson/Benutzer-ID, Quellenreferenzen, archivierte Nachweise und die geprüfte Inhaltsrevision enthalten. Bestehende `last_checked`-Angaben nicht automatisch als abgeschlossene Prüfung migrieren.
- Freigabeereignisse sollten Release/Land/Revision, Status, entscheidende Person, Zeitstempel, Nachweis und gegebenenfalls Rücknahmegrund unveränderlich protokollieren. Freigaberechte ausdrücklich zuweisen; bestehendes `admin:manage` nicht ungeprüft mit fachlicher Freigabebefugnis gleichsetzen. Ob Prüfer und Freigabeverantwortlicher verschieden sein müssen, bleibt eine organisatorische Entscheidung.
- Ein expliziter aktiver Release-Verweis könnte die tatsächlich veröffentlichte Zuordnung bestimmen. Er muss von Modulnavigation (`club_modules.status`) und alten Textfeldern (`online_version`, `development_version`) getrennt bleiben. Ein Text wie V65 stellt ohne belegte Zuordnung keinen Manifesthash dar.

## Integritätsregeln und Berechtigungen

Foreign Keys, Eindeutigkeit und zulässige Statuswerte auf Datenbankebene durchsetzen. Eine transaktionale Freigabefunktion müsste alle vier vollständigen Freigaben sowie unveränderte Inhalts-/HTML-Hashes prüfen. Rücknahmen müssen atomar protokolliert werden und einen späteren operativen Zugriff auf zurückgenommene Inhalte verhindern, ohne andere freigegebene Länder stillschweigend zu verändern. Das erfordert einen ausdrücklich vereinbarten Vertrag zwischen Frontend, aktiver Release-Zuordnung und RLS; clientseitige Statusanzeigen genügen dafür nicht.

RLS sollte normale Mitglieder ausschließlich tatsächlich aktive, freigegebene Länderrevisionen lesen lassen; Redaktion darf Entwürfe entsprechend ihrer Rolle bearbeiten, Freigabeverantwortliche nur im definierten Entscheidungsrahmen entscheiden. Service-Schlüssel dürfen nicht ins Browserportal. Schreibpfade, Auditnachweise, Schutz vor konkurrierenden Updates und Rücknahmeverhalten sind mit eigenen Integrationstests zu prüfen.

## Migrations- und Abnahmeplan

1. Autorisierte Bestandsaufnahme von Tabellen, Typen, Policies, RPCs, realen Länderrevisionen und der belegbaren V65-Zuordnung; keine Zuordnungen erfinden.
2. Zielvertrag und Verantwortlichkeiten abstimmen. Zunächst in einer gesonderten Testdatenbank Migration und Rücknahmeablauf erproben.
3. Bestehende unverifizierte Metadaten als offen importieren; explizite menschliche Abnahme verlangen. Keine automatische Freigabe aus `live`, `published`, `last_checked` oder einem Versionsnamen.
4. Frontend auf exakt passende aktive Manifest-/HTML-Hashes ausrichten; fehlende/abweichende Zuordnungen müssen geschlossen bleiben und verständlich angezeigt werden. Historische Snapshots lesbar und auditierbar erhalten.
5. Erst nach separater ausdrücklicher Freigabe produktive Migration, Aktivierung und gegebenenfalls Deployment planen. Der bestehende V65-Produktivstand bleibt bis dahin unverändert.
