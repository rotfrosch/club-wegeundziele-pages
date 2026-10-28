import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdtempSync, rmSync} from 'node:fs';
import {dirname, resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {validateManifest, sha256, COUNTRIES} from '../scripts/release-manifest.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const draft = JSON.parse(readFileSync(join(root,'releases/countrycheck/manifest-0001.json')));
const copy = value => structuredClone(value);
const validate = (value, previous = null) => validateManifest(value,{previous,today:'2026-10-28'});
// Synthetic fixtures: these names, dates and decisions are not real approvals.
function approved() {
  const m = copy(draft);m.status='approved';
  for (const code of COUNTRIES) m.countries[code] = {
    content_revision:1,
    source_review:{checked_on:'2026-10-27',reviewed_by:'TEST reviewer',sources:['https://example.invalid/test-source']},
    approval:{status:'approved',responsible:'TEST approver',decided_on:'2026-10-28',evidence:'TEST decision 1',reason:null}
  };
  return m;
}
function next(previous) {
  const m=copy(previous);m.sequence++;m.previous={path:'tests/fixture.json',sha256:'a'.repeat(64)};return m;
}
function invalid(m, pattern, previous=null) {assert.match(validate(m,previous).errors.join('\n'),pattern);assert.equal(validate(m,previous).ready,false);}

test('Explicitly open draft is structurally valid but never ready',()=>{
  const r=validate(draft);assert.deepEqual(r.errors,[]);assert.equal(r.ready,false);assert.equal(r.open.length,13);
});
test('Missing country is invalid',()=>{const m=copy(draft);delete m.countries.FR;invalid(m,/FR: Länderdatensatz fehlt/);});
test('Missing revision property differs from explicitly unknown null',()=>{const m=copy(draft);delete m.countries.HR.content_revision;invalid(m,/HR: Länderrevision/);});
test('Approval cannot omit country revision',()=>{const m=approved();m.countries.IT.content_revision=null;invalid(m,/IT: Freigabe ohne Länderrevision/);});
test('HTML version cannot contradict its digest',()=>{const m=copy(draft);m.artifact.html_version='V65';invalid(m,/HTML-Version widerspricht/);});
test('Commit must be a full immutable SHA',()=>{const m=copy(draft);m.artifact.git_commit='main';invalid(m,/vollständiger Commit/);});
test('Country approval needs named responsibility',()=>{const m=approved();m.countries.AT.approval.responsible=null;invalid(m,/AT: Freigabeverantwortung/);});
test('Country approval needs decision evidence',()=>{const m=approved();m.countries.FR.approval.evidence=null;invalid(m,/FR: Freigabeverantwortung/);});
test('Source review cannot be guessed or omitted',()=>{const m=approved();m.countries.FR.source_review.checked_on=null;invalid(m,/FR: Freigabe ohne/);});
test('Invalid and future dates are rejected',()=>{for(const date of ['2026-02-30','2026-10-29']){const m=approved();m.countries.HR.source_review.checked_on=date;invalid(m,/HR: checked_on/);}});
test('Approval cannot precede source check',()=>{const m=approved();m.countries.HR.approval.decided_on='2026-10-26';invalid(m,/Freigabe liegt vor/);});
test('Complete synthetic approval is ready without publishing anything',()=>{const r=validate(approved());assert.deepEqual(r.errors,[]);assert.equal(r.ready,true);});
test('Manifest cannot claim approval while a country remains open',()=>{const m=approved();m.countries.IT=copy(draft.countries.IT);invalid(m,/Manifestfreigabe ohne vollständige/);});
test('Withdrawal is valid, preserved in history and blocks readiness',()=>{
  const prior=approved(),m=next(prior);m.status='withdrawn';
  m.countries.HR.approval={status:'withdrawn',responsible:'TEST approver',decided_on:'2026-10-28',evidence:'TEST withdrawal 2',reason:'TEST source conflict'};
  const r=validate(m,prior);assert.deepEqual(r.errors,[]);assert.equal(r.ready,false);assert.ok(r.open.some(x=>x.includes('zurückgenommen')));
});
test('Withdrawal without reason is invalid',()=>{const prior=approved(),m=next(prior);m.status='withdrawn';m.countries.HR.approval.status='withdrawn';invalid(m,/Rücknahme braucht/,prior);});
test('Withdrawal cannot leave manifest approved',()=>{const prior=approved(),m=next(prior);m.countries.HR.approval={...m.countries.HR.approval,status:'withdrawn',reason:'TEST conflict',evidence:'TEST withdrawal 2'};invalid(m,/erfordert Manifeststatus withdrawn/,prior);});
test('Withdrawal without prior approval is rejected',()=>{const m=copy(draft);m.status='withdrawn';m.countries.HR.approval.status='withdrawn';invalid(m,/ohne dokumentierte vorherige Freigabe/);});
test('Changed HTML cannot inherit the old decision',()=>{const prior=approved(),m=next(prior);m.artifact.sha256='b'.repeat(64);m.artifact.html_version='sha256:'+m.artifact.sha256;invalid(m,/neue Freigabeentscheidung/,prior);});
test('Changed revision cannot inherit the old decision',()=>{const prior=approved(),m=next(prior);m.countries.IT.content_revision=2;invalid(m,/neue Freigabeentscheidung/,prior);});
test('Changed source review cannot inherit old approval',()=>{const prior=approved(),m=next(prior);m.countries.IT.source_review.reviewed_by='TEST second reviewer';invalid(m,/neue Freigabeentscheidung/,prior);});
test('Known revision cannot be erased or decremented',()=>{const prior=approved();prior.countries.IT.content_revision=2;for(const rev of [null,1]){const m=next(prior);m.countries.IT.content_revision=rev;invalid(m,/Revision|Länderrevision/,prior);}});
test('New snapshots require a sequential predecessor',()=>{const prior=approved(),m=next(prior);m.sequence=3;invalid(m,/Manifestsequenz/,prior);});
test('Unknown countries and statuses are rejected',()=>{const m=copy(draft);m.countries.DE=copy(m.countries.HR);m.countries.HR.approval.status='live';invalid(m,/Genau HR|Freigabestatus/);});
test('Reapproval after withdrawal requires a new decision',()=>{
  const prior=next(approved());prior.status='withdrawn';prior.countries.HR.approval={...prior.countries.HR.approval,status:'withdrawn',reason:'TEST conflict'};
  const m=next(prior);m.status='approved';m.countries.HR.approval={...m.countries.HR.approval,status:'approved',reason:null};invalid(m,/neue Freigabeentscheidung/,prior);
  m.countries.HR.approval.evidence='TEST new decision 3';assert.deepEqual(validate(m,prior).errors,[]);
});
test('Withdrawal cannot silently rewrite the source review',()=>{const prior=approved(),m=next(prior);m.status='withdrawn';m.countries.HR.approval={...m.countries.HR.approval,status:'withdrawn',reason:'TEST conflict',evidence:'TEST withdrawal 2'};m.countries.HR.source_review.sources=[];invalid(m,/Quellenprüfnachweis bewahren/,prior);});
test('CLI validates actual Git/HTML bytes and distinguishes incomplete release',()=>{
  const cli=join(root,'scripts/check-release-manifest.mjs');
  const run=(...args)=>spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8'});
  assert.equal(run().status,0);assert.equal(run('--require-approved').status,2);
  const dir=mkdtempSync(join(root,'tests/.manifest-fixtures-'));
  try {
    const file=join(dir,'bad.json'),m=copy(draft);m.artifact.sha256='c'.repeat(64);m.artifact.html_version='sha256:'+m.artifact.sha256;
    writeFileSync(file,JSON.stringify(m));const result=run(file);assert.equal(result.status,1);assert.match(result.stderr,/Git-Commit und HTML-Hash/);
    const prior=approved(),p=join(dir,'previous.json');writeFileSync(p,JSON.stringify(prior));
    const current=next(prior);current.previous={path:p,sha256:sha256(readFileSync(p))};writeFileSync(file,JSON.stringify(current));assert.equal(run(file,'--require-approved').status,0);
    writeFileSync(p,JSON.stringify({...prior,module:'tampered'}));assert.match(run(file).stderr,/Vorgängermanifests widerspricht/);
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('Withdrawal requires a distinct decision reference',()=>{const prior=approved(),m=next(prior);m.status='withdrawn';m.countries.HR.approval={...m.countries.HR.approval,status:'withdrawn',reason:'TEST conflict'};invalid(m,/neuen Entscheidungsnachweis/,prior);});
test('Changing approval responsibility cannot reuse the old evidence',()=>{const prior=approved(),m=next(prior);m.countries.HR.approval.responsible='TEST different approver';invalid(m,/neue Freigabeentscheidung/,prior);});
