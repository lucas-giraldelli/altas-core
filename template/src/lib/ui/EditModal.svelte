<script lang="ts">
  /* Modal "pedir alteração" (documento inteiro ou uma seção), no mesmo estilo do "Pedir ao Atlas". */
  import { X, WandSparkles } from '@lucide/svelte';
  let { title, scope = 'documento', onSubmit, onClose }: { title: string; scope?: string; onSubmit: (instruction: string) => Promise<void>; onClose: () => void } = $props();
  let text = $state(''), busy = $state(false);
  async function submit(e: Event) { e.preventDefault(); if (!text.trim()) return; busy = true; try { await onSubmit(text.trim()); onClose(); } finally { busy = false; } }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="backdrop" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
  <form class="modal" onsubmit={submit}>
    <div class="head"><h2>Pedir alteração</h2><button type="button" class="x" onclick={onClose}><X size={18} /></button></div>
    <p class="what">{scope}: <b>{title}</b></p>
    <label>O que mudar
      <!-- svelte-ignore a11y_autofocus -->
      <textarea bind:value={text} rows="5" required autofocus placeholder="explicar melhor…, acrescentar exemplo de…, reescrever no registro didático, usar KaTeX nas fórmulas, encurtar…" onkeydown={(e) => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e); }}></textarea>
    </label>
    <div class="actions"><button type="submit" class="go" disabled={busy || !text.trim()}><WandSparkles size={15} /> {busy ? 'enviando…' : 'enviar'}</button></div>
  </form>
</div>

<style>
  .backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.5); display: grid; place-items: center; padding: 16px; }
  .modal { width: min(640px, 100%); background: var(--bg-2); border: 1px solid var(--rule-2); border-radius: 12px; padding: 18px 20px 20px; display: grid; gap: 12px; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
  .head { display: flex; align-items: center; justify-content: space-between; } .head h2 { margin: 0; font-size: 22px; font-weight: 400; }
  .x { background: none; border: 0; color: var(--ink-3); cursor: pointer; }
  .what { margin: 0; font-size: 14px; color: var(--ink-3); } .what b { color: var(--ink-2); font-weight: 600; }
  label { display: grid; gap: 4px; font-size: 14px; color: var(--ink-2); }
  textarea { font: inherit; font-size: 16px; color: var(--ink); background: var(--surface); border: 1px solid var(--rule-2); border-radius: 6px; padding: 9px 11px; resize: vertical; }
  .actions { display: flex; justify-content: flex-end; }
  .go { display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 15px; color: var(--bg); background: var(--violet); border: 0; border-radius: 6px; padding: 9px 18px; cursor: pointer; }
  .go:disabled { opacity: .5; cursor: default; }
</style>
