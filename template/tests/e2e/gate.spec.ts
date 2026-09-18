import { test, expect } from '@playwright/test';
import { login } from './helpers';

test('sem cookie, qualquer página cai no PIN', async ({ page }) => {
  await page.goto('/math/basic/fracoes/');
  await expect(page).toHaveURL(/\/gate\//);
  await expect(page.locator('.cells .cell')).toHaveCount(8);
});
test('negativo: PIN errado mostra erro e continua no gate', async ({ page }) => {
  await page.goto('/gate/'); await page.waitForTimeout(300);
  await page.keyboard.type('00000000');
  await expect(page.locator('.err')).toHaveText('PIN incorreto', { timeout: 10000 });
  await expect(page).toHaveURL(/\/gate\//);
});
test('PIN certo entra e a home aparece sem skeleton', async ({ page }) => {
  await login(page);
  await expect(page.locator('h1')).toContainText('Atlas');
  await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 15000 });
});
