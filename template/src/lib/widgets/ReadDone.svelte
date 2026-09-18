<script lang="ts">
  /* Botão no fim da leitura: marca a página como lida (ou desmarca). */
  import { onMount } from 'svelte';
  import { BookCheck, BookOpen } from '@lucide/svelte';
  import { auth } from '$lib/db/client.svelte';
  import { getOverride, saveOverride } from '$lib/db/overrides';
  let { slug }: { slug: string } = $props();
  let read = $state<boolean | null>(null);
  onMount(async () => { if (auth.ok) read = !!(await getOverride(slug))?.read; });
  async function toggle() { const o = await saveOverride(slug, { read: !read }); read = !!o.read; }
</script>

{#if read !== null}
  <div class="done">
    <button type="button" class:read onclick={toggle}>
      {#if read}<BookCheck size={18} /> Lido{:else}<BookOpen size={18} /> Marcar como lido{/if}
    </button>
    {#if read}<span>Você marcou esta página como lida. Toque para desfazer.</span>{/if}
  </div>
{/if}

<style>
  .done { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin: 56px 0 0; padding-top: 24px; border-top: 1px solid var(--rule); }
  button { display: inline-flex; align-items: center; gap: 8px; font: inherit; font-size: 16px; padding: 10px 18px; color: var(--blue); background: none; border: 1px solid var(--blue); border-radius: 8px; cursor: pointer; }
  button.read { color: var(--green); border-color: var(--green); background: color-mix(in srgb, var(--green) 10%, transparent); }
  span { font-size: 14px; color: var(--ink-3); }
</style>
