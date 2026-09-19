// Operações de disco que mantêm content/ coincidente com as categorias da interface.
// A interface grava a intenção (override/grupo) e um pedido `requests` de kind "fs";
// o worker aplica aqui: git mv, reescrita do <title>, re-chaveamento de notas/progresso/
// overrides no PocketBase, alias da URL antiga. Depois disso o override deixa de ser
// necessário e é limpo; a pasta é a fonte de verdade.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname, basename } from 'node:path';

export const kebab = (s) => s.replace(/\s*\(EN\)\s*$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function makeFs(ROOT, pb) {
  const C = join(ROOT, 'content');
  const sh = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'pipe' }).toString();
  const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);
  const htmlFiles = () => walk(C).filter((f) => f.endsWith('.html'));
  const pagesUnder = (path) => walk(join(C, path)).filter((f) => f.endsWith('.html')).map((f) => f.slice(C.length + 1, -5));
  const gitMv = (from, to) => { mkdirSync(dirname(to), { recursive: true }); sh(`git mv -k ${JSON.stringify(from)} ${JSON.stringify(to)}`); if (existsSync(from)) sh(`mv ${JSON.stringify(from)} ${JSON.stringify(to)}`); const keep = join(dirname(to), '.gitkeep'); if (existsSync(keep)) sh(`git rm -qf ${JSON.stringify(keep)} || rm -f ${JSON.stringify(keep)}`); };
  const pruneDir = (d) => { while (d.startsWith(C) && d !== C && existsSync(d) && readdirSync(d).filter((f) => f !== '.gitkeep').length === 0) { const keep = join(d, '.gitkeep'); if (existsSync(keep)) sh(`git rm -q --cached ${JSON.stringify(keep)} || true`), sh(`rm -f ${JSON.stringify(keep)}`); rmdirSync(d); d = dirname(d); } };

  async function first(col, filter) { try { return await pb.collection(col).getFirstListItem(filter); } catch { return null; } }
  async function rekeySlug(from, to) {
    for (const col of ['overrides', 'notes', 'progress']) {
      for (const r of await pb.collection(col).getFullList({ filter: `slug = ${JSON.stringify(from)}` })) await pb.collection(col).update(r.id, { slug: to });
    }
    const dup = await pb.collection('aliases').getFullList({ filter: `to = ${JSON.stringify(from)}` }); // aliases que apontavam para o antigo seguem para o novo
    for (const a of dup) if (a.from === to) await pb.collection('aliases').delete(a.id); else await pb.collection('aliases').update(a.id, { to }); // nunca um alias de si mesmo
    if (!(await first('aliases', `from = ${JSON.stringify(from)}`))) await pb.collection('aliases').create({ from, to });
  }
  async function rekeyGroup(from, to) {
    for (const g of await pb.collection('groups').getFullList()) {
      if (g.path === from || g.path.startsWith(from + '/')) await pb.collection('groups').update(g.id, { path: to + g.path.slice(from.length) });
    }
  }
  async function clearOverride(slug, fields) {
    const o = await first('overrides', `slug = ${JSON.stringify(slug)}`);
    if (o) await pb.collection('overrides').update(o.id, Object.fromEntries(fields.map((f) => [f, ''])));
  }
  function rewriteRawRefs(fromPath, toPath) {
    for (const f of htmlFiles()) {
      const t = readFileSync(f, 'utf8'); const n = t.replace(new RegExp(`/raw/${esc(fromPath)}/`, 'g'), `/raw/${toPath}/`);
      if (n !== t) writeFileSync(f, n);
    }
  }
  function setTitle(file, title) {
    let t = readFileSync(file, 'utf8');
    t = t.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
    t = t.replace(/(<div class="doc-head">\s*<h1[^>]*>)[^<]*(<\/h1>)/, `$1${title}$2`);
    writeFileSync(file, t);
  }
  const targetOf = (slug, cat, sub, name) => [cat, sub, name].filter(Boolean).join('/');

  const ops = {
    /** Renomeia a página: arquivo vira kebab(title).html na mesma pasta; <title> e h1 recebem o título. */
    async 'rename-page'({ slug, title }) {
      const file = join(C, slug + '.html'); if (!existsSync(file)) throw new Error('página inexistente: ' + slug);
      const dir = slug.split('/').slice(0, -1).join('/'); const to = targetOf(slug, dir, '', kebab(title));
      if (to !== slug && existsSync(join(C, to + '.html'))) throw new Error('já existe: ' + to);
      setTitle(file, title);
      if (to !== slug) { gitMv(file, join(C, to + '.html')); await rekeySlug(slug, to); }
      await clearOverride(to, ['title']);
      return { slug: to, url: `/${to}/`, title };
    },
    /** Move a página para cat[/sub]; mantém o nome do arquivo. Referências /raw/ absolutas continuam válidas. */
    async 'move-page'({ slug, cat, sub }) {
      const file = join(C, slug + '.html'); if (!existsSync(file)) throw new Error('página inexistente: ' + slug);
      const to = targetOf(slug, cat, sub, basename(slug));
      if (to === slug) { await clearOverride(slug, ['cat', 'sub']); return { slug, url: `/${slug}/` }; }
      if (existsSync(join(C, to + '.html'))) throw new Error('já existe: ' + to);
      gitMv(file, join(C, to + '.html')); pruneDir(dirname(file));
      await rekeySlug(slug, to); await clearOverride(to, ['cat', 'sub']);
      return { slug: to, url: `/${to}/` };
    },
    /** Renomeia a pasta do grupo para kebab(title); páginas, anexos e grupos filhos acompanham. */
    async 'rename-group'({ path, title }) {
      const parent = path.split('/').slice(0, -1).join('/'); const to = [parent, kebab(title)].filter(Boolean).join('/');
      if (to === path) { await ensureGroup(to); return { path: to }; }
      if (!existsSync(join(C, path))) { await ensureGroup(to); await rekeyGroup(path, to); return { path: to }; } // grupo só existia no PocketBase
      if (existsSync(join(C, to))) throw new Error('já existe a pasta: ' + to);
      const moved = pagesUnder(path);
      gitMv(join(C, path), join(C, to)); rewriteRawRefs(path, to);
      for (const s of moved) await rekeySlug(s, to + s.slice(path.length));
      await rekeyGroup(path, to);
      return { path: to, moved: moved.length };
    },
    /** Copia a página para cat[/sub] como documento de `owner` (notas e progresso do original não vão junto). */
    async 'clone-page'({ slug, cat, sub, owner }) {
      const file = join(C, slug + '.html'); if (!existsSync(file)) throw new Error('página inexistente: ' + slug);
      const name = basename(slug); let to = targetOf(slug, cat, sub, name); let k = 2;
      while (existsSync(join(C, to + '.html'))) to = targetOf(slug, cat, sub, `${name}-${k++}`);
      mkdirSync(dirname(join(C, to)), { recursive: true });
      writeFileSync(join(C, to + '.html'), readFileSync(file, 'utf8'));
      const keep = join(dirname(join(C, to)), '.gitkeep'); if (existsSync(keep)) sh(`git rm -qf ${JSON.stringify(keep)} || rm -f ${JSON.stringify(keep)}`);
      if (owner) await pb.collection('overrides').create({ slug: to, owner });
      return { slug: to, url: `/${to}/` };
    },
    /** Garante a pasta do grupo no disco (com .gitkeep enquanto vazia). */
    async 'create-group'({ path }) { await ensureGroup(path); return { path }; },
    /** Remove a pasta do grupo se estiver vazia. */
    async 'delete-group'({ path }) { const d = join(C, path); if (existsSync(d)) pruneDir(d); if (existsSync(d)) throw new Error('pasta não está vazia: ' + path); return { path }; }
  };
  async function ensureGroup(path) { const d = join(C, path); if (!existsSync(d)) { mkdirSync(d, { recursive: true }); writeFileSync(join(d, '.gitkeep'), ''); } }

  return { ops, kebab, pagesUnder, htmlFiles };
}
