<script lang="ts">
  /* Monta a barra de zoom/arrastar/tela cheia em cada figure.diagram do conteúdo. */
  import { onMount } from 'svelte';
  import { mountIn } from './mountIn.js';
  import DiagramTools from './DiagramTools.svelte';
  let { target }: { target: HTMLElement } = $props();
  onMount(() => {
    // qualquer figure com desenho (Mermaid ou SVG inline) ganha zoom/arrastar/tela cheia
    target.querySelectorAll<HTMLElement>('figure').forEach((f) => { if (f.querySelector('svg, pre.mermaid') && !f.querySelector('figcaption ~ *')) f.classList.add('diagram'); });
    return mountIn(target, 'figure.diagram', DiagramTools, (fig) => ({ figure: fig }), (fig, host) => {
      const cap = fig.querySelector('figcaption'); if (cap) cap.before(host); else fig.append(host);
    });
  });
</script>
