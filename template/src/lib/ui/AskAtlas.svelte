<script lang="ts">
  /* Botão + e modal: manda um pedido para o worker (Gemini) e lista o status dos pedidos. */
  import { Plus, X } from '@lucide/svelte';
  import { createRequest } from '$lib/db/requests';
  let { cats, onSent }: { cats: string[]; onSent?: () => void } = $props();
  let open = $state(false), busy = $state(false);
  let content = $state(''), ref = $state(''), mode = $state(''), cat = $state('');

  async function submit(e: Event) {
    e.preventDefault(); if (!content.trim()) return; busy = true;
    try { await createRequest({ content: content.trim(), ref: ref.trim(), mode, cat: cat.trim() }); content = ''; ref = ''; mode = ''; cat = ''; open = false; onSent?.(); }
    finally { busy = false; }
  }
</script>

<button class="ask" type="button" title="Pedir ao Atlas (Gemini): apontar, inserir ou criar" aria-label="Novo pedido" onclick={() => (open = true)}><Plus size={18} /></button>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="backdrop" onclick={(e) => { if (e.target === e.currentTarget) open = false; }}>
    <form class="modal" onsubmit={submit}>
      <div class="head"><h2>Pedir ao Atlas</h2><button type="button" class="x" onclick={() => (open = false)}><X size={18} /></button></div>
      <label>Conteúdo, link ou tema
        <!-- svelte-ignore a11y_autofocus -->
        <textarea bind:value={content} rows="5" required autofocus placeholder="cole um texto, um link, ou descreva o que quer aprender"></textarea>
      </label>
      <label>Referência (opcional)<input bind:value={ref} placeholder="URL ou fonte" /></label>
      <div class="row">
        <label>Modo
          <select bind:value={mode}><option value="">deixar decidir</option><option value="referencia">referência</option><option value="leitura">leitura</option><option value="apostila">apostila</option></select>
        </label>
        <label>Categoria / sub
          <input bind:value={cat} list="ask-cats" placeholder="ex.: frontend/css" />
          <datalist id="ask-cats">{#each cats as c}<option value={c}></option>{/each}</datalist>
        </label>
      </div>
      <div class="actions"><button type="submit" class="go" disabled={busy || !content.trim()}>{busy ? 'enviando…' : 'enviar'}</button></div>
    </form>
  </div>
{/if}

<style>
  .ask { display: inline-flex; align-items: center; justify-content: center; width: 50px; color: var(--ink-2); background: var(--surface); border: 1px solid var(--rule-2); border-radius: 3px; cursor: pointer; }
  .ask:hover { color: var(--blue); border-color: var(--blue); }
  .backdrop { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,.5); display: grid; place-items: center; padding: 16px; }
  .modal { width: min(640px, 100%); background: var(--bg-2); border: 1px solid var(--rule-2); border-radius: 12px; padding: 18px 20px 20px; display: grid; gap: 12px; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
  .head { display: flex; align-items: center; justify-content: space-between; } .head h2 { margin: 0; font-size: 22px; font-weight: 400; }
  .x { background: none; border: 0; color: var(--ink-3); cursor: pointer; }
  label { display: grid; gap: 4px; font-size: 14px; color: var(--ink-2); }
  textarea, input, select { font: inherit; font-size: 16px; color: var(--ink); background: var(--surface); border: 1px solid var(--rule-2); border-radius: 6px; padding: 9px 11px; }
  textarea { resize: vertical; }
  /* select com seta própria, com respiro da borda */
  select { appearance: none; -webkit-appearance: none; padding-right: 38px; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239399b2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>"); background-repeat: no-repeat; background-position: right 12px center; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .actions { display: flex; justify-content: flex-end; }
  .go { font: inherit; font-size: 15px; color: var(--bg); background: var(--blue); border: 0; border-radius: 6px; padding: 9px 18px; cursor: pointer; }
  .go:disabled { opacity: .5; cursor: default; }
  @media (max-width: 640px) { .row { grid-template-columns: 1fr; } }
</style>
