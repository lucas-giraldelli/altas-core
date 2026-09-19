<script lang="ts">
  /* Torna a ul.checklist interativa: checkbox salvo, e "explicar com minhas palavras" por item.
     Depois de salvar a explicação, mostra o trecho do documento que responde ao item (a seção
     ligada por data-ref, ou a seção de índice correspondente) para autocomparação. */
  import { onMount, mount, unmount } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { auth } from '$lib/db/client.svelte';
  import { listProgress, saveProgress, type Progress } from '$lib/db/progress';
  import ChecklistItem from './ChecklistItem.svelte';
  let { slug, target, lang = 'pt-BR', readOnly = false }: { slug: string; target: HTMLElement; lang?: string; readOnly?: boolean } = $props();

  onMount(() => {
    const mounted: Array<Record<string, unknown>> = [];
    (async () => {
      const list = target.querySelector<HTMLElement>('ul.checklist'); if (!list) return;
      const items = [...list.querySelectorAll<HTMLLIElement>('li')];
      const state = new SvelteMap<number, Progress>(); for (const p of await listProgress(slug)) state.set(p.item, p);
      const sections = [...target.querySelectorAll<HTMLElement>('section.topic[id]')].filter((s) => !/checklist|verificacao|erros/.test(s.id));
      items.forEach((li, i) => {
        const text = li.innerHTML; li.innerHTML = ''; li.classList.add('interactive');
        // referência: data-ref="#id" no li, senão a i-ésima seção conceitual (pula "De onde vem")
        const refId = li.dataset.ref?.replace('#', '');
        const ref: HTMLElement | null = (refId ? target.querySelector<HTMLElement>('#' + refId) : null) ?? sections[Math.min(i + 1, sections.length - 1)] ?? null;
        const excerpt = ref ? (ref.querySelector('.box')?.outerHTML ?? ref.querySelector('p')?.outerHTML ?? '') : '';
        const refText = ref ? (ref.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 6000) : '';
        mounted.push(mount(ChecklistItem, { target: li, props: {
          html: text, refId: ref?.id ?? '', excerpt, refText, slug, index: i, lang,
          get canEdit() { return auth.ok && !readOnly; },
          get record() { return state.get(i); },
          // o item só é concluído ao salvar uma resposta (sem marcação manual)
          onSave: async (data: Partial<Progress>) => { if ('answer' in data) data.done = !!data.answer?.trim(); state.set(i, await saveProgress(slug, i, data)); }
        } }));
      });
    })();
    return () => mounted.forEach((m) => unmount(m));
  });
</script>
