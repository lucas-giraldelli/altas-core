import { test, expect } from '@playwright/test';
import { home, pbList, expand } from './helpers';

test.describe('home', () => {
  test('categorias em ordem alfabética pelo nome exibido e contagem lidas/total', async ({ page }) => {
    await home(page);
    const names = await page.locator('.cathead .gname').allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')));
    for (const s of await page.locator('.cathead .stat').allTextContents()) expect(s).toMatch(/^\d+\/\d+$/);
  });

  test('recolher uma categoria persiste (PocketBase) e volta ao recarregar sem flick', async ({ page }) => {
    await home(page);
    const fold = page.locator('.cathead .fold').first(); const cat = (await page.locator('.cathead .gname').first().textContent())!.trim();
    const before = await fold.getAttribute('aria-expanded');
    await fold.click(); await page.waitForTimeout(800);
    expect(await fold.getAttribute('aria-expanded')).not.toBe(before);
    await page.reload(); await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 15000 });
    expect(await page.locator('.cathead .fold').first().getAttribute('aria-expanded')).not.toBe(before);
    const g = (await pbList('groups')).find((x) => x.title === cat || x.path === cat);
    expect(!!g?.collapsed).toBe(before === 'true');
    await page.locator('.cathead .fold').first().click(); await page.waitForTimeout(800); // desfaz
    expect(await page.locator('.cathead .fold').first().getAttribute('aria-expanded')).toBe(before);
  });

  test('busca filtra por título e some com o texto limpo', async ({ page }) => {
    await home(page);
    const total = await page.locator('li a').count();
    await page.fill('.search', 'lepton');
    await expect(page.locator('li a')).toHaveCount(1);
    await expect(page.locator('li a').first()).toContainText('Lepton');
    await page.fill('.search', 'zzzz-nao-existe');
    await expect(page.locator('li a')).toHaveCount(0);
    await page.fill('.search', '');
    await expect(page.locator('li a')).toHaveCount(total);
  });

  test('negativo: renomear para um título que já existe na mesma pasta é recusado', async ({ page }) => {
    await home(page); const restore = await expand(page, 'math');
    // math/advanced tem "Integrais" e "Limites e derivadas"
    const li = page.locator('li', { hasText: 'Integrais' }).first();
    await li.hover(); await li.locator('button[title="Renomear"]').click();
    let msg = ''; page.once('dialog', (d) => { msg = d.message(); d.dismiss(); });
    await page.locator('form.edit input').fill('Limites e derivadas'); await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    expect(msg).toContain('Já existe');
    expect((await pbList('requests', 'kind = "fs" && status = "pending"')).length).toBe(0);
    await page.keyboard.press('Escape'); await restore();
  });

  test('arquivar tira da lista, aparece em Arquivados, e desarquivar volta', async ({ page }) => {
    await home(page); const restore = await expand(page, 'math');
    const li = page.locator('li', { hasText: 'Integrais' }).first();
    await li.hover(); await li.locator('button[title="Arquivar"]').click();
    await expect(page.locator('li', { hasText: 'Integrais' })).toHaveCount(0);
    await page.locator('.bar button[title^="Arquivados"]').click();
    await expect(page.locator('h1')).toContainText('Arquivados');
    const ali = page.locator('li', { hasText: 'Integrais' }).first(); await expect(ali).toBeVisible();
    await ali.hover(); await ali.locator('button[title="Desarquivar"]').click();
    await page.locator('.bar button[title="Voltar aos ativos"]').click();
    await expect(page.locator('li', { hasText: 'Integrais' })).toHaveCount(1); await restore();
  });

  test('marcar como lido soma na contagem da categoria e é reversível', async ({ page }) => {
    await home(page); const restore = await expand(page, 'math');
    const li = page.locator('li', { hasText: 'Integrais' }).first();
    const stat = page.locator('section.catbox', { has: li }).locator('.cathead .stat');
    const [r0, n0] = (await stat.textContent())!.split('/').map(Number);
    await li.hover(); await li.locator('button[title="Marcar como lido"]').click();
    await expect(stat).toHaveText(`${r0 + 1}/${n0}`);
    await li.hover(); await li.locator('button[title="Marcar como não lido"]').click();
    await expect(stat).toHaveText(`${r0}/${n0}`); await restore();
  });

  test('reordenar subcategorias salva a ordem e pode ser desfeito', async ({ page }) => {
    await home(page); const restore = await expand(page, 'math');
    const mathHead = page.locator('.cathead', { hasText: 'math' });
    await mathHead.hover(); await mathHead.locator('button[title="Reordenar subcategorias"]').click();
    const items = page.locator('.ro-item'); const first = (await items.first().textContent())!.trim();
    await items.first().locator('button[title="Descer"]').click();
    await page.getByText('Salvar ordem').click(); await page.waitForTimeout(800);
    const mathBox = page.locator('section.catbox', { has: mathHead });
    expect((await mathBox.locator('legend .gname').first().textContent())!.trim()).not.toBe(first);
    await mathHead.hover(); await mathHead.locator('button[title="Reordenar subcategorias"]').click();
    await page.locator('.ro-item').nth(1).locator('button[title="Subir"]').click();
    await page.getByText('Salvar ordem').click(); await page.waitForTimeout(800);
    expect((await mathBox.locator('legend .gname').first().textContent())!.trim()).toBe(first); await restore();
  });
});
