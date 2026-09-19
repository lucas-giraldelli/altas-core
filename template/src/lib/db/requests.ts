import type { RecordModel } from 'pocketbase';
import { pb, quiet, me } from './client.svelte';
/** Pedidos ao worker (Gemini): apontar página existente, inserir seção, ou criar página. */
export interface Request extends RecordModel {
  content: string; ref: string; mode: string; cat: string;
  kind: '' | 'fs' | 'edit'; payload: FsOp | EditOp | null; owner: string;
  status: 'pending' | 'running' | 'done' | 'error';
  result: { action?: 'exists' | 'insert' | 'create'; slug?: string; url?: string; title?: string; note?: string } | null;
  created: string;
}
/** Operações de disco aplicadas pelo worker para manter content/ igual às categorias da interface. */
export type FsOp =
  | { op: 'rename-page'; slug: string; title: string }
  | { op: 'move-page'; slug: string; cat: string; sub: string }
  | { op: 'rename-group'; path: string; title: string }
  | { op: 'create-group'; path: string }
  | { op: 'delete-group'; path: string };
/** Pedido de alteração de uma seção de um documento (o worker reescreve só aquela seção). */
export type EditOp = { slug: string; anchor: string; heading: string; instruction: string };
const col = () => pb.collection('requests');
export const enqueueEdit = (payload: EditOp) => col().create<Request>({ kind: 'edit', owner: me(), payload, content: `${payload.heading}: ${payload.instruction}`, status: 'pending' });
export const enqueueFs = (payload: FsOp) => quiet(() => col().create<Request>({ kind: 'fs', owner: me(), payload, content: `${payload.op} ${'slug' in payload ? payload.slug : payload.path}`, status: 'pending' }), null as Request | null);
/** URL antiga (página renomeada/movida pelo worker) → slug atual. */
export const resolveAliasSlug = (from: string) => quiet(() => pb.collection('aliases').getFirstListItem<{ to: string }>(`from = "${from}"`).then((a) => a.to), null as string | null);
export const listRequests = () => quiet(() => col().getFullList<Request>({ sort: '-created' }), [] as Request[]);
export const createRequest = (d: Pick<Request, 'content' | 'ref' | 'mode' | 'cat'>) => col().create<Request>({ ...d, owner: me(), status: 'pending' });
export const deleteRequest = (id: string) => col().delete(id);
