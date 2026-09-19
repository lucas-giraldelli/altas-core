<script lang="ts">
  import { onMount } from 'svelte';
  import { RefreshCw, LogOut, AArrowUp, AArrowDown, MoreVertical, BookCheck, BookOpen, Share2, FileDown, WandSparkles } from '@lucide/svelte';
  import { enqueueEdit } from '$lib/db/requests';
  import EditModal from './EditModal.svelte';
  import { auth, logout, pb, me } from '$lib/db/client.svelte';
  import { getScale, setScale, ModeToggle } from '@lucasgiraldelli/atlas-core';
  import { page } from '$app/state';
  import { find } from '$lib/content';
  import { getState, saveState } from '$lib/db/state';
  import { getOverride } from '$lib/db/overrides';
  let scale = $state(1), open = $state(false), read = $state<boolean | null>(null), armed = $state(false);
  function toggleMenu() { open = !open; armed = false; if (open) setTimeout(() => (armed = true), 350); }
  const slug = $derived(page.url.pathname.replace(/^\/|\/$/g, ''));
  const onPage = $derived(!!slug && !slug.startsWith('gate') && !!find(slug));
  onMount(() => { scale = getScale(); });
  // documento de outra pessoa: sem "lido" nem "pedir alteração" na topbar
  let foreign = $state(false);
  $effect(() => {
    if (onPage && auth.ok) { getOverride(slug).then((o) => (foreign = !!o?.owner && o.owner !== me())); getState(slug).then((o) => (read = !!o?.read)); }
    else { read = null; foreign = false; }
  });
  async function toggleRead() { const o = await saveState(slug, { read: !read }); read = !!o.read; }
  // PDF pré-gerado no build (build/pdf/<slug>.pdf): compartilha (mobile) ou baixa; sem PDF, cai na impressão do navegador
  let sharing = $state(false), sentMsg = $state(false);
  // atualização chegou: algum pedido meu concluiu depois que esta página carregou → o botão de recarregar pulsa
  let fresh = $state(false); const loadedAt = new Date().toISOString();
  // Só consulta enquanto houver pedido meu pendente/em execução; sem pendência não há polling.
  // Um pedido novo (askEdit ou seção) reativa a vigilância.
  let watching = $state(false);
  async function checkOnce() {
    try {
      const open = await pb.collection('requests').getList(1, 1, { filter: 'status = "pending" || status = "running"' });
      if (open.totalItems === 0) {
        const done = await pb.collection('requests').getList(1, 1, { filter: `status = "done" && updated > "${loadedAt.replace('T', ' ').slice(0, 19)}"` });
        if (done.totalItems) fresh = true;
        watching = false;
      }
    } catch { watching = false; }
  }
  $effect(() => {
    if (!auth.ok) return;
    checkOnce().then(() => { /* se havia pendência, watching fica true abaixo */ });
    pb.collection('requests').getList(1, 1, { filter: 'status = "pending" || status = "running"' }).then((r) => { if (r.totalItems) watching = true; }).catch(() => {});
  });
  $effect(() => {
    if (!watching) return;
    const id = setInterval(checkOnce, 20000);
    return () => clearInterval(id);
  });
  const canShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;
  async function sharePdf() {
    if (sharing) return; sharing = true;
    try {
      const r = await fetch(`/pdf/${slug}.pdf`); if (!r.ok) throw new Error(String(r.status));
      const name = `${document.title.replace(/\s*·\s*Atlas$/, '').replace(/[\\/:*?"<>|]+/g, '-')}.pdf`;
      const file = new File([await r.blob()], name, { type: 'application/pdf' });
      if (canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: document.title }); }
      else { const u = URL.createObjectURL(file); const a = Object.assign(document.createElement('a'), { href: u, download: name }); a.click(); setTimeout(() => URL.revokeObjectURL(u), 10000); }
    } catch (e: any) { if (e?.name !== 'AbortError') print(); }
    finally { sharing = false; open = false; }
  }
  // alteração do documento inteiro (o worker reescreve a página conforme a instrução)
  let editOpen = $state(false);
  const docTitle = () => document.title.replace(/\s*·\s*Atlas$/, '');
  function askEdit() { open = false; editOpen = true; }
  async function sendEdit(instruction: string) {
    await enqueueEdit({ slug, anchor: '', heading: docTitle(), instruction });
    sentMsg = true; setTimeout(() => (sentMsg = false), 3000); watching = true;
  }
  function leave() { logout(); document.cookie = 'atlas_token=; Path=/; Max-Age=0'; location.href = '/gate/'; }
</script>

{#if editOpen}<EditModal title={docTitle()} scope="documento" onSubmit={sendEdit} onClose={() => (editOpen = false)} />{/if}

<svelte:window onclick={(e) => { if (!(e.target as HTMLElement).closest('.topbar')) open = false; }} />

<div class="topbar" class:open>
  <button type="button" class:fresh title={fresh ? 'Há atualização: recarregar' : 'Recarregar'} aria-label="Recarregar" onclick={() => location.reload()}><RefreshCw size={18} /></button>
  {#if sentMsg}<span class="sent">pedido enviado</span>{/if}
  <button type="button" class="more" title="Mais" aria-label="Mais" aria-expanded={open} onclick={toggleMenu}><MoreVertical size={18} /></button>
  <div class="rest" class:armed>
    <button type="button" title="Diminuir fonte" aria-label="Diminuir fonte" onclick={() => (scale = setScale(scale - 0.1))} disabled={scale <= 0.8}><AArrowDown size={18} /><i>fonte menor</i></button>
    <button type="button" title="Aumentar fonte" aria-label="Aumentar fonte" onclick={() => (scale = setScale(scale + 0.1))} disabled={scale >= 1.4}><AArrowUp size={18} /><i>fonte maior</i></button>
    <ModeToggle />
    {#if onPage}<button type="button" title={canShare ? 'Compartilhar PDF' : 'Baixar PDF'} aria-label={canShare ? 'Compartilhar PDF' : 'Baixar PDF'} disabled={sharing} onclick={sharePdf}>{#if canShare}<Share2 size={18} />{:else}<FileDown size={18} />{/if}<i>{canShare ? 'compartilhar pdf' : 'baixar pdf'}</i></button>{/if}
    {#if onPage && auth.ok && !foreign}<button type="button" title="Pedir alteração no documento" aria-label="Pedir alteração" onclick={askEdit}><WandSparkles size={18} /><i>pedir alteração</i></button>{/if}
    {#if read !== null && !foreign}
      <button type="button" title={read ? 'Marcar como não lido' : 'Marcar como lido'} class:active={read} onclick={toggleRead}>{#if read}<BookCheck size={18} />{:else}<BookOpen size={18} />{/if}<i>{read ? 'lido' : 'marcar como lido'}</i></button>
    {/if}
    {#if auth.ok}<button type="button" title="Sair" aria-label="Sair" onclick={leave}><LogOut size={18} /><i>sair</i></button>{/if}
  </div>
</div>

<style>
  .fresh { color: var(--red) !important; border-color: var(--red) !important; animation: shake 1.2s ease-in-out infinite; }
  @keyframes shake { 0%, 100% { transform: rotate(0); } 20% { transform: rotate(-12deg); } 40% { transform: rotate(10deg); } 60% { transform: rotate(-6deg); } 80% { transform: rotate(4deg); } }
  .sent { align-self: center; font-family: var(--mono); font-size: 12px; color: var(--ink-3); }
  button:disabled { opacity: .35; cursor: default; }
  .rest { display: contents; }
  .more { display: none; }
  i { display: none; font-style: normal; }
  button.active { color: var(--green); border-color: var(--green); }
  @media (max-width: 640px) {
    .more { display: inline-flex; }
    .rest { display: none; position: absolute; right: 0; top: 46px; flex-direction: column; gap: 4px; padding: 6px; background: var(--surface); border: 1px solid var(--rule-2); border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,.35); min-width: 200px; }
    .open .rest { display: flex; pointer-events: none; }
    .open .rest.armed { pointer-events: auto; }
    .rest :global(button) { width: auto; height: auto; display: flex; align-items: center; justify-content: flex-start; gap: 10px; padding: 9px 10px; border-color: transparent; font-size: 15px; line-height: 1; }
    i { display: inline; }
    .rest :global(i) { display: inline; }
  }
</style>
