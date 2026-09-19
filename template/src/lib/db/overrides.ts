import type { RecordModel } from 'pocketbase';
import { pb, quiet } from './client.svelte';

/** Ajustes por página: título exibido, ordem, oculta, subcategoria virtual. */
/** Ajustes estruturais por página (globais): título, ordem, categoria/sub virtuais e dono do documento (vazio = compartilhado). */
export interface Override extends RecordModel { slug: string; title: string; order: number; hidden: boolean; sub: string; cat: string; owner: string; shared: string[] }
const pages = () => pb.collection('overrides');
export const listOverrides = () => quiet(() => pages().getFullList<Override>(), [] as Override[]);
export const getOverride = (slug: string) => quiet(() => pages().getFirstListItem<Override>(`slug="${slug}"`), null as Override | null);
export async function saveOverride(slug: string, data: Partial<Override>) {
  const cur = await quiet(() => pages().getFirstListItem<Override>(`slug="${slug}"`), null as Override | null);
  return cur ? pages().update<Override>(cur.id, data) : pages().create<Override>({ slug, ...data });
}

/** Ajustes por grupo (categoria "trackfive" ou subcategoria "trackfive/di"): nome exibido e ordem. */
export interface Group extends RecordModel { path: string; title: string; order: number; collapsed: boolean; shared: string[] }
const groups = () => pb.collection('groups');
export const listGroups = () => quiet(() => groups().getFullList<Group>(), [] as Group[]);
export async function saveGroup(path: string, data: Partial<Group>) {
  const cur = await quiet(() => groups().getFirstListItem<Group>(`path="${path}"`), null as Group | null);
  return cur ? groups().update<Group>(cur.id, data) : groups().create<Group>({ path, ...data });
}
export async function deleteGroup(path: string) {
  const cur = await quiet(() => groups().getFirstListItem<Group>(`path="${path}"`), null as Group | null);
  if (cur) await groups().delete(cur.id);
}
