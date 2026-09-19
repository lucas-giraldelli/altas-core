<script lang="ts">
  /* Status dos pedidos ao worker; atualiza sozinho enquanto houver pendente/rodando. */
  import { onMount } from 'svelte';
  import { Loader, Check, AlertTriangle, ExternalLink, Trash2 } from '@lucide/svelte';
  import { listRequests, deleteRequest, type Request } from '$lib/db/requests';
  let { tick = 0, visible = false, onPending }: { tick?: number; visible?: boolean; onPending?: (n: number) => void } = $props();
  let reqs = $state<Request[]>([]);
  async function refresh() { reqs = await listRequests(); onPending?.(reqs.filter((r) => r.status === 'pending' || r.status === 'running').length); }
  $effect(() => { void tick; refresh(); });
  onMount(() => { const t = setInterval(() => { if (reqs.some((r) => r.status === 'pending' || r.status === 'running')) refresh(); }, 10000); return () => clearInterval(t); });
  const label: Record<string, string> = { exists: 'já existe:', insert: 'inserido em', create: 'criado:', edit: 'alterado:', 'rename-page': 'renomeado:', 'move-page': 'movido:', 'rename-group': 'grupo renomeado:', 'create-group': 'grupo criado:', 'delete-group': 'grupo removido:', 'clone-page': 'clonado:' };
  const fmt = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
</script>

{#if visible}
  <ul class="reqs">
    {#if !reqs.length}<li class="empty">Nenhum pedido ainda. Use o + para pedir ao Atlas.</li>{/if}
    {#each reqs.slice(0, 8) as r (r.id)}
      <li class="s-{r.status}">
        <span class="ico">
          {#if r.status === 'pending' || r.status === 'running'}<Loader size={14} class="spin" />{:else if r.status === 'done'}<Check size={14} />{:else}<AlertTriangle size={14} />{/if}
        </span>
        <span class="what">{r.content.slice(0, 80)}{r.content.length > 80 ? '…' : ''}</span>
        <span class="res">
          {#if r.status === 'done' && r.result?.url}
            <a href={r.result.url}>{label[r.result.action ?? 'create']} {r.result.title} <ExternalLink size={11} /></a>
            {#if r.result.note}<span class="note">{r.result.note}</span>{/if}
          {:else if r.status === 'error'}<span class="note">{r.result?.note}</span>
          {:else}<span class="note">{r.status === 'running' ? 'trabalhando…' : 'na fila'}</span>{/if}
        </span>
        <span class="when">{fmt(r.created)}</span>
        {#if r.status === 'done' || r.status === 'error'}<button type="button" class="del" title="Remover do histórico" onclick={async () => { await deleteRequest(r.id); refresh(); }}><Trash2 size={13} /></button>{/if}
      </li>
    {/each}
  </ul>
{/if}


<style>
  .reqs { list-style: none; padding: 0; margin: 0 0 30px; display: grid; gap: 6px; }
  .empty { color: var(--ink-3); font-size: 14px; padding: 8px 12px; }
  .reqs li { display: grid; grid-template-columns: 20px 1fr auto auto; gap: 10px; align-items: baseline; font-size: 14px; padding: 8px 12px; background: color-mix(in srgb, var(--surface) 55%, transparent); border: 1px solid var(--rule); border-radius: 8px; }
  .what { color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .res { display: grid; gap: 2px; grid-column: 2; }
  .res a { color: var(--blue); text-decoration: none; display: inline-flex; align-items: center; gap: 5px; }
  .note { color: var(--ink-3); font-size: 13px; }
  .when { font-family: var(--mono); font-size: 11px; color: var(--ink-3); grid-column: 3; grid-row: 1; }
  .del { grid-column: 4; grid-row: 1; background: none; border: 0; color: var(--ink-3); cursor: pointer; padding: 2px; }
  .s-done .ico { color: var(--green); } .s-error .ico { color: var(--red); } .s-pending .ico, .s-running .ico { color: var(--amber); }
  :global(.spin) { animation: spin 1.2s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (max-width: 640px) { .reqs li { grid-template-columns: 20px 1fr auto; } .del { grid-column: 3; } .when { display: none; } }
</style>
