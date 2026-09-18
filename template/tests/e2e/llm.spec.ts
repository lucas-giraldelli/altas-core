import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { pbList, pbDelete, pbToken, PB } from './helpers';
// Lento e pago (Gemini). Pede um tema que já existe: a decisão certa é "exists", sem tocar no disco.
// Roda só com ATLAS_LLM=1. Requer secrets.env e o repo local (mesmo ambiente do worker).
test.skip(!process.env.ATLAS_LLM, 'ATLAS_LLM=1 para rodar');

test('pedido sobre tema existente → worker responde "exists" apontando a página, sem alterar content/', async () => {
  test.setTimeout(180000);
  const tok = await pbToken();
  const before = execSync('git -C ~/atlas status --porcelain content').toString();
  const r = await fetch(`${PB}/api/collections/requests/records`, { method: 'POST', headers: { Authorization: tok, 'content-type': 'application/json' }, body: JSON.stringify({ content: 'como somar frações com denominadores diferentes usando o MMC', mode: 'apostila', cat: 'math', status: 'pending' }) });
  const { id } = await r.json();
  try {
    execSync('cd ~/atlas && systemctl --user stop atlas-worker; node scripts/worker.mjs --once', { stdio: 'pipe', timeout: 170000 });
    const [req] = await pbList('requests', `id = "${id}"`);
    expect(req.status).toBe('done');
    expect(req.result.action).toBe('exists');
    expect(req.result.slug).toBe('math/basic/fracoes');
    expect(execSync('git -C ~/atlas status --porcelain content').toString()).toBe(before);
  } finally { await pbDelete('requests', id); execSync('systemctl --user start atlas-worker'); }
});

test('negativo: pedido fs com operação desconhecida vira erro, sem tocar no disco', async () => {
  const tok = await pbToken();
  const r = await fetch(`${PB}/api/collections/requests/records`, { method: 'POST', headers: { Authorization: tok, 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'fs', content: 't', status: 'pending', payload: { op: 'explode', slug: 'math/basic/fracoes' } }) });
  const { id } = await r.json();
  try {
    execSync('cd ~/atlas && systemctl --user stop atlas-worker; node scripts/worker.mjs --once', { stdio: 'pipe', timeout: 60000 });
    const [req] = await pbList('requests', `id = "${id}"`);
    expect(req.status).toBe('error'); expect(req.result.note).toContain('operação desconhecida');
  } finally { await pbDelete('requests', id); execSync('systemctl --user start atlas-worker'); }
});
