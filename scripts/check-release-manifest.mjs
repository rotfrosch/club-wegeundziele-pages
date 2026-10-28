import {readFileSync, realpathSync} from 'node:fs';
import {resolve, dirname, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {validateManifest, sha256} from './release-manifest.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const requireApproved = args.includes('--require-approved');
const paths = args.filter(arg => arg !== '--require-approved');
if (paths.length > 1 || paths.some(arg => arg.startsWith('--'))) {
  console.error('Aufruf: node scripts/check-release-manifest.mjs [Manifestpfad] [--require-approved]');
  process.exit(1);
}
const safePath = path => {
  const resolved = realpathSync(resolve(root,path));
  const rel = relative(root,resolved);
  if (rel.startsWith('..') || isAbsolute(rel)) throw Error('Pfad außerhalb des Repositorys.');
  return resolved;
};
try {
  const seen = new Set();
  function check(path) {
    const file = safePath(path);
    if (seen.has(file)) throw Error('Zyklische Manifestreferenz.');
    seen.add(file);
    const bytes = readFileSync(file), manifest = JSON.parse(bytes);
    let previous = null;
    if (manifest.previous !== null && manifest.previous !== undefined) {
      const p = manifest.previous;
      if (!p || typeof p.path !== 'string') throw Error('Ungültige Vorgängerreferenz.');
      const priorBytes = readFileSync(safePath(p.path));
      if (sha256(priorBytes) !== p.sha256) throw Error('SHA-256 des Vorgängermanifests widerspricht der Referenz.');
      previous = check(p.path).manifest;
    }
    const result = validateManifest(manifest,{previous});
    if (result.errors.length) throw Error(result.errors.join('\n'));
    const a = manifest.artifact;
    const commit = execFileSync('git',['rev-parse','--verify',`${a.git_commit}^{commit}`],{cwd:root,stdio:['ignore','pipe','pipe']}).toString().trim();
    if (commit !== a.git_commit) throw Error('Git-Referenz ist kein direktes Commitobjekt.');
    const gitBytes = execFileSync('git',['show',`${a.git_commit}:${a.path}`],{cwd:root,stdio:['ignore','pipe','pipe']});
    if (sha256(gitBytes) !== a.sha256) throw Error('Git-Commit und HTML-Hash widersprechen sich.');
    return {manifest,result};
  }
  const {manifest,result} = check(paths[0] || 'releases/countrycheck/manifest-0002.json');
  if (sha256(readFileSync(safePath(manifest.artifact.path))) !== manifest.artifact.sha256) {
    throw Error('Arbeitskopie stimmt nicht mit der unveränderlichen HTML-Version überein.');
  }
  console.log(`Manifest ${manifest.sequence}: strukturell gültig; Freigabe ${result.ready?'vollständig':'OFFEN'}.`);
  console.log(`HTML: ${manifest.artifact.html_version} · Git: ${manifest.artifact.git_commit}`);
  result.open.forEach(message=>console.log('- '+message));
  // Exit 2 distinguishes a valid, incomplete draft from malformed metadata (exit 1).
  if (requireApproved && !result.ready) process.exitCode = 2;
} catch(error) {
  console.error('Manifestprüfung fehlgeschlagen: '+error.message);
  process.exitCode = 1;
}
