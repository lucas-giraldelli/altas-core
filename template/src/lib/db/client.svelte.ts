/** PocketBase: camada do usuário por cima do conteúdo estático. Cada pessoa tem um usuário (username) e um PIN (senha); o gate só pede o PIN e testa contra cada usuário. */
import PocketBase from 'pocketbase';
import { PUBLIC_PB_URL, PUBLIC_PB_USERS } from '$env/static/public';
import { browser } from '$app/environment';

export const pb = new PocketBase(PUBLIC_PB_URL);
pb.autoCancellation(false);

export const auth = $state({ ok: browser && pb.authStore.isValid });
if (browser) pb.authStore.onChange(() => {
  auth.ok = pb.authStore.isValid;
  // o nginx lê este cookie em toda requisição (auth_request)
  if (pb.authStore.isValid) document.cookie = `atlas_token=${pb.authStore.token}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax; Secure`;
});

export const USERS = PUBLIC_PB_USERS.split(',').map((s) => s.trim()).filter(Boolean);
export async function loginWithPin(pin: string) {
  let last: unknown;
  for (const u of USERS) { try { return await pb.collection('users').authWithPassword(u, pin); } catch (e) { last = e; } }
  throw last;
}
/** id do usuário logado (dono dos registros pessoais) */
export const me = () => pb.authStore.record?.id ?? '';
export const myName = () => (pb.authStore.record as { username?: string } | null)?.username ?? '';
export const logout = () => pb.authStore.clear();

/** falha silenciosa: sem API (offline, rota ausente) o site continua só leitura */
export const quiet = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => { try { return await fn(); } catch { return fallback; } };
