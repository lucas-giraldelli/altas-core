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
const want = [
  { name: 'overrides', type: 'base', listRule: AUTH, viewRule: AUTH, createRule: AUTH, updateRule: AUTH, deleteRule: AUTH,
    fields: [
      { name: 'slug', type: 'text', required: true },
      { name: 'title', type: 'text' },
      { name: 'order', type: 'number' },
      { name: 'hidden', type: 'bool' },
      { name: 'sub', type: 'text' }, // subcategoria virtual (sobrepõe a pasta)
      { name: 'archived', type: 'bool' }, // some da home, aparece em Arquivados
      { name: 'read', type: 'bool' },     // marcado como lido
      { name: 'cat', type: 'text' },      // categoria virtual (sobrepõe a pasta de primeiro nível)
      { name: 'pos', type: 'number' },    // posição de leitura (fração 0..1 do scroll), sincronizada entre aparelhos
      { name: 'opened', type: 'text' },   // ISO da última abertura; a home oferece "continuar" no mais recente
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_overrides_slug ON overrides (slug)'] },
  { name: 'groups', type: 'base', listRule: AUTH, viewRule: AUTH, createRule: AUTH, updateRule: AUTH, deleteRule: AUTH,
    fields: [
      { name: 'path', type: 'text', required: true }, // "trackfive" ou "trackfive/di"
      { name: 'title', type: 'text' },
      { name: 'order', type: 'number' },
      { name: 'collapsed', type: 'bool' },            // recolhida na home (sincroniza entre aparelhos)
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_groups_path ON groups (path)'] },
  { name: 'progress', type: 'base', listRule: AUTH, viewRule: AUTH, createRule: AUTH, updateRule: AUTH, deleteRule: AUTH,
    fields: [
      { name: 'slug', type: 'text', required: true },
      { name: 'item', type: 'number' },   // índice do item na checklist (0 é válido; required rejeitaria zero)
      { name: 'done', type: 'bool' },
      { name: 'answer', type: 'text' },                    // "explique com suas palavras"
      { name: 'feedback', type: 'text' },                  // JSON da avaliação (Gemini)
      { name: 'verdict', type: 'text' },                   // solido | parcial | revisar
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
    ],
    indexes: ['CREATE UNIQUE INDEX idx_progress_item ON progress (slug, item)'] },
  { name: 'requests', type: 'base', listRule: AUTH, viewRule: AUTH, createRule: AUTH, updateRule: AUTH, deleteRule: AUTH,
    fields: [
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
  { name: 'notes', type: 'base', listRule: AUTH, viewRule: AUTH, createRule: AUTH, updateRule: AUTH, deleteRule: AUTH,
    fields: [
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
// usuário normal para a interface (mesmo e-mail/senha do superuser por padrão)
try {
  const pin = process.env.PB_PIN ?? process.env.PB_PASS; // PIN da interface: 8 dígitos
  await pb.collection('users').create({ email: process.env.PB_USER ?? process.env.PUBLIC_PB_EMAIL ?? 'atlas@example.com', password: pin, passwordConfirm: pin, verified: true });
  console.log('user created');
} catch (e) { console.log('user exists'); }
