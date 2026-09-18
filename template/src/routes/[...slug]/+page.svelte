<script lang="ts">
  import { onMount } from 'svelte';
  import Notes from '$lib/widgets/Notes.svelte';
  import Checklist from '$lib/widgets/Checklist.svelte';
  import ReadDone from '$lib/widgets/ReadDone.svelte';
  import { enhance, Toc, Diagrams } from '@lucasgiraldelli/atlas-core';
  import { getOverride, listOverrides, saveOverride } from '$lib/db/overrides';
  import { resolveAliasSlug } from '$lib/db/requests';
  import { goto } from '$app/navigation';
  import { pages } from '$lib/content';
  import { kebab } from '$lib/content/slug';
  import type { Page } from '$lib/content';
  let { data } = $props();
  let resolved = $state<Page | null>(null);
  const p = $derived((data.page ?? resolved)!);
  let missing = $state(false);
  let main = $state<HTMLElement>()!;
  let progress = $state(0);
  let title = $state('');
  let archived = $state(false);
  $effect(() => { if (p) title = p.title; });

  function onScroll() {
    const h = document.documentElement.scrollHeight - innerHeight;
    progress = h > 0 ? Math.min(100, Math.max(0, (scrollY / h) * 100)) : 0;
    savePos();
  }
  // posição de leitura: localStorage na hora (mesmo aparelho) e PocketBase com atraso (entre aparelhos)
  let posTimer: ReturnType<typeof setTimeout> | undefined; let restored = false;
  const posKey = () => `atlas-pos:${p.slug}`;
  function savePos() {
    if (!restored || !p) return;
    const h = document.documentElement.scrollHeight - innerHeight; const frac = h > 0 ? scrollY / h : 0;
    try { localStorage.setItem(posKey(), String(frac)); } catch {}
    clearTimeout(posTimer); posTimer = setTimeout(() => saveOverride(p.slug, { pos: frac, opened: new Date().toISOString() }).catch(() => {}), 1500);
  }
  function restorePos(frac: number) {
    if (location.hash || frac <= 0.005) { restored = true; return; }
    const go = () => { const h = document.documentElement.scrollHeight - innerHeight; scrollTo({ top: frac * h }); };
    go(); requestAnimationFrame(go); setTimeout(() => { go(); restored = true; }, 600); // depois de fontes, KaTeX e Mermaid ajustarem a altura
  }
  async function resolveAlias() {
    // /cat/sub/<kebab do título renomeado>/ → acha a página cujo override casa com o slug pedido
    const want = data.slug; const dir = want.split('/').slice(0, -1).join('/');
    // URL antiga de página já renomeada/movida no disco pelo worker
    const to = await resolveAliasSlug(want);
    if (to && pages.some((x) => x.slug === to)) { goto(`/${to}/${location.hash}`, { replaceState: true }); return null; }
    const ovs = await listOverrides();
    for (const o of ovs) {
      if (!o.title) continue;
      const pg = pages.find((x) => x.slug === o.slug);
      if (pg && !pg.raw && pg.slug.split('/').slice(0, -1).join('/') === dir && kebab(o.title) === want.split('/').pop()) return pg;
    }
    return null;
  }
  onMount(() => {
    let cleanup = () => {};
    (async () => {
    if (!data.page) { resolved = await resolveAlias(); if (!resolved) { missing = true; return; } await new Promise((r) => setTimeout(r)); }
    enhance(main, p).then((c) => (cleanup = c));
    // título renomeado na home vale aqui também: aba, h1 e índice lateral
    let local = 0; try { local = parseFloat(localStorage.getItem(posKey()) || '0'); } catch {}
    getOverride(p.slug).then((o) => {
      archived = !!o?.archived; if (o?.title) { title = o.title; const h1 = main.querySelector('.doc-head h1'); if (h1) h1.textContent = o.title; }
      restorePos(Math.max(local, o?.pos ?? 0));
      saveOverride(p.slug, { opened: new Date().toISOString() }).catch(() => {});
    }).catch(() => restorePos(local));
    onScroll(); addEventListener('scroll', onScroll, { passive: true });
    })();
    return () => { cleanup(); removeEventListener('scroll', onScroll); clearTimeout(posTimer); };
  });
</script>

<svelte:head>
  <title>{p ? `${title} · Atlas` : 'Atlas'}</title>
  {#if p?.description}<meta name="description" content={p.description} />{/if}
</svelte:head>

{#if !p}
  <main class="home">
    {#if missing}<div class="doc-head"><h1>Não encontrado</h1><p class="deck">Nenhuma página com esse endereço. <a href="/">Voltar ao início</a>.</p></div>
    {:else}<div class="doc-head"><h1 class="dots" aria-label="Carregando"><span>.</span><span>.</span><span>.</span></h1></div>{/if}
  </main>
{:else}

<div id="progress" style="width:{progress}%"></div>

<div class="reading">
  <main lang={p.lang}>
    <p class="ref">
      <a href="/">{p.cat}</a>{#if p.sub} · <span>{p.sub}</span>{/if} · <span>{p.mode}</span>
      {#if archived} · <span class="pill muted">arquivado</span>{/if}
      {#if p.source} · {#if /^https?:/.test(p.source)}<a href={p.source} rel="noopener">{p.source.replace(/^https?:\/\//, '')}</a>{:else}<span>{p.source}</span>{/if}{/if}
    </p>
    <div bind:this={main}>{@html p.html}</div>
    <ReadDone slug={p.slug} />
  </main>
</div>

{#if main}<Toc target={main} title={title} /><Notes slug={p.slug} target={main} /><Diagrams target={main} /><Checklist slug={p.slug} target={main} lang={p.lang} />{/if}
{/if}
