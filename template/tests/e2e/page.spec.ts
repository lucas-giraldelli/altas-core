import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('página de documento', () => {
  test('render: índice, KaTeX, mermaid, código realçado, checklist e exercícios reveláveis', async ({ page }) => {
    await login(page); await page.goto('/math/basic/fracoes/'); await page.waitForLoadState('networkidle');
    await expect(page.locator('#toc a').first()).toBeVisible();
    await expect(page.locator('.katex').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.hl-blue, .hl-amber, .hl-green').first()).toBeAttached(); // macros de cor
    await expect(page.locator('figure.diagram svg').first()).toBeVisible({ timeout: 15000 });
    const btn = page.locator('.ex button.reveal').first(); const panel = page.locator('.ex .panel:not(.hint-panel)').first();
    await expect(panel).toBeHidden(); await btn.click(); await expect(panel).toBeVisible(); await btn.click(); await expect(panel).toBeHidden();
    await expect(page.locator('ul.checklist li').first()).toBeVisible();
  });

  test('código recebe realce por data-lang', async ({ page }) => {
    await login(page); await page.goto('/frontend/svelte/svelte-5-runes-e-sveltekit/'); await page.waitForLoadState('networkidle');
    await expect(page.locator('pre[data-lang="ts"] .hljs-keyword').first()).toBeAttached({ timeout: 15000 });
  });

  test('índice: recolher mantém o botão de voltar; expandir volta', async ({ page }) => {
    await login(page); await page.goto('/math/basic/fracoes/');
    await page.locator('#toc .toc-head button').click();
    await expect(page.locator('#toc-btn a[href="/"]')).toBeVisible();
    await expect(page.locator('#toc-btn button')).toBeVisible();
    await page.locator('#toc-btn button').click();
    await expect(page.locator('#toc-btn')).toHaveCount(0);
  });

  test('tema e fonte: alternar claro/escuro persiste; aumentar fonte muda --fs-scale', async ({ page }) => {
    await login(page); await page.goto('/math/basic/fracoes/');
    const mode = () => page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const m0 = await mode(); await page.locator('.topbar button[title^="Modo"]').click(); expect(await mode()).not.toBe(m0);
    await page.reload(); expect(await mode()).not.toBe(m0);
    await page.locator('.topbar button[title^="Modo"]').click(); expect(await mode()).toBe(m0);
    const scale = () => page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fs-scale') || '1'));
    const s0 = await scale(); await page.locator('button[title="Aumentar fonte"]').click(); expect(await scale()).toBeGreaterThan(s0);
    await page.locator('button[title="Diminuir fonte"]').click(); expect(await scale()).toBeCloseTo(s0, 2);
  });

  test('blocos largos não saem da coluna do texto', async ({ page }) => {
    await login(page); await page.goto('/trackfive/resume-parser/resume-parser-idea/'); await page.waitForLoadState('networkidle');
    const out = await page.evaluate(() => {
      const m = document.querySelector('main')!.getBoundingClientRect(); const cs = getComputedStyle(document.querySelector('main')!);
      const L = m.left + parseFloat(cs.paddingLeft), R = m.right - parseFloat(cs.paddingRight);
      return [...document.querySelectorAll('main .cards, main figure, main .table-wrap, main pre')].filter((e) => { const r = e.getBoundingClientRect(); return r.left < L - 2 || r.right > R + 2; }).length;
    });
    expect(out).toBe(0);
  });

  test('negativo: slug inexistente mostra "Não encontrado"', async ({ page }) => {
    await login(page); await page.goto('/math/nao-existe-mesmo/');
    await expect(page.locator('h1')).toHaveText('Não encontrado', { timeout: 15000 });
  });
});
