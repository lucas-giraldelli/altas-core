import type { Enhancer } from './index.js';
/** Realce de sintaxe em <pre data-lang="php"><code>…</code></pre> (ou <code class="language-x">).
 *  highlight.js só com as linguagens do dia a dia; carregado sob demanda. Cores vêm do tema (styles/code.css). */
const LANGS: Record<string, () => Promise<any>> = {
  js: () => import('highlight.js/lib/languages/javascript'), javascript: () => import('highlight.js/lib/languages/javascript'),
  ts: () => import('highlight.js/lib/languages/typescript'), typescript: () => import('highlight.js/lib/languages/typescript'),
  php: () => import('highlight.js/lib/languages/php'), python: () => import('highlight.js/lib/languages/python'), py: () => import('highlight.js/lib/languages/python'),
  sql: () => import('highlight.js/lib/languages/sql'), bash: () => import('highlight.js/lib/languages/bash'), sh: () => import('highlight.js/lib/languages/bash'), shell: () => import('highlight.js/lib/languages/bash'),
  json: () => import('highlight.js/lib/languages/json'), yaml: () => import('highlight.js/lib/languages/yaml'), yml: () => import('highlight.js/lib/languages/yaml'),
  html: () => import('highlight.js/lib/languages/xml'), xml: () => import('highlight.js/lib/languages/xml'), css: () => import('highlight.js/lib/languages/css'),
  go: () => import('highlight.js/lib/languages/go'), rust: () => import('highlight.js/lib/languages/rust'), c: () => import('highlight.js/lib/languages/c'), cpp: () => import('highlight.js/lib/languages/cpp'),
  java: () => import('highlight.js/lib/languages/java'), kotlin: () => import('highlight.js/lib/languages/kotlin'), swift: () => import('highlight.js/lib/languages/swift'), dockerfile: () => import('highlight.js/lib/languages/dockerfile'), nginx: () => import('highlight.js/lib/languages/nginx'), ini: () => import('highlight.js/lib/languages/ini'), diff: () => import('highlight.js/lib/languages/diff'), markdown: () => import('highlight.js/lib/languages/markdown'), md: () => import('highlight.js/lib/languages/markdown')
};
export const highlight: Enhancer = async (root) => {
  const blocks = [...root.querySelectorAll<HTMLElement>('pre[data-lang] > code, pre > code[class*="language-"]')];
  if (!blocks.length) return;
  const { default: hljs } = await import('highlight.js/lib/core');
  const need = new Set(blocks.map((c) => (c.parentElement!.dataset.lang || c.className.match(/language-([\w-]+)/)?.[1] || '').toLowerCase()).filter((l) => LANGS[l]));
  await Promise.all([...need].map(async (l) => { if (!hljs.getLanguage(l)) hljs.registerLanguage(l, (await LANGS[l]()).default); }));
  for (const code of blocks) {
    const lang = (code.parentElement!.dataset.lang || code.className.match(/language-([\w-]+)/)?.[1] || '').toLowerCase();
    if (!hljs.getLanguage(lang) || code.dataset.highlighted) continue;
    code.innerHTML = hljs.highlight(code.textContent ?? '', { language: lang }).value;
    code.dataset.highlighted = 'yes'; code.parentElement!.dataset.langLabel = lang;
  }
};
