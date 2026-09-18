// Gera um PDF por página em build/pdf/<slug>.pdf a partir do site já construído (build/), com o
// Chromium do Playwright. Cache em .pdf-cache/ pelo hash do HTML de origem, para o build não
// pagar o custo de novo quando a página não mudou. Desliga com ATLAS_PDF=0.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const BUILD = join(ROOT, 'build'), CACHE = join(ROOT, '.pdf-cache'), OUT = join(BUILD, 'pdf');
if (process.env.ATLAS_PDF === '0') { console.log('pdf: desligado (ATLAS_PDF=0)'); process.exit(0); }

let chromium;
try { ({ chromium } = await import('playwright-core')); } catch { console.log('pdf: playwright-core ausente, pulando'); process.exit(0); }

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const pages = walk(join(ROOT, 'content')).filter((f) => f.endsWith('.html') && !f.includes('/assets/') && readFileSync(f, 'utf8').includes('atlas-mode'))
  .map((f) => ({ slug: f.slice(join(ROOT, 'content').length + 1, -5), hash: createHash('sha1').update(readFileSync(f)).digest('hex').slice(0, 12) }));

mkdirSync(CACHE, { recursive: true }); mkdirSync(OUT, { recursive: true });
const todo = pages.filter((p) => !existsSync(join(CACHE, `${p.slug.replace(/\//g, '__')}.${p.hash}.pdf`)));
for (const p of pages) { const c = join(CACHE, `${p.slug.replace(/\//g, '__')}.${p.hash}.pdf`); if (existsSync(c)) { mkdirSync(dirname(join(OUT, p.slug)), { recursive: true }); copyFileSync(c, join(OUT, p.slug + '.pdf')); } }
if (!todo.length) { console.log(`pdf: ${pages.length} em cache`); process.exit(0); }

// servidor estático mínimo sobre build/ (sem o nginx e sem o PIN)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  let f = join(BUILD, p); if (!existsSync(f) || statSync(f).isDirectory()) f = join(BUILD, '200.html');
  res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(readFileSync(f));
}).listen(0);
const port = server.address().port;

let browser;
try { browser = await chromium.launch(); }
catch (e) { console.log('pdf: chromium indisponível, pulando (' + e.message.split('\n')[0] + ')'); server.close(); process.exit(0); }
const ctx = await browser.newContext({ viewport: { width: 1000, height: 1400 } });
await ctx.addInitScript(() => { try { localStorage.setItem('atlas-theme', 'light'); localStorage.setItem('atlas-toc', 'closed'); } catch {} document.documentElement.setAttribute('data-theme', 'light'); document.documentElement.setAttribute('data-print', ''); });
const page = await ctx.newPage();
let n = 0;
for (const p of todo) {
  try {
    await page.goto(`http://localhost:${port}/${p.slug}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => !document.querySelector('pre.mermaid:not([data-processed])'), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' } });
    const c = join(CACHE, `${p.slug.replace(/\//g, '__')}.${p.hash}.pdf`); writeFileSync(c, pdf);
    mkdirSync(dirname(join(OUT, p.slug)), { recursive: true }); copyFileSync(c, join(OUT, p.slug + '.pdf')); n++;
  } catch (e) { console.log('pdf: falhou', p.slug, e.message.split('\n')[0]); }
}
await browser.close(); server.close();
// limpa versões antigas do cache
const live = new Set(pages.map((p) => `${p.slug.replace(/\//g, '__')}.${p.hash}.pdf`));
for (const f of readdirSync(CACHE)) if (!live.has(f)) try { (await import('node:fs')).rmSync(join(CACHE, f)); } catch {}
console.log(`pdf: ${n} gerados, ${pages.length - n} em cache`);
