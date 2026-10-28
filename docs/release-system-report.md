# Bericht: versioniertes Freigabesystem

Ausgangsbranch `fix/portal-readiness-recovery` stand lokal und auf GitHub unverändert auf `77822465ea33ad84f337dbdeb92ebdef7e0e3ce6`. Push-Zugriff wurde vor der Implementierung geprüft. Alle Änderungen wurden ausschließlich auf diesem Entwicklungsbranch schrittweise gesichert und die Remote-Spitze nach jedem Push verglichen.

## Geänderte Dateien

- `releases/countrycheck/manifest-0001.json`: versionierter, ausdrücklich offener Entwurf mit festem HTML-Commit und SHA-256.
- `scripts/release-manifest.mjs`: lokale Validierung von Datenvertrag, Vollständigkeit, Datumsangaben, Freigaben und Übergängen einschließlich Rücknahme.
- `scripts/check-release-manifest.mjs`: CLI mit tatsächlichem Git-/HTML-Abgleich, Prüfung der Arbeitskopie und rekursiver Vorgänger-Hashkette. Keine Netzwerk- oder Schreiboperationen.
- `tests/release-manifest.test.mjs`: 28 automatisierte Prüfungen mit synthetischen Freigabedaten; diese sind keine echten fachlichen Entscheidungen.
- `tests/package.json`: neuer Manifest-Testbefehl und Einbindung in die bestehende Gesamtsuite.
- `.gitignore`: vorübergehende lokale Manifest-Testdateien ausschließen.
- `README.md`, `docs/release-decision.md`: Entwicklungsstand, Prüfkommandos und offene Entscheidungen aktualisiert.
- `docs/release-manifest.md`: vollständiger Datenvertrag sowie Ablauf für Freigabe, Aktualisierung und Rücknahme.
- `docs/database-integration-proposal.md`: ausschließlich vorgeschlagener späterer Datenbankvertrag, Rollen-/RLS-Regeln und Integrationsplan. Keine SQL-Migration ausgeführt oder beigefügt.
- `docs/release-system-report.md`, `docs/release-validation-results.json`: Bericht und maschinenlesbare Nachweise.

## Ergebnis

28 Manifesttests bestanden, keine fehlgeschlagen oder übersprungen. Erfasst sind unter anderem fehlende Länder und Revisionen, HTML-/Git-Widersprüche, unvollständige Verantwortung/Nachweise, falsche Datumsangaben, übernommene Freigaben bei geänderten Inhalten und Rücknahmen mit bzw. ohne korrekte Vorgeschichte. Die CLI wurde auch mit manipulierten HTML-Hashes und nachträglich veränderten Vorgängermanifesten geprüft.

Alle bisherigen Browser-Regressionen wurden erneut auf Desktop, iPad (gen 7) und iPhone 13 ausgeführt. Je Geräteprofil: 18 Browser-Regressionen, 126 Fahrzeugprofile, 882 Detailansichten, 14 feste Sollwertfälle und vier Statuslogik-Tests bestanden; keine unbehandelten Browserfehler. Auth-/Datenantworten sind kontrollierte Testantworten; Chromium-Geräteemulation ersetzt weder Safari noch echte Hardware und ist keine unabhängige rechtliche Prüfung.

Der echte Entwurf ist strukturell gültig (Exitcode 0), aber nicht freigegeben (`--require-approved`: erwarteter Exitcode 2). Für **HR, AT, IT und FR bleiben tatsächliche Länderrevision, Quellenprüfung und fachliche Freigabe einschließlich Verantwortung offen**. Keine historischen Prüftermine oder Datenbankversionsnamen wurden als Beleg übernommen. Das Manifest referenziert unverändert die HTML-Datei aus `7782246`; deren SHA-256 lautet `62c7cab30de2120ff9447440b058cf9decbd601f085b405eb36f8de672e314d8`.

## Grenzen und nächste Entscheidung

Das System bereitet einen prüfbaren Freigabeprozess vor. Es veröffentlicht oder sperrt keine Länder im laufenden Portal. Produktive Aktivierung, operative Rücknahme, Identitäts-/Rollenprüfung, verbindliche Quellenbelege und Datenbankintegration benötigen separate Entscheidungen und Aufträge. Die aktuellen Anwendungdateien einschließlich HTML und Assets wurden gegenüber dem Ausgangscommit nicht verändert. Kein Merge, keine Datenbankänderung, kein Deployment und keine Änderung am V65-Produktivstand.

Die gesicherten Implementierungscommits sind über die Git-Historie nachvollziehbar. Der letzte Berichtcommit und die abschließend verifizierte Remote-Spitze werden im Abschlussbericht der Sitzung genannt; der Commit wird nicht zirkulär in seine eigenen Dateiinhalte geschrieben. Branch: https://github.com/rotfrosch/club-wegeundziele-pages/tree/fix/portal-readiness-recovery
