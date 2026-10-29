# E-Mail-Anmeldelink: Diagnose und sichere nächste Schritte

Stand: 29.10.2026. Projekt: `tsbqqffrjxmekdqjwdso`. Basis: aktuelles main `3cee14b0b960d18c15a716124ff20e2218cb1f1c`. Separater Branch: `fix/email-magic-link-diagnosis`.

## Ergebnis

Der Browsercode verwendet bereits korrekt `shouldCreateUser:false`; das originale SDK erzeugt daraus `create_user:false`. Keine Änderung des Anwendungscodes kann oder darf ein fehlendes Auth-Konto durch Selbstregistrierung ersetzen. Der gemeldete Fehler ist für eine gültige E-Mail-Adresse am ehesten durch ein nicht gefundenes passendes Auth-Konto erklärbar. Welches konkrete Konto betroffen ist und ob es zur angegebenen Adresse passt, ist ohne Zugriff auf die privaten Auth-Daten nicht abschließend bestätigt. Der Versand ist daher **nicht als repariert oder live erfolgreich nachgewiesen**.

Es wurden ausschließlich neue Regressionstests, deren Testkommando und dieser Diagnosebericht samt Ergebnissen ergänzt. Kein Merge, Deployment, produktiver Auth-POST, E-Mail-Versand, Kontoänderung, Einstellungswechsel oder Eingriff in RPC/RLS. Länderinhalte und Anwendungsdateien bleiben unverändert.

## Belegte Beobachtungen

- Der Nutzer berichtet für 29.10.2026 um 00:57 und 00:58 Uhr deutscher Zeit: `POST /auth/v1/otp`, HTTP 422, `otp_disabled`, „Signups not allowed for otp“. Diese Logangaben stammen aus der Nutzer-Mitteilung; die privaten Originalprotokolle waren in dieser Aufgabe nicht über ein verfügbares Supabase-Verwaltungstool zugänglich. Es wird keine eigenständige Einsicht in die Originalprotokolle behauptet.
- Die öffentlich lesbaren Endpunkte `/auth/v1/settings` und `/auth/v1/health` wurden mit der ohnehin öffentlichen Projektkonfiguration per GET abgerufen, ohne Benutzer- oder Schreiboperationen. Beide lieferten HTTP 200. Beobachtet: `external.email=true`, `disable_signup=true`, `mailer_autoconfirm=false`, GoTrue-Version `v2.197.0`.
- Damit ist der Email Provider aktiv, öffentliche Neuregistrierung gesperrt und E-Mail-Bestätigung erforderlich. Die öffentliche Antwort zeigt weder sämtliche privaten Magic-Link-Einstellungen noch Benutzerkonten, Site URL, Redirect-Allowlist oder SMTP-Konfiguration.
- `https://club.wegeundziele.de/` lieferte HTTP 200 und bytegenau die HTML-Datei des genannten main-Commits, einschließlich `shouldCreateUser:false`. Die lokale Diagnose untersucht somit keinen veralteten Login-Code.
- Der lokale Protokolltest lädt den unveränderten Anwendungscode und das originale gepinnte Supabase-SDK. Er fängt sämtliche Backend-Aufrufe vor dem Netzwerk ab. Das tatsächliche SDK-Request-JSON enthält `create_user:false`; `redirect_to` entspricht der aktuellen Test-Origin mit `/`. Es wurde kein OTP-Request an Supabase weitergeleitet.

Maschinenlesbare Belege: [observations.json](observations.json), [SDK-Protokolltests](sdk-protocol-results.json), [Login-Regressionslauf](login-results.json).

## Einordnung anhand der tatsächlich eingesetzten Auth-Version

Der offizielle Quellcode von [GoTrue v2.197.0: otp.go](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/api/otp.go) prüft bei `create_user:false` mit `FindUserByEmailAndAudience`, ob ein passender Auth-Benutzer vorhanden ist. Wird keiner gefunden, kommt `false` zurück; der OTP-Endpunkt antwortet dann exakt mit HTTP 422, `otp_disabled`, „Signups not allowed for otp“.

Die [Benutzersuche derselben Version](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/models/user.go) berücksichtigt die E-Mail-Adresse ohne Groß-/Kleinschreibung, Audience und `is_sso_user=false`. Ein Eintrag in einer Club-Mitgliedertabelle oder eine organisatorische Freigabe ersetzt kein passendes Supabase-Auth-Konto. Eine andere E-Mail-Adresse, ein Konto in einem anderen Projekt oder eine nicht passende Audience/SSO-Zuordnung muss deshalb getrennt von der Clubfreigabe betrachtet werden.

Grenze dieser Ableitung: Auch ein Fehler der E-Mail-Validierung kann in dieser Version im selben `!ok`-Zweig landen. Ohne den anonymisierten tatsächlichen Request ist „Konto fehlt“ deshalb eine starke Arbeitshypothese für gültige E-Mail-Adressen, kein bestätigter Befund über ein konkretes Mitglied. Es wurde kein unbekanntes Konto durch Testanfragen gesucht.

Der globale Schalter für Neuregistrierung ist keine pauschale Abschaltung des E-Mail-Logins bestehender bestätigter Auth-Benutzer. Laut [offizieller Konfigurationsdokumentation](https://supabase.com/docs/guides/auth/general-configuration) dürfen bei gesperrter Registrierung bestehende Benutzer weiterhin einloggen. Die [Passwordless-Dokumentation](https://supabase.com/docs/guides/auth/auth-email-passwordless) empfiehlt ausdrücklich `shouldCreateUser:false`, um automatische Registrierung zu verhindern.

Ein ausgeschalteter Email Provider oder Magic-Link-Schalter wird erst in [magic_link.go derselben Version](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/api/magic_link.go) geprüft und würde `email_provider_disabled` mit „Email logins are disabled“ beziehungsweise „Login with magic link is disabled“ liefern. Das unterscheidet sich vom gemeldeten `otp_disabled`. Der konkrete Fehler wird vor dem eigentlichen Magic-Link-Versand und vor dessen SMTP-Verarbeitung erzeugt. Redirect- oder SMTP-Probleme sind daher keine belegte Erklärung für diesen Logeintrag, können aber nach Beseitigung des ersten Hindernisses zusätzlich auffallen.

Ein vorhandenes, aber unbestätigtes Konto kann im späteren Magic-Link-Pfad als noch nicht abgeschlossene Registrierung behandelt werden. Sein Bestätigungsstatus muss deshalb ebenfalls geprüft werden. Das ist ein möglicher zusätzlicher Folgefehler und darf nicht mit dem hier protokollierten fehlgeschlagenen Lookup gleichgesetzt werden. `Confirm Email` wird nicht zur Umgehung abgeschaltet.

## Sichere Lösung und exakte Dashboard-Prüfpunkte

Es ist derzeit **kein zwingend zu ändernder Dashboard-Schalter nachgewiesen**. Öffentliche Registrierung einzuschalten oder `shouldCreateUser:true` zu setzen wäre keine zulässige Lösung.

1. **Authentication → Users** ([Projektseite](https://supabase.com/dashboard/project/tsbqqffrjxmekdqjwdso/auth/users)): Die tatsächlich eingegebene, gültige Adresse mit dem bereits vorhandenen Auth-Konto abgleichen; Projekt, E-Mail-Identität und Bestätigungsstatus prüfen. Ist das Konto vorhanden und bestätigt, dessen tatsächliche Login-Adresse verwenden. Ist es nicht vorhanden oder eine Benutzerkorrektur notwendig, hält diese Aufgabe hier an: Das Erstellen, Einladen, Bestätigen oder Ändern eines Benutzers benötigt einen gesondert autorisierten Benutzerverwaltungsauftrag. In dieser Aufgabe wurde nichts davon ausgeführt.
2. **Authentication → Sign In / Providers** ([Projektseite](https://supabase.com/dashboard/project/tsbqqffrjxmekdqjwdso/auth/providers)): **Allow new users to sign up bleibt AUS**. Unter **Email** bleibt der Email Provider aktiv. Der bereits öffentlich bestätigte Providerstatus erfordert keine Änderung. Eine eventuell separat angebotene Magic-Link-Aktivierung darf nur nach privater Einsicht und ausdrücklicher Freigabe geändert werden; der gemeldete Fehler belegt deren Abschaltung nicht. Eine solche Aktivierung würde den Loginweg für bestehende Konten ergänzen, ersetzt aber keine Mitgliedsprüfung und darf öffentliche Registrierung nicht aktivieren.
3. **Authentication → URL Configuration** ([Projektseite](https://supabase.com/dashboard/project/tsbqqffrjxmekdqjwdso/auth/url-configuration)): Erwartete **Site URL** ist `https://club.wegeundziele.de/`. Die vom Code erzeugte Rücksprungadresse für die Login-Startseite ist ebenfalls exakt `https://club.wegeundziele.de/`; sie muss durch die erlaubte URL-Konfiguration abgedeckt sein. Tatsächlich gespeicherte Werte waren nicht lesbar und werden nicht als korrekt behauptet. Falls abweichend, wäre die minimale notwendige Änderung nach Freigabe: Site URL auf die genannte HTTPS-Adresse setzen und die konkrete Rücksprungadresse in **Redirect URLs** zulassen. Keine Wildcard über fremde Hosts hinzufügen. Sicherheitsfolge: Die Allowlist kontrolliert zulässige Ziele für Auth-Rücksprünge; eine unnötig breite Liste erhöht das Risiko unerwünschter Token-/Sitzungsweiterleitung.
4. **Authentication → Email / SMTP Settings**: Nur bei einem nachfolgenden Versandfehler prüfen, ob Custom SMTP eingerichtet ist. Laut [Supabase-SMTP-Dokumentation](https://supabase.com/docs/guides/auth/auth-smtp) darf der Standardversand nur an Adressen aus dem Projektteam senden und kann für andere Adressen `email_address_not_authorized` liefern. Custom SMTP zu konfigurieren ist eine getrennte produktive Änderung; keine Zugangsdaten gehören ins Browser-Repository. Der aktuelle Fehler ist kein Nachweis eines SMTP-Problems.

Bestehende bestätigte Auth-Konten können bei deaktivierter Selbstregistrierung mit `shouldCreateUser:false` einen Link erhalten; nach Rückkehr müssen weiterhin die bestehende RPC-Prüfung und RLS über den tatsächlichen Mitgliederzugriff entscheiden. Keine Kontoänderung oder Dashboard-Einstellung ersetzt diese Freigabe.

Nach dem Kontenabgleich ist ein ausdrücklich bereitgestelltes, bestehendes Testkonto nötig, um Zustellung, Linkrückkehr und anschließende Mitglieds-/Adminberechtigungen Ende zu Ende zu prüfen. Ohne einen solchen Zugang wird keine echte E-Mail versendet und kein Erfolg behauptet. Diese Aufgabe hat keine produktiven Einstellungen geändert und stellt keinen weiteren Freigabeantrag für eine unbelegte Einstellungsänderung.

## Tests und Dateien

Ausgeführt: `npm --prefix tests ci`, `npm --prefix tests test` sowie `npm --prefix tests run test:email-link`.

| Gerät | Bestehende Login-Prüfungen und Fehler-/Berechtigungsregressionen | Neue SDK-Protokollprüfungen | Ergebnis |
| --- | --- | --- | --- |
| Desktop | 23 | 3 | 26 bestanden |
| iPad (gen 7), Chromium-Emulation | 23 | 3 | 26 bestanden |
| iPhone 13, Chromium-Emulation | 23 | 3 | 26 bestanden |
| Gesamt | 69 | 9 | 78 bestanden, 0 fehlgeschlagen |

Die neuen Prüfungen simulieren mit dem originalen SDK HTTP 422/`otp_disabled`, HTTP 422/`email_provider_disabled` und HTTP 200. In allen neun Fällen wurde `create_user:false` im tatsächlich erzeugten Request bestätigt. Die UI zeigt bei 422 einen Fehler, bei 200 die vorhandene Erfolgsmeldung; daraus wird keine reale Zustellung abgeleitet. Es werden keine Backend-Aufrufe weitergeleitet. Die bestehenden Prüfungen enthalten Passwortanmeldung, Adminschutz, Ladefehler, E-Mail-Fehleranzeigen und die unveränderte echte RPC-Anbindung gegenüber kontrollierten lokalen Serverantworten.

Geänderte Dateien gegenüber main: `tests/email-link-protocol.cjs`, `tests/package.json`, `docs/email-link-diagnosis/report.md`, `docs/email-link-diagnosis/observations.json`, `docs/email-link-diagnosis/login-results.json`, `docs/email-link-diagnosis/sdk-protocol-results.json`. Keine Laufzeitkorrektur, da kein unsicherer oder fehlerhafter `create_user`-Wert nachgewiesen wurde. Die bestehende allgemeine Fehlermeldung vermeidet zudem, öffentlich zu verraten, ob eine konkrete E-Mail als Auth-Konto existiert.

Grenzen: keine Einsicht in private Auth-Logs, Benutzerliste, private Einstellungen oder RLS-Definitionen; kein echtes Login und keine reale Zustellung mit Mitgliedskonten. Apple-Geräte wurden in Chromium emuliert, nicht mit Safari auf realer Hardware geprüft. Die Anwendung und ihre Zugriffsregeln wurden nicht verändert.
