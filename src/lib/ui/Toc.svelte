<script lang="ts">
  /** Builds the sidebar from h2/h3 inside `target` (or reuses a hand-written <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<nav id="toc"> in the content). */
  import { onMount, tick } from 'svelte';
  import { PanelLeftClose, PanelLeftOpen, ArrowLeft } from '@lucide/svelte';
  import { getToc, setToc } from '../theme/index.js';
  import { t } from '../i18n/index.js';
  const L = t().toc;
  let { target, title, home = '/' }: { target: HTMLElement; title: string; home?: string } = $props();
  type Item = { id: string; text: string; level: 2 | 3 };
  let items = $state<Item[]>([]);
  let active = $state('');
  let open = $state(false);        // mobile (drawer)
  let shown = $state(true);        // desktop (persistido)
  const mobile = () => innerWidth <= 900;
  let isMobile = $state(false);      // no celular o índice é gaveta: o botão de abrir fica sempre visível
  function toggle() { if (mobile()) open = !open; else { shown = !shown; setToc(shown); } }
  let nav: HTMLElement;

  const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);

  onMount(() => {
    shown = getToc(); isMobile = mobile(); const onResize = () => (isMobile = mobile()); addEventListener('resize', onResize);
    const cleanup = { fn: () => {} };
    tick().then(() => {
    // content shipped its own TOC (the apostila does): adopt its links, drop the original nav
    const own = target.querySelector<HTMLElement>('nav#toc');
    let n = 0;
    if (own) {
      items = [...own.children].flatMap((el): Item[] => {
        if (el.classList.contains('mod')) return [{ id: '', text: el.textContent ?? '', level: 2 }];
        if (el.tagName === 'A') return [{ id: el.getAttribute('href')!.slice(1), text: el.textContent ?? '', level: 3 }];
        return [];
      });
      own.remove();
    } else {
      items = [...target.querySelectorAll<HTMLElement>('h2, h3')].map((h) => {
        if (!h.id) h.id = `s-${++n}-${slug(h.textContent ?? '')}`;
        const num = h.querySelector('.n')?.textContent?.trim();
        const rest = [...h.childNodes].filter((c) => !(c instanceof Element && c.classList.contains('n'))).map((c) => c.textContent).join('').trim();
        return { id: h.tagName === 'H2' ? '' : h.id, text: num ? `${num}. ${rest}` : rest, level: h.tagName === 'H2' ? 2 : 3 };
      });
    }
    const targets = items.filter((i) => i.id).map((i) => document.getElementById(i.id)?.closest('section') ?? document.getElementById(i.id)).filter(Boolean) as HTMLElement[];
    const idOf = new Map(targets.map((t, k) => [t, items.filter((i) => i.id)[k].id]));
    const visible = new Map<HTMLElement, boolean>();
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => visible.set(e.target as HTMLElement, e.isIntersecting));
      const first = targets.find((t) => visible.get(t));
      if (first) {
        active = idOf.get(first)!;
        const a = nav?.querySelector<HTMLElement>(`a[href="#${active}"]`);
        if (a && (a.offsetTop < nav.scrollTop || a.offsetTop > nav.scrollTop + nav.clientHeight - 60)) nav.scrollTop = a.offsetTop - nav.clientHeight / 2;
      }
    }, { rootMargin: '-10% 0px -70% 0px', threshold: 0 });
    targets.forEach((t) => obs.observe(t));
    cleanup.fn = () => obs.disconnect();
    });
    return () => { cleanup.fn(); removeEventListener('resize', onResize); };
  });
</script>

{#if isMobile ? !open : !shown}
  <div id="toc-btn">
    <a class="icon" href={home} title={L.back} aria-label={L.back}><ArrowLeft size={18} /></a>
    <button class="icon" aria-expanded="false" aria-controls="toc" title={L.show} onclick={toggle}><PanelLeftOpen size={18} /></button>
  </div>
{/if}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<nav id="toc" class:open bind:this={nav} aria-label={L.label} onclick={(e) => { const a = (e.target as HTMLElement).closest('a[href^="#"]'); if (!a) return; if (innerWidth <= 900) open = false; const el = document.getElementById(a.getAttribute('href')!.slice(1)); if (el) { e.preventDefault(); history.replaceState(null, '', a.getAttribute('href')); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }}>
  <div class="toc-head">
    <a class="icon" href={home} title={L.back} aria-label={L.back}><ArrowLeft size={18} /></a>
    <button type="button" class="icon" title={L.hide} aria-label={L.hide} onclick={toggle}><PanelLeftClose size={18} /></button>
  </div>
  <div class="toc-title">{title}</div>
  {#each items as it}
    {#if it.level === 2}<div class="mod">{it.text}</div>
    {:else}<a href="#{it.id}" class:active={active === it.id}>{it.text}</a>{/if}
  {/each}
</nav>
