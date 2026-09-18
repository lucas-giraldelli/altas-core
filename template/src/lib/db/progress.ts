import type { RecordModel } from 'pocketbase';
import { pb, quiet } from './client.svelte';
/** Checklist: item marcado e a explicação "com suas palavras". Um registro por (página, item). */
export interface Progress extends RecordModel { slug: string; item: number; done: boolean; answer: string; feedback: string; verdict: string; updated: string }
export interface Grade { verdict: 'solido' | 'parcial' | 'revisar'; right: string; missing: string; wrong: string; tip: string }
/** Avaliação pelo Gemini via hook do PocketBase (chave fica no servidor). */
export const grade = (body: { slug: string; item: number; question: string; reference: string; answer: string; lang?: string }) =>
  pb.send<Grade>('/api/atlas/grade', { method: 'POST', body });
const col = () => pb.collection('progress');
export const listProgress = (slug: string) => quiet(() => col().getFullList<Progress>({ filter: `slug="${slug}"` }), [] as Progress[]);
export const listAllProgress = () => quiet(() => col().getFullList<Progress>(), [] as Progress[]);
export async function saveProgress(slug: string, item: number, data: Partial<Progress>) {
  const cur = await quiet(() => col().getFirstListItem<Progress>(`slug="${slug}" && item=${item}`), null as Progress | null);
  return cur ? col().update<Progress>(cur.id, data) : col().create<Progress>({ slug, item, ...data });
}
