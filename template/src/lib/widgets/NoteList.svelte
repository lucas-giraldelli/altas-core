<script lang="ts">
  import { MessageSquarePlus, Pencil, Trash2, Check, X, WandSparkles } from '@lucide/svelte';
  import EditModal from '$lib/ui/EditModal.svelte';
  import type { Note } from '$lib/db/notes';
  let { anchor, notes, canEdit, onAdd, onEdit, onDelete, onRequestEdit }: {
    anchor: string; notes: Note[]; canEdit: boolean;
    onAdd: (b: string) => Promise<void>; onEdit: (id: string, b: string) => Promise<void>; onDelete: (id: string) => Promise<void>;
    onRequestEdit?: (instruction: string) => Promise<void>;
  } = $props();
  let asking = $state(false), ask = $state(''), sent = $state(false);
  async function submitAsk(instruction: string) { if (onRequestEdit) { await onRequestEdit(instruction); sent = true; setTimeout(() => (sent = false), 4000); } }
  const heading = () => (document.getElementById(anchor)?.querySelector('h2, h3')?.textContent ?? anchor).replace(/^\d+/, '').trim();
  let adding = $state(false), draft = $state(''), editing = $state<string | null>(null), edraft = $state('');
  const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  async function submit() { if (draft.trim()) { await onAdd(draft.trim()); draft = ''; adding = false; } }
</script>

{#if asking}<EditModal title={heading()} scope="seção" onSubmit={submitAsk} onClose={() => (asking = false)} />{/if}
{#if notes.length || canEdit}
<div class="notes" data-anchor={anchor}>
  {#each notes as n (n.id)}
    <div class="note">
      {#if editing === n.id}
        <textarea bind:value={edraft} rows="3"></textarea>
        <div class="row"><button onclick={async () => { await onEdit(n.id, edraft.trim()); editing = null; }}><Check size={14} /></button><button onclick={() => (editing = null)}><X size={14} /></button></div>
      {:else}
        <p>{n.body}</p>
        <div class="row"><span class="when">{fmt(n.created)}</span>
          {#if canEdit}<button title="Editar" onclick={() => { editing = n.id; edraft = n.body; }}><Pencil size={13} /></button><button title="Apagar" onclick={() => confirm('Apagar nota?') && onDelete(n.id)}><Trash2 size={13} /></button>{/if}
        </div>
      {/if}
    </div>
  {/each}
  {#if canEdit}
    {#if adding}
      <div class="note new">
        <!-- svelte-ignore a11y_autofocus -->
        <textarea bind:value={draft} rows="3" placeholder="sua nota…" autofocus onkeydown={(e) => { if (e.key === 'Escape') adding = false; if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}></textarea>
        <div class="row"><button onclick={submit}><Check size={14} /> salvar</button><button onclick={() => (adding = false)}><X size={14} /></button></div>
      </div>
    {:else}
      <div class="row acts">
        <button class="add" onclick={() => (adding = true)}><MessageSquarePlus size={14} /> anotar</button>
        {#if onRequestEdit}<button class="add" onclick={() => (asking = true)}><WandSparkles size={14} /> pedir alteração</button>{/if}
        {#if sent}<span class="sent">pedido enviado</span>{/if}
      </div>
    {/if}
  {/if}
</div>
{/if}

<style>
  .notes { margin: 10px 0 18px; display: grid; gap: 8px; }
  .acts { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
  .sent { font-size: .8em; color: var(--ink-3); }
  .note.ask { border-left-color: var(--violet); background: color-mix(in srgb, var(--violet) 6%, transparent); }
  .note { border-left: 3px solid var(--green); background: color-mix(in srgb, var(--green) 6%, transparent); padding: 10px 14px; font-size: .92em; }
  .note p { margin: 0 0 6px; white-space: pre-wrap; }
  .row { display: flex; gap: 6px; align-items: center; }
  .when { color: var(--ink-3); font-size: 13px; margin-right: auto; }
  textarea { width: 100%; font: inherit; font-size: .95em; color: var(--ink); background: var(--bg-2); border: 1px solid var(--rule-2); border-radius: 4px; padding: 8px; resize: vertical; margin-bottom: 6px; }
  button { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 13px; padding: 4px 8px; color: var(--ink-3); background: none; border: 1px solid transparent; border-radius: 4px; cursor: pointer; }
  button:hover { color: var(--blue); border-color: var(--rule-2); }
  .add { color: var(--ink-3); opacity: .6; } .add:hover { opacity: 1; }
</style>
