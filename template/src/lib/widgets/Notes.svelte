<script lang="ts">
  /* Comentários por seção: um botão "anotar" em cada section.topic, logo abaixo do lede. */
  import { onMount } from 'svelte';
  import { auth } from '$lib/db/client.svelte';
  import { listNotes, addNote, updateNote, deleteNote, type Note } from '$lib/db/notes';
  import { mountIn } from '@lucasgiraldelli/atlas-core';
  import { enqueueEdit } from '$lib/db/requests';
  import NoteList from './NoteList.svelte';

  let { slug, target, readOnly = false }: { slug: string; target: HTMLElement; readOnly?: boolean } = $props();
  let notes = $state<Note[]>([]);

  onMount(() => {
    let cleanup = () => {};
    listNotes(slug).then((n) => {
      notes = n;
      cleanup = mountIn(target, 'section.topic[id]', NoteList, (sec) => ({
        anchor: sec.id,
        get notes() { return notes.filter((x) => x.anchor === sec.id); },
        get canEdit() { return auth.ok && !readOnly; },
        onAdd: async (body: string) => { notes = [...notes, await addNote(slug, sec.id, body)]; },
        onEdit: async (id: string, body: string) => { const n = await updateNote(id, body); notes = notes.map((x) => (x.id === id ? n : x)); },
        onDelete: async (id: string) => { await deleteNote(id); notes = notes.filter((x) => x.id !== id); },
        onRequestEdit: readOnly ? undefined : async (instruction: string) => { await enqueueEdit({ slug, anchor: sec.id, heading: [...(sec.querySelector('h2, h3')?.childNodes ?? [])].filter((c) => !(c instanceof Element && c.classList.contains('n'))).map((c) => c.textContent).join('').trim() || sec.id, instruction }); }
      }));
    });
    return () => cleanup();
  });
</script>
