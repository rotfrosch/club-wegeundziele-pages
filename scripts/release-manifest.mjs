import {createHash} from 'node:crypto';
export const COUNTRIES = ['HR', 'AT', 'IT', 'FR'];
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const https = value => {try {const u = new URL(value);return u.protocol === 'https:' && !u.username && !u.password;} catch {return false;}};

// Pure validation: no network, database, publication or filesystem side effects.
export function validateManifest(manifest, {previous = null, today = new Date().toISOString().slice(0,10)} = {}) {
  const errors = [], open = [];
  const require = (condition, message) => {if (!condition) errors.push(message);};
  if (!object(manifest)) return {errors:['Manifest muss ein Objekt sein.'], open, ready:false};
  const m = manifest;
  require(m.schema_version === 1, 'Unbekannte schema_version.');
  require(Number.isInteger(m.sequence) && m.sequence > 0, 'sequence muss positiv und ganzzahlig sein.');
  require(m.module === 'countrycheck', 'Falsches Modul.');
  require(['draft','approved','withdrawn'].includes(m.status), 'Ungültiger Manifeststatus.');
  const a = object(m.artifact) ? m.artifact : {};
  require(typeof a.git_commit === 'string' && /^[a-f0-9]{40}$/.test(a.git_commit), 'artifact.git_commit muss ein vollständiger Commit sein.');
  require(a.path === 'maut-laenderinfo/index.html', 'Unerwarteter HTML-Pfad.');
  require(digest(a.sha256), 'HTML-SHA-256 fehlt oder ist ungültig.');
  require(a.html_version === `sha256:${a.sha256}`, 'HTML-Version widerspricht dem SHA-256-Wert.');
  if (m.sequence === 1) {
    require(m.previous === null && previous === null, 'Erstes Manifest darf keinen Vorgänger haben.');
  } else {
    require(object(m.previous) && text(m.previous.path) && digest(m.previous.sha256), 'Vorgängerreferenz fehlt.');
    require(object(previous), 'Vorgängermanifest muss zur Prüfung vorliegen.');
    if (object(previous)) require(previous.sequence === m.sequence - 1, 'Manifestsequenz widerspricht dem Vorgänger.');
  }
  const rows = object(m.countries) ? m.countries : {};
  require(Object.keys(rows).length === 4 && Object.keys(rows).every(code => COUNTRIES.includes(code)), 'Genau HR, AT, IT und FR sind erforderlich.');
  let withdrawn = false;
  for (const code of COUNTRIES) {
    const c = rows[code];
    if (!object(c)) {errors.push(`${code}: Länderdatensatz fehlt.`);continue;}
    const prefix = `${code}: `;
    const revision = c.content_revision;
    require(revision === null || (Number.isSafeInteger(revision) && revision > 0), prefix+'Länderrevision muss positiv oder ausdrücklich null sein.');
    if (revision === null) open.push(prefix+'Länderrevision offen.');
    const review = object(c.source_review) ? c.source_review : {};
    const approval = object(c.approval) ? c.approval : {};
    require(object(c.source_review) && object(c.approval), prefix+'Quellenprüfung oder Freigabeobjekt fehlt.');
    require(['open','approved','withdrawn'].includes(approval.status), prefix+'Freigabestatus ungültig.');
    for (const [name,value] of [['checked_on',review.checked_on],['decided_on',approval.decided_on]]) {
      require(value === null || (date(value) && value <= today), prefix+name+' fehlt, liegt in der Zukunft oder ist ungültig.');
    }
    for (const [name,value] of [['reviewed_by',review.reviewed_by],['responsible',approval.responsible],['evidence',approval.evidence],['reason',approval.reason]]) {
      require(value === null || text(value), prefix+name+' muss Text oder ausdrücklich null sein.');
    }
    require(Array.isArray(review.sources) && review.sources.every(https), prefix+'Quellen müssen eine Liste von HTTPS-URLs sein.');
    const reviewed = date(review.checked_on) && text(review.reviewed_by) && Array.isArray(review.sources) && review.sources.length > 0;
    if (!reviewed) open.push(prefix+'Quellenprüfung offen.');
    if (approval.status === 'open') {
      open.push(prefix+'Fachliche Freigabe offen.');
      require(approval.decided_on === null && approval.evidence === null && approval.reason === null, prefix+'Offene Freigabe darf keine Entscheidung behaupten.');
    }
    if (approval.status === 'approved') {
      require(revision !== null && revision !== undefined && reviewed, prefix+'Freigabe ohne Länderrevision oder Quellenprüfung.');
      require(text(approval.responsible) && date(approval.decided_on) && text(approval.evidence), prefix+'Freigabeverantwortung, Datum oder Nachweis fehlt.');
      require(approval.reason === null, prefix+'Freigabe enthält einen Rücknahmegrund.');
      if (date(review.checked_on) && date(approval.decided_on)) require(review.checked_on <= approval.decided_on, prefix+'Freigabe liegt vor Quellenprüfung.');
    }
    if (approval.status === 'withdrawn') {
      withdrawn = true;
      open.push(prefix+'Freigabe zurückgenommen.');
      require(text(approval.responsible) && date(approval.decided_on) && text(approval.evidence) && text(approval.reason), prefix+'Rücknahme braucht Verantwortung, Datum, Nachweis und Grund.');
    }
    const prior = previous?.countries?.[code];
    if (object(prior)) {
      const sameContent = prior.content_revision === revision && previous.artifact?.html_version === a.html_version;
      if (approval.status === 'withdrawn') {
        require(JSON.stringify(c.source_review) === JSON.stringify(prior.source_review), prefix+'Rücknahme muss den bisherigen Quellenprüfnachweis bewahren.');
        if (date(prior.approval?.decided_on) && date(approval.decided_on)) require(approval.decided_on >= prior.approval.decided_on, prefix+'Rücknahme liegt vor der vorherigen Entscheidung.');
        require(['approved','withdrawn'].includes(prior.approval?.status) && sameContent, prefix+'Rücknahme muss eine zuvor freigegebene, unveränderte Zuordnung betreffen.');
      }
      if (approval.status === 'approved' && (!sameContent || prior.approval?.status !== 'approved' || JSON.stringify(c.source_review) !== JSON.stringify(prior.source_review))) {
        require(approval.evidence !== prior.approval?.evidence && text(approval.evidence), prefix+'Geänderter oder zurückgenommener Inhalt braucht eine neue Freigabeentscheidung.');
      }
      if (date(prior.approval?.decided_on) && date(approval.decided_on)) require(approval.decided_on >= prior.approval.decided_on, prefix+'Entscheidungsdatum läuft rückwärts.');
      if (Number.isSafeInteger(prior.content_revision)) require(revision !== null, prefix+'Bekannte Länderrevision darf nicht gelöscht werden.');
      if (Number.isSafeInteger(prior.content_revision) && Number.isSafeInteger(revision)) {
        require(revision >= prior.content_revision, prefix+'Länderrevision darf nicht rückwärts laufen.');
      }
    } else if (approval.status === 'withdrawn') errors.push(prefix+'Rücknahme ohne dokumentierte vorherige Freigabe.');
  }
  require(!withdrawn || m.status === 'withdrawn', 'Zurückgenommenes Land erfordert Manifeststatus withdrawn.');
  require(m.status !== 'withdrawn' || withdrawn, 'Manifeststatus withdrawn ohne zurückgenommenes Land.');
  const allApproved = COUNTRIES.every(code => rows[code]?.approval?.status === 'approved');
  require(m.status !== 'approved' || allApproved, 'Manifestfreigabe ohne vollständige Länderfreigaben.');
  if (m.status !== 'approved') open.push('Manifest ist nicht freigegeben.');
  return {errors, open, ready:errors.length === 0 && open.length === 0 && allApproved};
}
