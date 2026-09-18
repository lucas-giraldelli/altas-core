import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('URL antiga (página movida/renomeada no disco) redireciona para a atual, com hash', async ({ page }) => {
  await login(page);
  await page.goto('/math/fracoes/'); await expect(page).toHaveURL(/\/math\/basic\/fracoes\/$/, { timeout: 15000 });
  await expect(page.locator('.doc-head h1')).toHaveText('Frações');
  await page.goto('/trackfive/di/como-o-laravel-injeta/#secao'); await expect(page).toHaveURL(/\/trackfive\/dependency-injection\/como-o-laravel-faz-di\/#secao$/, { timeout: 15000 });
});
