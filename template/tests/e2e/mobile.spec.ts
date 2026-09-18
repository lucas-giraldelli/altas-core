import { test, expect } from '@playwright/test';
import { login } from './helpers';
test.skip(({ isMobile }) => !isMobile, 'só no projeto mobile');

const PAGES = ['/', '/math/basic/fracoes/', '/trackfive/resume-parser/resume-parser-idea/', '/frontend/svelte/svelte-5-runes-e-sveltekit/', '/computer-science/algoritmos/complexidade-e-logaritmos/'];
test('nenhuma página alarga o viewport (sem scroll lateral)', async ({ page }) => {
  await login(page);
  for (const u of PAGES) {
    await page.goto(u); await page.waitForLoadState('networkidle'); await page.waitForTimeout(800);
    const [iw, sw] = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
    expect(sw, u).toBeLessThanOrEqual(iw);
  }
});
test('topbar visível e menu "Mais" abre as ações', async ({ page }) => {
  await login(page); await page.goto('/math/basic/fracoes/');
  const bar = page.locator('.topbar'); await expect(bar).toBeVisible();
  const r = await bar.boundingBox(); expect(r!.x + r!.width).toBeLessThanOrEqual(390);
  await bar.locator('button[title="Mais"]').click(); await page.waitForTimeout(500);
  await expect(bar.locator('button[title="Aumentar fonte"]')).toBeVisible();
});
test('drawer de ações sobe de baixo e fecha no scrim', async ({ page }) => {
  await login(page); await page.goto('/'); await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 15000 });
  await page.locator('li button.more').first().tap();
  const sheet = page.locator('.sheet'); await expect(sheet).toBeVisible();
  const b = await sheet.boundingBox(); expect(b!.y + b!.height).toBeGreaterThan(800);
  await page.locator('.scrim').tap(); await expect(sheet).toHaveCount(0);
});
