// Worker do Atlas: consome pedidos (coleção `requests`) e pede ao LLM para decidir entre
// apontar página existente, inserir seção em página existente, ou criar página nova; depois
// build + commit + push. Roda no PC (systemd --user), lê secrets.env e o repo local.
import PocketBase from 'pocketbase';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeFs } from './fs-ops.mjs';
import { complete, llmConfig } from './llm.mjs';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const env = Object.fromEntries(readFileSync(join(ROOT, 'secrets.env'), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split('=', 2)));
const LLM = llmConfig({ ...process.env, ...env });
const PB_URL = process.env.PB_URL || 'http://localhost:8090';
const pb = new PocketBase(PB_URL); pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(env.PB_EMAIL || process.env.PB_EMAIL, env.PB_PASS || process.env.PB_PASS);

const fs = makeFs(ROOT, pb);
const CORE = join(ROOT, 'node_modules/@lucasgiraldelli/atlas-core');
const SKILL = readFileSync(env.ATLAS_SKILL || process.env.ATLAS_SKILL || join(CORE, 'skill/learn/SKILL.md'), 'utf8');
const skillPart = (from, to) => { const a = SKILL.indexOf(from); const b = to ? SKILL.indexOf(to, a) : SKILL.length; return SKILL.slice(a, b); };
const RULES = [skillPart('## 0. REGRAS ABSOLUTAS', '## 1.'), skillPart('## 2. MODO', '## 3.'), skillPart('## 3. ESTRUTURA', '## 4.'), skillPart('## 4. PROSA', '## 5.'), skillPart('## 5. CORES', '## 6.'), skillPart('## 6. MATEMÁTICA', '## 7.'), skillPart('## 7. DIAGRAMAS', '## 8.')].join('\n');
const CONTRACT = readFileSync(join(CORE, 'docs/PAGE-CONTRACT.md'), 'utf8');
const TEMPLATE = readFileSync(join(CORE, 'docs/page-template.html'), 'utf8');

const kebab = (s) => s.replace(/\s*\(EN\)\s*$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase();
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

/** índice compacto de todas as páginas: slug, título, descrição, seções */
function index() {
  return walk(join(ROOT, 'content')).filter((f) => f.endsWith('.html')).map((f) => {
    const t = readFileSync(f, 'utf8'); if (!t.includes('atlas-mode')) return null;
    const g = (re) => (t.match(re)?.[1] ?? '').trim();
    const sections = [...t.matchAll(/<h3[^>]*>(?:<span class="n">\d+<\/span>)?\s*([^<]+)/g)].map((m) => m[1].trim());
    return { slug: f.slice(join(ROOT, 'content').length + 1, -5), title: g(/<title>(.*?)<\/title>/s), mode: g(/atlas-mode" content="([^"]*)"/), description: g(/name="description" content="([^"]*)"/), sections };
  }).filter(Boolean);
}

async function fetchRef(ref) {
  if (!/^https?:\/\//.test(ref || '')) return '';
  try {
    const html = await (await fetch(ref, { headers: { 'user-agent': 'Mozilla/5.0 atlas-worker' }, signal: AbortSignal.timeout(20000) })).text();
    return html.replace(/<(script|style|nav|footer)[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 60000);
  } catch { return ''; }
}

const ask = (prompt) => complete(prompt, { json: true, cfg: LLM });

function buildPrompt(req, idx, refText) {
  return `Você é o autor didático do Atlas, um site pessoal de estudo. Siga estritamente as regras abaixo.

# REGRAS DE ESCRITA (da skill /learn)
${RULES}

# CONTRATO DA PÁGINA
${CONTRACT}

# TEMPLATE (blocos disponíveis; use só os que couberem; remova placeholders não usados)
${TEMPLATE}

# ÍNDICE ATUAL DO ATLAS (slug, título, modo, descrição, seções)
${JSON.stringify(idx, null, 1)}

# PEDIDO DO USUÁRIO
conteúdo/tema: ${req.content}
referência: ${req.ref || '(nenhuma)'}
modo desejado: ${req.mode || '(decida)'}
categoria sugerida: ${req.cat || '(decida; use uma existente do índice se couber)'}
${refText ? `\n# TEXTO DA REFERÊNCIA (extraído da URL)\n${refText}` : ''}

# SUA TAREFA
Decida UMA das três ações e responda em JSON estrito. Ordem de preferência: exists > insert > create.
Antes de decidir, percorra o ÍNDICE: se alguma página (mesmo com outro título) tem uma seção cujo título ou descrição cobre o pedido, a resposta é obrigatoriamente "exists" apontando essa seção. "create" só quando nenhuma página do índice trata do tema nem poderia recebê-lo como seção; criar uma página que repete assunto de outra é o pior erro possível.
1. "exists": o Atlas já cobre isso o suficiente. Responda {"action":"exists","slug":"<slug existente>","section":"<título da seção que responde>","note":"<1 frase explicando>"}.
2. "insert": cabe como uma seção nova dentro de uma página existente. Responda {"action":"insert","slug":"<slug existente>","title":"<título da seção>","section_html":"<section class=\\"topic\\" id=\\"<kebab>\\">…</section>","note":"<1 frase>"}. A seção segue o contrato (h3 com span.n vazio "+", p.lede, componentes), em HTML puro, sem style/script.
3. "create": merece página própria. Responda {"action":"create","cat":"<categoria[/sub]>","title":"<título; inglês recebe sufixo (EN)>","lang":"pt-BR|en","mode":"referencia|leitura|apostila","page_html":"<documento HTML completo no contrato, do <!DOCTYPE> ao </html>>","note":"<1 frase>"}.
Regras absolutas: registro de livro didático conforme a seção PROSA acima (terceira pessoa, sem "você", sem coloquialismos, sem títulos metafóricos, ledes declarativos); sem travessões (—) em lugar nenhum; código em <pre data-lang="x"><code> com texto escapado; checklist com data-ref; metas atlas-mode, atlas-source (a referência) e atlas-date (${new Date().toISOString().slice(0, 10)}); labels de Mermaid em inglês entre aspas. Escreva no idioma do pedido. Seja fiel à referência; não invente fatos.`;
}

function sh(cmd) { return execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' }); }
function publish(msg) { sh('pnpm build'); sh('git add -A content'); sh(`git commit -qm ${JSON.stringify(msg)}`); sh('git push -q'); }
const clean = (s) => s.replace(/ — /g, ': ').replace(/—/g, ',');

async function handleFs(req) {
  await pb.collection('requests').update(req.id, { status: 'running' });
  const { op, ...args } = req.payload ?? {};
  try {
    if (!fs.ops[op]) throw new Error('operação desconhecida: ' + op);
    const result = await fs.ops[op](args);
    if (sh('git status --porcelain content').trim()) publish(`chore(content): ${op} ${args.slug ?? args.path ?? ''} → ${result.slug ?? result.path ?? ''}`);
    await pb.collection('requests').update(req.id, { status: 'done', result: { action: op, ...result } });
    console.log(new Date().toISOString(), 'fs', op, result.slug ?? result.path);
  } catch (e) {
    console.error(new Date().toISOString(), 'fs error', op, e.message);
    await pb.collection('requests').update(req.id, { status: 'error', result: { action: op, note: e.message.slice(0, 500) } });
  }
}

async function handle(req) {
  if (req.kind === 'fs') return handleFs(req);
  await pb.collection('requests').update(req.id, { status: 'running' });
  try {
    const idx = index(); const refText = await fetchRef(req.ref);
    const out = await ask(buildPrompt(req, idx, refText));
    let result;
    if (out.action === 'exists') {
      result = { action: 'exists', slug: out.slug, url: `/${out.slug}/`, title: idx.find((p) => p.slug === out.slug)?.title ?? out.slug, note: `${out.note} Seção: ${out.section ?? ''}` };
    } else if (out.action === 'insert') {
      const file = join(ROOT, 'content', out.slug + '.html'); if (!existsSync(file)) throw new Error('slug inexistente: ' + out.slug);
      let html = readFileSync(file, 'utf8');
      const sec = clean(out.section_html).replace(/<h3>/, '<h3><span class="n">+</span>').replace(/<section class="topic"/, `<section class="topic" data-added="${new Date().toISOString().slice(0, 10)}"`);
      // antes de erros / verificação / checklist, senão no fim do main
      const m = html.match(/<hr class="sep">|<section class="topic" id="(erros|verificacao|exercicios|checklist)"/);
      html = m ? html.slice(0, m.index) + sec + '\n\n' + html.slice(m.index) : html.replace('</main>', sec + '\n</main>');
      writeFileSync(file, html);
      publish(`feat(content): ${out.slug}: seção "${out.title}" (via Atlas + LLM)`);
      result = { action: 'insert', slug: out.slug, url: `/${out.slug}/#${(sec.match(/id="([^"]+)"/) || [])[1] ?? ''}`, title: out.title, note: out.note };
    } else if (out.action === 'create') {
      let html = clean(out.page_html);
      if (!/atlas-mode/.test(html) || !/<main/.test(html)) throw new Error('página fora do contrato');
      const cat = (out.cat || req.cat || 'general').replace(/^\/|\/$/g, ''); const slug = kebab(out.title);
      const dir = join(ROOT, 'content', cat); mkdirSync(dir, { recursive: true });
      const file = join(dir, slug + '.html'); if (existsSync(file)) throw new Error('já existe: ' + cat + '/' + slug);
      writeFileSync(file, html);
      publish(`feat(content): ${cat}/${slug} (via Atlas + LLM)`);
      result = { action: 'create', slug: `${cat}/${slug}`, url: `/${cat}/${slug}/`, title: out.title, note: out.note };
    } else throw new Error('ação desconhecida');
    await pb.collection('requests').update(req.id, { status: 'done', result });
    console.log(new Date().toISOString(), 'done', result.action, result.slug);
  } catch (e) {
    console.error(new Date().toISOString(), 'error', e.message);
    await pb.collection('requests').update(req.id, { status: 'error', result: { note: e.message.slice(0, 500) } });
  }
}

async function tick() {
  const pending = await pb.collection('requests').getFullList({ filter: 'status = "pending"', sort: 'created' });
  for (const r of pending) await handle(r);
}
if (process.argv.includes('--once')) { await tick(); process.exit(0); }
console.log('atlas worker: ouvindo', PB_URL, 'llm', LLM.provider, LLM.model);
for (;;) { try { await tick(); } catch (e) { console.error('tick', e.message); } await new Promise((r) => setTimeout(r, 30000)); }
