// Copia para static/raw/ tudo em content/ que não é página do tema: legado sem atlas-mode, .ahtml
// (HTML de exemplo/anexo), pdf, imagens, e qualquer coisa em assets/. Nada disso entra no índice; fica em /raw/<caminho>.
import { readdirSync, readFileSync, mkdirSync, copyFileSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
const SRC = 'content', DST = 'static/raw';
rmSync(DST, { recursive: true, force: true });
function walk(d) { return readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; }); }
let n = 0;
for (const f of walk(SRC)) {
  // páginas do tema não vão para /raw; tudo dentro de assets/ (html de exemplo, pdf, imagens) vai
  if (!f.includes('/assets/') && f.endsWith('.html') && /name="atlas-mode"/.test(readFileSync(f, 'utf8'))) continue;
  const out = join(DST, f.slice(SRC.length + 1));
  mkdirSync(dirname(out), { recursive: true }); copyFileSync(f, out); n++;
}
console.log(`raw: ${n} arquivo(s) copiado(s) (legado + assets)`);
