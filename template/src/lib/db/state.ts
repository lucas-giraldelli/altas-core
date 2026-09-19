import type { RecordModel } from 'pocketbase';
import { pb, quiet, me } from './client.svelte';
/** Estado pessoal por documento (por usuário): lido, arquivado, posição de leitura, última abertura. */
export interface DocState extends RecordModel { owner: string; slug: string; read: boolean; archived: boolean; pos: number; opened: string }
const col = () => pb.collection('state');
export const listStates = () => quiet(() => col().getFullList<DocState>(), [] as DocState[]);
export const getState = (slug: string) => quiet(() => col().getFirstListItem<DocState>(`slug="${slug}"`), null as DocState | null);
export async function saveState(slug: string, data: Partial<DocState>) {
  const cur = await quiet(() => col().getFirstListItem<DocState>(`slug="${slug}"`), null as DocState | null);
  return cur ? col().update<DocState>(cur.id, data) : col().create<DocState>({ owner: me(), slug, ...data });
}
