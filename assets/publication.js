// A module flag is navigation metadata, not a country/content approval.
export function countryPublication(moduleStatus, countries, queryFailed = false) {
  if (queryFailed || !Array.isArray(countries)) return 'Länderfreigabe nicht verfügbar';
  const expected = ['HR', 'AT', 'IT', 'FR'];
  const present = expected.filter(code => countries.some(c => c.iso_code === code));
  if (present.length !== expected.length) return 'Länderfreigabe unvollständig';
  const summary = expected.map(code => {
    const row = countries.find(c => c.iso_code === code);
    return `${code}: ${row.publish_status || 'unbekannt'} (Revision ${row.content_revision ?? 'unbekannt'})`;
  }).join(' · ');
  return `${summary} · HTML-Zuordnung und Freigabe nicht bestätigt`;
}
