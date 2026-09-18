import type { Enhancer } from './index.js';
export const katex: Enhancer = async (root, page) => {
  if (!page.hasMath) return;
  const [{ default: render }] = await Promise.all([import('katex/contrib/auto-render'), import('katex/dist/katex.min.css')]);
  render(root, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
    throwOnError: false,
    trust: (ctx: { command: string }) => ctx.command === '\\htmlClass',
    // realce por papel dentro da fórmula: \hlb{x} (blue), \hla (amber), \hlg (green), \hlr (red), \hlv (violet), \hlt (teal)
    macros: { '\\hlb': '\\htmlClass{hl-blue}{#1}', '\\hla': '\\htmlClass{hl-amber}{#1}', '\\hlg': '\\htmlClass{hl-green}{#1}', '\\hlr': '\\htmlClass{hl-red}{#1}', '\\hlv': '\\htmlClass{hl-violet}{#1}', '\\hlt': '\\htmlClass{hl-teal}{#1}' }
  });
};
