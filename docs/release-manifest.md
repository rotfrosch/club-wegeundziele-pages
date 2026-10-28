# Versioniertes Freigabemanifest für Maut & Länderinfo

## Geltungsbereich

`releases/countrycheck/manifest-0001.json` ist der erste **Entwurf**, keine fachliche Freigabe. Er bindet die vorhandene HTML-Datei an Git-Commit `77822465ea33ad84f337dbdeb92ebdef7e0e3ce6` und ihren SHA-256-Wert. Der Manifestcommit darf später sein als der HTML-Commit; dadurch entsteht keine zirkuläre Selbstreferenz. Der Hash beschreibt die HTML-Datei, nicht den gesamten Laufzeitzustand, CDN-Inhalte oder Supabase-Daten. Der Git-Commit hält zusätzlich den damaligen Repositorystand nachvollziehbar fest.

Für HR, AT, IT und FR sind `content_revision`, Quellenprüfdatum, Prüfverantwortung und Freigabeverantwortung unbekannt und deshalb ausdrücklich `null`; Quellenlisten sind leer und Länderstatus ist `open`. Die in der bestehenden HTML-Datei genannten Prüftermine werden **nicht** als nachgewiesene Quellenprüfung übernommen. Die Datenbank wurde für diesen Auftrag nicht abgefragt oder geändert.

Der Validator arbeitet lokal und lesend. Er ändert keine Dateien, Datenbankwerte, Routingregeln oder Berechtigungen. Das Portal wird durch das Manifest weder freigeschaltet noch gesperrt. Seine bisherigen vorsichtigen Statusanzeigen bleiben bestehen. Ein gültiges Manifest ist keine Veröffentlichung und keine kryptografisch signierte fachliche Bestätigung.

## Datenvertrag, Schema-Version 1

| Feld | Bedeutung und Regel |
| --- | --- |
| `schema_version` | Exakt 1; andere Versionen werden abgewiesen. |
| `module` | Exakt `countrycheck`. |
| `sequence` | Positive fortlaufende Manifestnummer. |
| `previous` | Beim ersten Manifest `null`; danach Repositorypfad und SHA-256 der unveränderten Vorgängerdatei. |
| `status` | `draft`, `approved` oder `withdrawn`. Nur vier vollständige Länderfreigaben erlauben `approved`. |
| `artifact.git_commit` | Vollständiger Git-Commit, dessen HTML-Bytes tatsächlich geprüft werden. Kein Branchname. |
| `artifact.path` | Exakt `maut-laenderinfo/index.html`. |
| `artifact.sha256` | SHA-256 der unveränderlichen HTML-Datei. |
| `artifact.html_version` | Exakt `sha256:` gefolgt vom selben Hash; keine Gleichsetzung mit V65 oder Datenbankversionsnamen. |
| `countries` | Genau HR, AT, IT und FR; keine fehlenden oder zusätzlichen Länder. |
| `content_revision` | Positive sichere Ganzzahl oder ausdrücklich `null`, wenn unbekannt. Fehlende Eigenschaften sind Fehler. |
| `source_review.checked_on` | Nachgewiesenes Kalenderdatum `YYYY-MM-DD` oder `null`; keine zukünftigen Daten. |
| `source_review.reviewed_by` | Nachvollziehbare Prüfperson oder `null`. |
| `source_review.sources` | Tatsächlich geprüfte HTTPS-Quellen, ohne Zugangsdaten in der URL. Leere Liste bedeutet offen. Dauerhafte Archiv-/Nachweislinks sind vorzuziehen. |
| `approval.status` | `open`, `approved`, `withdrawn`. `live` ist kein Freigabestatus. |
| `approval.responsible` | Identifizierbare verantwortliche Person oder ausdrücklich `null`. Eine bekannte künftige Zuständigkeit darf auch bei `open` eingetragen werden; sie ersetzt keine Entscheidung. |
| `approval.decided_on` | Entscheidungsdatum oder `null`. Freigabe darf nicht vor Quellenprüfung liegen; Folgeentscheidungen dürfen nicht zeitlich zurücklaufen. |
| `approval.evidence` | Dauerhafte, eindeutig unterscheidbare Referenz der Freigabe-/Rücknahmeentscheidung oder `null`. Kein automatischer Nachweis allein aus einem Git-Push. |
| `approval.reason` | Bei Rücknahme erforderlich; bei offenen und freigegebenen Einträgen `null`. |

Eine Länderfreigabe benötigt Revision, vollständige Quellenprüfung, verantwortliche Person, Entscheidungsdatum und Entscheidungsnachweis. Ein offener Eintrag darf keine abgeschlossene Entscheidung behaupten. Ein einzelnes zurückgenommenes Land erzwingt `status: withdrawn` für den gesamten Manifeststand. Andere Länder behalten ihre eigenen dokumentierten Status.

## Prüfung

Im Repository:

```sh
node scripts/check-release-manifest.mjs
node scripts/check-release-manifest.mjs releases/countrycheck/manifest-0001.json --require-approved
npm --prefix tests run test:manifest
```

Exitcodes: **0** = strukturell und gegen Git/Arbeitskopie gültig; bei `--require-approved` zusätzlich vollständig freigegeben. **1** = fehlerhafte Daten, Hash-/Git-Widerspruch, fehlende Datei oder ungültige Historie. **2** = strukturell gültiger, aber offener oder zurückgenommener Stand bei `--require-approved`.

Das aktuelle echte Manifest liefert ohne Freigabeanforderung 0 und mit `--require-approved` absichtlich 2. Es ist kein Fehler, unbekannte Daten ehrlich offen zu lassen. Es wäre ein Fehler, diesen Entwurf als freigegeben zu behandeln.

Für einen späteren Stand muss der konkrete neue Manifestpfad angegeben werden. Es gibt keinen automatisch auf den neuesten oder einen freigegebenen Stand umschaltenden Zeiger. Alle Vorgänger werden rekursiv mit ihrem Datei-Hash und ihrem HTML-Commit geprüft; die Arbeitskopie muss nur zum ausgewählten aktuellen Manifest passen. Ältere HTML-Stände dürfen sich von der aktuellen Arbeitskopie unterscheiden. Der Checkout benötigt die referenzierten Git-Objekte. Der Validator ruft weder GitHub noch Supabase auf.

## Freigabe eines Landes

1. Bestehendes Manifest und dessen Git-Commit erhalten. Neuen fortlaufenden Snapshot `manifest-0002.json` usw. anlegen, `sequence` erhöhen und `previous.path` samt SHA-256 der unveränderten Vorgängerdatei setzen. Bereits gesicherte Snapshots nicht überschreiben.
2. Zuständige Fachperson und Entscheidungsbefugnis außerhalb des Validators verbindlich festlegen. Den tatsächlich zu prüfenden HTML-Commit und Hash eintragen; vorhandene Produktiv-Versionsnamen nicht umdeuten.
3. Reale Länderrevision und dokumentierte unabhängige Quellenprüfung eintragen. Die Fachperson entscheidet für genau diese Zuordnung. Ohne dokumentierte Entscheidung bleibt `approval.status: open`.
4. Nach ausdrücklicher Entscheidung Person, Datum und dauerhaften Nachweis eintragen und nur das betroffene Land auf `approved` setzen. Erst bei allen vier vollständigen Freigaben darf der Manifeststatus `approved` werden. Die Validatorprüfung bestätigt Vollständigkeit/Konsistenz, nicht die Identität oder Befugnis einer Person.
5. Validator und Regressionen ausführen, den Snapshot ausschließlich auf dem Entwicklungsbranch committen, pushen und den Remote-Commit vergleichen. Ein späterer Merge oder ein Deployment benötigt weiterhin einen gesonderten ausdrücklichen Auftrag.

## Aktualisierung

Ein neuer HTML-Hash, eine geänderte Länderrevision oder ein geänderter Quellenprüfnachweis benötigt eine neue Entscheidung; die bisherige Freigabereferenz darf nicht übernommen werden. Beim monolithischen HTML-Dokument betrifft ein geänderter Hash konservativ alle vier Länderzuordnungen. Für eine fachlich unabhängige Freigabe einzelner Länder wären später getrennt versionierte Länderartefakte sinnvoll.

Neue Inhalte zunächst als `open` führen, Quellen erneut prüfen und einen neuen Snapshot erstellen. Bekannte Revisionen dürfen weder gelöscht noch vermindert werden. Bei einer fachlichen Rückkehr zu älteren Texten wird eine neue höhere Revision vergeben; der historische Inhalt darf wiederverwendet werden, die historische Freigabe nicht. Ein zurückgenommener Inhalt wird ausschließlich durch einen neuen Snapshot mit neuer dokumentierter Entscheidung wieder freigegeben.

## Rücknahme

Für die Rücknahme einen neuen Snapshot mit derselben HTML-/Länderzuordnung erstellen. Den bisherigen Quellenprüfnachweis erhalten und das zuvor freigegebene Land mit verantwortlicher Person, Datum, neuem Entscheidungsnachweis und Grund auf `withdrawn` setzen. Manifeststatus ebenfalls `withdrawn`. `--require-approved` muss den Stand ablehnen. Vorherige Freigaben bleiben über die Snapshotkette und Git-Historie nachvollziehbar.

Das ist eine **dokumentierte Rücknahme**, kein operativer Eingriff in das bestehende Portal. Eine spätere produktive Sperre oder ein Rollback benötigt die noch nicht implementierte Integration und einen separaten Auftrag. Keinesfalls als Ersatz einer Rücknahme eigenständig das bestehende V65-Deployment verändern.

## Nachweisgrenzen

Git-Historie und verkettete Hashes machen Änderungen prüfbar; sie verhindern keine autorisierte Umschreibung der gesamten Historie. Geschützte Branches, Reviewregeln, vertrauenswürdige Entscheidungsnachweise und gegebenenfalls Signaturen müssen organisatorisch vereinbart werden. Der Validator kann Rechtsrichtigkeit, Personenidentität und externe Belege nicht selbst bestätigen.
