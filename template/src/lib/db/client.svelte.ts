/** PocketBase: camada do usuário por cima do conteúdo estático. Uma credencial: e-mail fixo + PIN (senha). */
import PocketBase from 'pocketbase';
import { PUBLIC_PB_URL, PUBLIC_PB_EMAIL } from '$env/static/public';
import { browser } from '$app/environment';

export const pb = new PocketBase(PUBLIC_PB_URL);
pb.autoCancellation(false);

export const auth = $state({ ok: browser && pb.authStore.isValid });
if (browser) pb.authStore.onChange(() => {
  auth.ok = pb.authStore.isValid;
  // o nginx lê este cookie em toda requisição (auth_request)
  if (pb.authStore.isValid) document.cookie = `atlas_token=${pb.authStore.token}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax; Secure`;
});

export const loginWithPin = (pin: string) => pb.collection('users').authWithPassword(PUBLIC_PB_EMAIL, pin);
export const logout = () => pb.authStore.clear();

/** falha silenciosa: sem API (offline, rota ausente) o site continua só leitura */
export const quiet = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => { try { return await fn(); } catch { return fallback; } };
