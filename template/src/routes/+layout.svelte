<script lang="ts">
  import '@fontsource-variable/literata';
  import '@fontsource-variable/jetbrains-mono';
  import '@lucasgiraldelli/atlas-core/styles.css';
  import { setLocale, ptBR } from '@lucasgiraldelli/atlas-core';
  setLocale(ptBR);
  import Topbar from '$lib/ui/Topbar.svelte';
  import { page } from '$app/state';
  let { children } = $props();
</script>

{#if !page.url.pathname.startsWith('/gate')}<Topbar />{/if}
{@render children()}
