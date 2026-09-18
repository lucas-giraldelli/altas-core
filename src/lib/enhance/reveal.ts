import type { Enhancer } from './index.js';
import { t } from '../i18n/index.js';
/** Reveal buttons for exercises (.ex): solution and hint panels. */
export const reveal: Enhancer = (root) => {
  root.querySelectorAll<HTMLButtonElement>('.btn.reveal').forEach((btn) => {
    const hint = btn.classList.contains('hint');
    const card = btn.closest('.ex');
    const panel = hint ? card?.querySelector('.panel.hint-panel') : card?.querySelector('.panel:not(.hint-panel)');
    if (!panel) return;
    const L = t().reveal; const closed = hint ? L.hint : L.solution, open = hint ? L.hideHint : L.hideSolution;
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      const o = panel.hasAttribute('hidden');
      panel.toggleAttribute('hidden', !o);
      btn.textContent = o ? open : closed; btn.setAttribute('aria-expanded', String(o));
    });
  });
};
