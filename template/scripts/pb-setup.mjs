// Cria as coleções do atlas no PocketBase (idempotente). Uso: PB_URL=http://localhost:8090 PB_EMAIL=… PB_PASS=… node scripts/pb-setup.mjs
import PocketBase from 'pocketbase';
import { execSync } from 'node:child_process';
const pb = new PocketBase(process.env.PB_URL ?? 'http://localhost:8090');
try { await pb.collection('_superusers').authWithPassword(process.env.PB_EMAIL, process.env.PB_PASS); }
catch (e) {
  // instância recém-criada: ainda não há superuser. Cria pelo binário dentro do container e tenta de novo.
  const svc = process.env.PB_SERVICE ?? 'atlas-db', proj = process.env.COMPOSE_PROJECT ? `-p ${process.env.COMPOSE_PROJECT}` : '';
  console.log('superuser ausente ou senha incorreta; criando via docker compose exec', svc);
  execSync(`docker compose ${proj} exec -T ${svc} /usr/local/bin/pocketbase superuser upsert ${JSON.stringify(process.env.PB_EMAIL)} ${JSON.stringify(process.env.PB_PASS)} --dir /pb_data`, { stdio: 'inherit' });
  await pb.collection('_superusers').authWithPassword(process.env.PB_EMAIL, process.env.PB_PASS);
}
const AUTH = '@request.auth.id != ""';
// coleções pessoais: cada registro tem `owner`; só o dono lê e escreve (o worker é superuser e vê tudo)
const MINE = 'owner = @request.auth.id';
const OWNED = { listRule: MINE, viewRule: MINE, createRule: `${AUTH} && ${MINE}`, updateRule: MINE, deleteRule: MINE };
const owner = () => ({ name: 'owner', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1, cascadeDelete: false });
const want = [
  { name: 'overrides', type: 'base', listRule: AUTH, viewRule: AUTH, createRule: AUTH, updateRule: AUTH, deleteRule: AUTH,
    fields: [
      { name: 'slug', type: 'text', required: true },
      { name: 'title', type: 'text' },
      { name: 'order', type: 'number' },
      { name: 'hidden', type: 'bool' },
      { name: 'sub', type: 'text' }, // subcategoria virtual (sobrepõe a pasta)
      { name: 'cat', type: 'text' },      // categoria virtual (sobrepõe a pasta de primeiro nível)
      owner(),                            // dono do documento: vazio = compartilhado; preenchido = só esse usuário vê na home
      ...(process.env.KEEP_LEGACY ? [{ name: 'archived', type: 'bool' }, { name: 'read', type: 'bool' }, { name: 'pos', type: 'number' }, { name: 'opened', type: 'text' }] : []), // só durante a migração para state
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_overrides_slug ON overrides (slug)'] },
  // estado pessoal por documento: lido, arquivado, posição de leitura, última abertura
  { name: 'state', type: 'base', ...OWNED,
    fields: [
      owner(),
      { name: 'slug', type: 'text', required: true },
      { name: 'read', type: 'bool' },
      { name: 'archived', type: 'bool' },
      { name: 'pos', type: 'number' },
      { name: 'opened', type: 'text' },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_state_owner_slug ON state (owner, slug)'] },
  { name: 'groups', type: 'base', listRule: AUTH, viewRule: AUTH, createRule: AUTH, updateRule: AUTH, deleteRule: AUTH,
    fields: [
      { name: 'path', type: 'text', required: true }, // "trackfive" ou "trackfive/di"
      { name: 'title', type: 'text' },
      { name: 'order', type: 'number' },
      { name: 'collapsed', type: 'bool' },            // recolhida na home (sincroniza entre aparelhos)
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_groups_path ON groups (path)'] },
  { name: 'progress', type: 'base', ...OWNED,
    fields: [
      owner(),
      { name: 'slug', type: 'text', required: true },
      { name: 'item', type: 'number' },   // índice do item na checklist (0 é válido; required rejeitaria zero)
      { name: 'done', type: 'bool' },
      { name: 'answer', type: 'text' },                    // "explique com suas palavras"
      { name: 'feedback', type: 'text' },                  // JSON da avaliação (Gemini)
      { name: 'verdict', type: 'text' },                   // solido | parcial | revisar
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_progress_item ON progress (owner, slug, item)'] },
  { name: 'requests', type: 'base', ...OWNED,
    fields: [
      owner(),
      { name: 'content', type: 'text', required: true },   // texto, link ou tema
      { name: 'ref', type: 'text' },                       // referência opcional (URL ou texto)
      { name: 'mode', type: 'text' },                      // referencia | leitura | apostila
      { name: 'cat', type: 'text' },                       // categoria/sub sugerida ("frontend/css")
      { name: 'kind', type: 'text' },                      // '' (Gemini) | fs (operação de disco: renomear/mover)
      { name: 'payload', type: 'json' },                   // fs: { op, slug|path, title|cat|sub }
      { name: 'status', type: 'text' },                    // pending | running | done | error
      { name: 'result', type: 'json' },                    // { action, slug, url, title, note }
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ] },
  // URLs antigas de páginas renomeadas/movidas pelo worker → slug atual
  { name: 'aliases', type: 'base', listRule: AUTH, viewRule: AUTH, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { name: 'from', type: 'text', required: true },
      { name: 'to', type: 'text', required: true },
      { name: 'created', type: 'autodate', onCreate: true }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_aliases_from ON aliases (`from`)'] },
  { name: 'notes', type: 'base', ...OWNED,
    fields: [
      owner(),
      { name: 'slug', type: 'text', required: true },
      { name: 'anchor', type: 'text' },
      { name: 'body', type: 'text', required: true },
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    indexes: ['CREATE INDEX idx_notes_slug ON notes (slug)'] }
];
for (const c of want) {
  const existing = await pb.collections.getList(1, 50).then((r) => r.items.find((i) => i.name === c.name));
  if (existing) { await pb.collections.update(existing.id, c); console.log('updated', c.name); }
  else { await pb.collections.create(c); console.log('created', c.name); }
}
// usuários da interface: `username` é a identidade (o gate testa o PIN contra cada um).
// PB_USERS="lucas:12345678,thyci:52525252" (compat: PB_USER/PB_PIN cria um só)
const users = await pb.collections.getOne('users');
if (!users.fields.some((f) => f.name === 'username')) {
  users.fields.push({ name: 'username', type: 'text', required: true, min: 2, max: 32, pattern: '^[a-z0-9_-]+$' });
  users.indexes = [...(users.indexes ?? []), 'CREATE UNIQUE INDEX idx_users_username ON users (username)'];
  users.passwordAuth = { ...(users.passwordAuth ?? {}), enabled: true, identityFields: ['email', 'username'] };
  await pb.collections.update(users.id, users); console.log('users: username added');
}
const spec = process.env.PB_USERS ?? `${process.env.PB_USER ?? 'atlas'}:${process.env.PB_PIN ?? process.env.PB_PASS}`;
for (const pair of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
  const [username, pin] = pair.split(':');
  try {
    const u = await pb.collection('users').getFirstListItem(`username = "${username}"`);
    if (pin) await pb.collection('users').update(u.id, { password: pin, passwordConfirm: pin });
    console.log('user updated', username);
  } catch {
    await pb.collection('users').create({ username, email: `${username}@atlas.local`, password: pin, passwordConfirm: pin, verified: true });
    console.log('user created', username);
  }
}
