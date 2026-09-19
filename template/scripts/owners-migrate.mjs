// Migração única para múltiplos usuários: move lido/arquivado/posição de `overrides` para `state`
// e atribui `owner` aos registros pessoais existentes. Uso: OWNER=lucas node scripts/owners-migrate.mjs
import PocketBase from 'pocketbase';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('secrets.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split('=', 2)));
const pb = new PocketBase(process.env.PB_URL || 'http://localhost:8090'); pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(env.PB_EMAIL, env.PB_PASS);
const me = await pb.collection('users').getFirstListItem(`username = "${process.env.OWNER || 'lucas'}"`);
let n = 0;
for (const col of ['notes', 'progress', 'requests']) for (const r of await pb.collection(col).getFullList()) if (!r.owner) { await pb.collection(col).update(r.id, { owner: me.id }); n++; }
for (const o of await pb.collection('overrides').getFullList()) {
  if (!(o.read || o.archived || o.pos || o.opened)) continue;
  let s = null; try { s = await pb.collection('state').getFirstListItem(`owner = "${me.id}" && slug = "${o.slug}"`); } catch {}
  const data = { owner: me.id, slug: o.slug, read: !!o.read, archived: !!o.archived, pos: o.pos || 0, opened: o.opened || '' };
  if (s) await pb.collection('state').update(s.id, data); else await pb.collection('state').create(data); n++;
}
console.log('migrados', n, 'registros para', me.username);
