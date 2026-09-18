<script lang="ts">
  /* Zoom, arrastar e tela cheia para uma figure.diagram. O SVG do Mermaid recebe transform;
     roda do mouse = zoom (no ponto), arrastar = mover, duplo clique = reset. */
  import { onMount } from 'svelte';
  import { ZoomIn, ZoomOut, Maximize, Minimize, RotateCcw, Captions, CaptionsOff } from '@lucide/svelte';
  import { t } from '../i18n/index.js';
  const L = t().diagram;
  let { figure }: { figure: HTMLElement } = $props();
  let k = $state(1), x = $state(0), y = $state(0), full = $state(false), cap = $state(true);
  const setCap = (v: boolean) => { cap = v; figure.classList.toggle('cap-hidden', !v); };
  let pre: HTMLElement | null = null; // área de pan: pre.mermaid ou o contêiner do svg inline

  const apply = () => { const svg = pre?.querySelector('svg'); if (svg) { svg.style.transform = `translate(${x}px,${y}px) scale(${k})`; svg.style.transformOrigin = '0 0'; } };
  const reset = () => { k = 1; x = 0; y = 0; apply(); };
  /** em tela cheia: ajusta o diagrama para caber na tela inteira, centralizado */
  const fit = () => {
    const svg = pre?.querySelector('svg'); if (!svg || !pre) return;
    svg.style.transform = ''; const r = svg.getBoundingClientRect(); const box = pre.getBoundingClientRect();
    if (!r.width || !r.height) return;
    k = Math.min(box.width / r.width, box.height / r.height) * 0.92;
    x = (box.width - r.width * k) / 2 + (box.left - r.left) * 0; y = (box.height - r.height * k) / 2;
    // getBoundingClientRect do svg já inclui o offset dentro do pre; compensa
    x -= (r.left - box.left); y -= (r.top - box.top);
    apply();
  };
  const zoom = (f: number, cx?: number, cy?: number) => {
    const r = pre!.getBoundingClientRect(); const px = (cx ?? r.left + r.width / 2) - r.left, py = (cy ?? r.top + r.height / 2) - r.top;
    const nk = Math.min(6, Math.max(0.3, k * f));
    x = px - (px - x) * (nk / k); y = py - (py - y) * (nk / k); k = nk; apply();
  };

  onMount(() => {
    pre = figure.querySelector<HTMLElement>('pre.mermaid') ?? (figure.querySelector('svg') as SVGElement | null)?.closest<HTMLElement>('figure > *:not(figcaption)') ?? null;
    if (pre && pre.tagName === 'svg') { const w = document.createElement('div'); w.className = 'svg-wrap'; pre.replaceWith(w); w.append(pre); pre = w; }
    if (!pre) return;
    pre.classList.add('pannable');
    let drag: { sx: number; sy: number; ox: number; oy: number } | null = null;
    const down = (e: PointerEvent) => { if (e.button !== 0) return; drag = { sx: e.clientX, sy: e.clientY, ox: x, oy: y }; pre!.setPointerCapture(e.pointerId); pre!.classList.add('dragging'); };
    const move = (e: PointerEvent) => { if (!drag) return; x = drag.ox + e.clientX - drag.sx; y = drag.oy + e.clientY - drag.sy; apply(); };
    const up = () => { drag = null; pre!.classList.remove('dragging'); };
    const wheel = (e: WheelEvent) => { if (!full && !e.ctrlKey) return; e.preventDefault(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); };
    const onFull = () => { full = document.fullscreenElement === figure; if (full) { setCap(false); requestAnimationFrame(() => requestAnimationFrame(fit)); } else { setCap(true); reset(); } };
    pre.addEventListener('pointerdown', down); pre.addEventListener('pointermove', move); pre.addEventListener('pointerup', up); pre.addEventListener('pointercancel', up);
    pre.addEventListener('wheel', wheel, { passive: false }); pre.addEventListener('dblclick', reset);
    document.addEventListener('fullscreenchange', onFull);
    return () => { document.removeEventListener('fullscreenchange', onFull); };
  });
  const toggleFull = () => (document.fullscreenElement === figure ? document.exitFullscreen() : figure.requestFullscreen());
</script>

<div class="dtools" role="toolbar" aria-label={L.toolbar}>
  <button type="button" title={L.zoomIn} onclick={() => zoom(1.25)}><ZoomIn size={15} /></button>
  <button type="button" title={L.zoomOut} onclick={() => zoom(1 / 1.25)}><ZoomOut size={15} /></button>
  <button type="button" title={L.reset} onclick={() => (full ? fit() : reset())}><RotateCcw size={15} /></button>
  <button type="button" title={cap ? L.hideCaption : L.showCaption} onclick={() => setCap(!cap)}>{#if cap}<CaptionsOff size={15} />{:else}<Captions size={15} />{/if}</button>
  <button type="button" title={full ? L.exitFullscreen : L.fullscreen} onclick={toggleFull}>{#if full}<Minimize size={15} />{:else}<Maximize size={15} />{/if}</button>
</div>

<style>
  .dtools { display: flex; align-items: center; gap: 4px; padding: 6px 4px 0; }
  button { display: inline-flex; padding: 6px; background: none; border: 1px solid transparent; border-radius: 4px; color: var(--ink-3); cursor: pointer; }
  button:hover { color: var(--blue); border-color: var(--rule-2); }
</style>
