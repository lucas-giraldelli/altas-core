import type { Enhancer } from './index.js';
import { cssTokens } from '../theme/index.js';
/** Renderiza <pre class="mermaid"> com as cores da paleta atual; re-renderiza quando o tema muda. */
export const mermaid: Enhancer = async (root, page) => {
  if (!page.hasMermaid) return;
  const nodes = root.querySelectorAll<HTMLElement>('pre.mermaid');
  if (!nodes.length) return;
  const { default: m } = await import('mermaid');
  const run = async () => {
    const k = cssTokens();
    m.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base',
      themeVariables: { fontFamily: k.serif, fontSize: '16px', background: k.surface, mainBkg: k.surface, primaryColor: k.surface, primaryTextColor: k.ink, primaryBorderColor: k.rule2, lineColor: k.ink2, textColor: k.ink, clusterBkg: k.bg2, clusterBorder: k.blue, titleColor: k.blue, edgeLabelBackground: k.bg2, actorBkg: k.surface, actorBorder: k.blue, actorTextColor: k.ink, signalColor: k.ink2, signalTextColor: k.ink, noteBkgColor: k.bg2, noteTextColor: k.ink, labelBoxBkgColor: k.bg2, labelTextColor: k.ink, loopTextColor: k.ink },
      flowchart: { curve: 'basis', htmlLabels: true, padding: 12, nodeSpacing: 50, rankSpacing: 60, useMaxWidth: false },
      sequence: { useMaxWidth: false, actorFontSize: 16, messageFontSize: 15, noteFontSize: 14, actorFontFamily: k.serif, messageFontFamily: k.serif, width: 170, height: 50, messageMargin: 40 } });
    nodes.forEach((n) => { if (!n.dataset.src) n.dataset.src = n.textContent ?? ''; n.removeAttribute('data-processed'); n.textContent = n.dataset.src; });
    await m.run({ nodes });
  };
  await run();
  addEventListener('atlas-theme', run);
  return () => removeEventListener('atlas-theme', run);
};
