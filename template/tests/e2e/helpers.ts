import { type Page, expect } from '@playwright/test';
export const PIN = process.env.ATLAS_PIN || '12345678';
export const USER = process.env.PUBLIC_PB_EMAIL || 'atlas@example.com';
export const PB = process.env.PB_URL || 'http://localhost:8090';

/** Entra pela tela de PIN (auto-submit ao 8º dígito). */
export async function login(page: Page) {
  await page.goto('/gate/'); await page.waitForTimeout(300);
  await page.keyboard.type(PIN);
  await page.waitForURL((u) => !u.pathname.startsWith('/gate'), { timeout: 15000 });
}
/** Token de usuário para consultar o PocketBase direto nos testes. */
export async function pbToken() {
  const r = await fetch(`${PB}/api/collections/users/auth-with-password`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identity: USER, password: PIN }) });
  return (await r.json()).token as string;
}
export async function pbList(col: string, filter = '') {
  const tok = await pbToken();
  const r = await fetch(`${PB}/api/collections/${col}/records?perPage=200${filter ? '&filter=' + encodeURIComponent(filter) : ''}`, { headers: { Authorization: tok } });
  return (await r.json()).items as any[];
}
export async function pbDelete(col: string, id: string) {
  const tok = await pbToken(); await fetch(`${PB}/api/collections/${col}/records/${id}`, { method: 'DELETE', headers: { Authorization: tok } });
}
/** Abre a home já autenticado e espera a lista real (não o skeleton). */
export async function home(page: Page) {
  await login(page); await page.goto('/');
  await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 15000 });
  await expect(page.locator('.cathead').first()).toBeVisible();
}
/** Garante a categoria expandida; devolve função que restaura o estado anterior. */
export async function expand(page: Page, cat: string) {
  const head = page.locator('.cathead', { has: page.locator('.gname', { hasText: new RegExp(`^${cat}$`) }) });
  const fold = head.locator('.fold'); const was = await fold.getAttribute('aria-expanded');
  if (was !== 'true') { await fold.click(); await page.waitForTimeout(600); }
  return async () => { if (was !== 'true') { await head.locator('.fold').click(); await page.waitForTimeout(600); } };
}
