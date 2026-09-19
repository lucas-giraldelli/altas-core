import type { RecordModel } from 'pocketbase';
import { pb, quiet, me } from './client.svelte';
export interface Note extends RecordModel { slug: string; anchor: string; body: string; created: string; updated: string }
const col = () => pb.collection('notes');
export const listNotes = (slug: string) => quiet(() => col().getFullList<Note>({ filter: `slug="${slug}"`, sort: 'created' }), [] as Note[]);
export const addNote = (slug: string, anchor: string, body: string) => col().create<Note>({ owner: me(), slug, anchor, body });
export const updateNote = (id: string, body: string) => col().update<Note>(id, { body });
export const deleteNote = (id: string) => col().delete(id);
