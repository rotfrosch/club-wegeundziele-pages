# Offene Entscheidung: HTML-Version und Länderrevisionen

Die Datenbank meldet `online_version`, `development_version` und je Land `publish_status` sowie `content_revision`. Im Repository fehlt ein verbindliches Manifest, das einen bestimmten HTML-/Git-Stand den vier freigegebenen Länderrevisionen HR, AT, IT und FR zuordnet. Aus einem Modulstatus `live` oder vier vorhandenen Datensätzen darf diese Zuordnung nicht abgeleitet werden. Auch Bezeichnungen wie `published` sind ohne bestätigte Statusdefinition keine ausreichende Veröffentlichungsgarantie.

Vor einer Veröffentlichung sind ausdrücklich festzulegen:

1. Welche unveränderliche HTML-Version bzw. welcher Git-Commit veröffentlicht werden soll.
2. Welche konkreten vier Länderrevisionen dazu gehören und welcher Status jeweils fachliche Freigabe bedeutet.
3. Wer Quellenprüfung, Abnahme und Freigabe verantwortet und wie Rücknahme/Abweichungen dargestellt werden.
4. Ob diese Zuordnung durch ein versioniertes Release-Manifest oder einen ausdrücklich vereinbarten Datenbankvertrag erfolgt.

Empfehlung zur Entscheidung: Ein versioniertes Manifest könnte HTML-Commit, Länderrevisionen, Prüftermine und Freigaben nachvollziehbar verknüpfen. Dieses Dokument implementiert ein solches Manifest nicht und legt keine Revisionen oder Freigaben fest. Jede Datenbankänderung und jede Veröffentlichung bleibt einem gesonderten Auftrag vorbehalten.

Die vorhandenen juristischen Texte und Prüfsiegel im Ländercheck stammen aus dem Ausgangsstand. Technische Regressionstests ersetzen keine unabhängige Prüfung der Originalquellen und bestätigen keine rechtliche Richtigkeit.
