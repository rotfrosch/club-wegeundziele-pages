# Rekonstruktion der Portal-Korrekturen

Ausgangsstand: `cd3595477ab20b18f9b0861a006340d7985f33f5`.
Entwicklungsbranch: `fix/portal-readiness-recovery`.
Die verlorene Implementierung und ihre Testartefakte konnten nicht wiederhergestellt werden. Die Tests in diesem Branch sind neu erstellt; die frühere Anzahl von 14 geänderten Dateien ist kein Nachweis für Identität der Implementierungen.

## Änderungen

- `assets/readiness.js`: gemeinsamer sichtbarer Ladestatus, Zeitgrenze für CDN-Laden und Startvorgang, verständliche Fehlermeldung.
- `index.html`: abgefangener Startfehler, Hinweis bei `denied=1`, getrennte Darstellung von Modulstatus und Länderfreigabe, JavaScript-Hinweis.
- `admin/index.html`: Behandlung fehlender/fehlerhafter Versions- und Länderabfragen; Textausgabe statt HTML-Einfügung für Datenbankfelder; Hinweis bei leerer Länderliste.
- `maut-laenderinfo/index.html`: abgefangene Auth-/Startfehler, gemeldete Revisionen und offene HTML-Zuordnung, verknüpfte Labels für alle neun Auswahlfelder, ignorierte Werte unsichtbarer Zusatzfelder in Berechnung und Details, JavaScript-Hinweis.
- `assets/publication.js`: keine Freigabe allein aus Modulstatus oder vorhandenen Länderzeilen ableiten.
- `tests/*`, `.gitignore`: separater, gepinnter Browser-Testaufbau und lokale Ergebnisdatei.
- `README.md`, `docs/*`: tatsächlicher Entwicklungsstand, Prüfumfang und offene Release-Entscheidung.

## Prüfstatus

Der endgültige Prüfstatus wird nach dem vollständigen Lauf ergänzt. Die Matrix wird aus tatsächlich sichtbaren Zusatzfeldern erzeugt, nicht auf die gewünschte Anzahl aufgefüllt. Die 14 Sollwertfälle prüfen feste Mautklassen und Geschwindigkeitsangaben aus dem Ausgangsstand für alle vier Länder und ausgewählte Achs-, Brems-, Höhen- und Gewichtsschwellen. Die Ergebnisdatei enthält die tatsächlich geprüften Profile und Sollwerte.

## Grenzen

Testantworten ersetzen Authentifizierung und Supabase-Datenzugriff; alle externen Anfragen der JavaScript-Browsertests werden blockiert. Kein echter Mitgliederzugang, keine Produktions-RLS-Prüfung, keine Datenbankänderung und keine Veröffentlichung. Chromium emuliert iPad/iPhone; dies ist kein Test von Safari/WebKit oder echter Hardware. Labels, Tastaturbedienung und JavaScript-Hinweise werden gezielt geprüft; es erfolgt keine vollständige WCAG-Zertifizierung. Maut- und Verkehrsangaben werden auf Bestandsverhalten geprüft und nicht als unabhängig rechtlich verifiziert erklärt.
