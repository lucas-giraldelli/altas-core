<script lang="ts">
  import { onMount } from 'svelte';
  import { Sun, Moon } from '@lucide/svelte';
  import { getMode, setMode, type Mode } from '../theme/index.js';
  import { t } from '../i18n/index.js';
  const L = t().mode;
  let mode = $state<Mode>('dark');
  onMount(() => { mode = getMode(); });
</script>

<button type="button" title={mode === 'light' ? L.dark : L.light} aria-label={L.toggle} onclick={() => { mode = mode === 'light' ? 'dark' : 'light'; setMode(mode); }}>
  {#if mode === 'light'}<Moon size={18} />{:else}<Sun size={18} />{/if}<i>{mode === 'light' ? L.dark : L.light}</i>
</button>

<style>
  i { display: none; font-style: normal; }
</style>
