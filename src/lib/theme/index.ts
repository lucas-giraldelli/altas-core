/** Preferências visuais (paleta × modo), persistidas em localStorage. app.html aplica antes do primeiro paint. */
import { PALETTES, DEFAULTS } from './palettes.js';
export { PALETTES, DEFAULTS };
export type Mode = 'dark' | 'light';

const root = () => document.documentElement;
const emit = () => dispatchEvent(new CustomEvent('atlas-theme'));

export const getMode = (): Mode => (root().getAttribute('data-theme') === 'light' ? 'light' : 'dark');

export function setMode(m: Mode) {
  root().toggleAttribute('data-theme', m === 'light'); if (m === 'light') root().setAttribute('data-theme', 'light');
  try { localStorage.setItem('atlas-theme', m); } catch {}
  emit();
}
/** Tokens em vigor, lidos do CSS: é o que o Mermaid usa para acompanhar qualquer paleta. */
export function cssTokens() {
  const cs = getComputedStyle(root()); const v = (n: string) => cs.getPropertyValue(n).trim();
  return { bg: v('--bg'), bg2: v('--bg-2'), surface: v('--surface'), ink: v('--ink'), ink2: v('--ink-2'), rule2: v('--rule-2'), blue: v('--blue'), amber: v('--amber'), green: v('--green'), red: v('--red'), serif: v('--serif') };
}

/** Escala da fonte (0.8 a 1.4) e sidebar recolhida, ambas persistidas. */
export const getScale = () => parseFloat(root().style.getPropertyValue('--fs-scale') || '1');
export function setScale(s: number) {
  s = Math.round(Math.min(1.4, Math.max(0.8, s)) * 20) / 20;
  root().style.setProperty('--fs-scale', String(s));
  try { localStorage.setItem('atlas-scale', String(s)); } catch {}
  return s;
}
export const getToc = () => root().getAttribute('data-toc') !== 'closed';
export function setToc(open: boolean) {
  if (open) root().removeAttribute('data-toc'); else root().setAttribute('data-toc', 'closed');
  try { localStorage.setItem('atlas-toc', open ? 'open' : 'closed'); } catch {}
}
