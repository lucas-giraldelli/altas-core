import type { Page } from './types.js';
export type { Page } from './types.js';


function meta(t: string, name: string) {
  return t.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`))?.[1] ?? '';
}
function decode(s: string) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/**
 * Parses a map of `path -> raw HTML` (e.g. from `import.meta.glob('/content/**\/*.html', { query: '?raw', import: 'default', eager: true })`)
 * into Page records. Files under an `assets/` folder are ignored. `root` is the prefix to strip from paths (default `/content/`).
 */
export function parsePages(files: Record<string, string>, root = '/content/'): Page[] {
  return Object.entries(files).filter(([path]) => !/\/assets\//.test(path)).map(([path, t]) => {
  const slug = path.startsWith(root) ? path.slice(root.length).replace(/\.html$/, '') : path.replace(/^\//, '').replace(/\.html$/, '');
  const parts = slug.split('/');
  const cat = parts[0]; // agrupa na home
  const sub = parts.length > 2 ? parts[1] : ''; // subcategoria (indentação a mais)
  const rawTitle = decode(t.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() ?? slug);
  const title = rawTitle.replace(/\s*\(EN\)\s*$/, ''); // o badge EN substitui o sufixo na interface
  const lang = t.match(/<html[^>]*lang="([^"]+)"/)?.[1] ?? 'pt-BR';
  const mode = meta(t, 'atlas-mode');
  const raw = !mode;
  let html: string | undefined;
  if (!raw) {
    html = t.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? t.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? t;
    // strip chrome the standalone version carries; the layout provides it
    html = html.replace(/<div id="progress"><\/div>/g, '').replace(/<button id="toc-btn"[\s\S]*?<\/button>/g, '');
    // inside mermaid sources, <br/> must survive as text (the browser would otherwise parse it as an element)
    html = html.replace(/(<pre class="mermaid">)([\s\S]*?)(<\/pre>)/g, (_, a, src, b) => a + src.replace(/<br\s*\/?>/g, '&lt;br/&gt;') + b);
  }
  return {
    slug, cat, sub, title, lang, mode, raw, html,
    description: decode(meta(t, 'description')),
    date: meta(t, 'atlas-date'),
    source: decode(meta(t, 'atlas-source')),
    en: lang.startsWith('en') || /\(EN\)\s*$/.test(rawTitle),
    hasMath: /\$[^$\n]+\$|class="eq"/.test(t),
    hasMermaid: /class="mermaid"/.test(t),
    checklist: (t.match(/<ul class="checklist">([\s\S]*?)<\/ul>/)?.[1].match(/<li\b/g) ?? []).length
  };
}).sort((a, b) => a.title.localeCompare(b.title));
}

export const groupByCat = (pages: Page[]): Record<string, Page[]> =>
  pages.reduce((acc, p) => ((acc[p.cat] ??= []).push(p), acc), {} as Record<string, Page[]>);

export const findPage = (pages: Page[], slug: string) => pages.find((p) => p.slug === slug);
