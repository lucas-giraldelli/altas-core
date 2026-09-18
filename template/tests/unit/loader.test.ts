import { describe, it, expect } from 'vitest';
import { parsePages, groupByCat, findPage } from '@lucasgiraldelli/atlas-core/content';

const page = (title: string, mode = 'leitura', extra = '') => `<!DOCTYPE html><html lang="pt-BR"><head><title>${title}</title><meta name="description" content="d"><meta name="atlas-mode" content="${mode}">${extra}</head><body><main><h1>${title}</h1></main></body></html>`;

describe('parsePages (content/ → índice)', () => {
  const files = {
    '/content/math/basic/fracoes.html': page('Frações', 'apostila'),
    '/content/math/integrais.html': page('Integrais'),
    '/content/steam/oss/lepton.html': page('Lepton (EN)', 'leitura', '<meta name="atlas-source" content="https://x">').replace('lang="pt-BR"', 'lang="en"'),
    '/content/trackfive/resume-parser/assets/mock.html': page('ignorado'),
    '/content/legacy/old.html': '<html><head><title>Velha</title><style>b{}</style></head><body><main>x</main></body></html>'
  };
  const pages = parsePages(files);
  it('categoria e subcategoria vêm do caminho', () => {
    const f = findPage(pages, 'math/basic/fracoes')!;
    expect(f.cat).toBe('math'); expect(f.sub).toBe('basic'); expect(f.mode).toBe('apostila');
    expect(findPage(pages, 'math/integrais')!.sub).toBe('');
  });
  it('ignora assets/ e marca páginas sem atlas-mode como raw', () => {
    expect(pages.some((p) => p.slug.includes('/assets/'))).toBe(false);
    expect(findPage(pages, 'legacy/old')!.raw).toBe(true);
  });
  it('lê lang e remove o sufixo (EN) do título', () => {
    const l = findPage(pages, 'steam/oss/lepton')!; expect(l.lang).toBe('en'); expect(l.title).toBe('Lepton');
  });
  it('agrupa por categoria', () => {
    const g = groupByCat(pages); expect(Object.keys(g).sort()).toEqual(['legacy', 'math', 'steam', 'trackfive'].filter((c) => c !== 'trackfive'));
    expect(g.math).toHaveLength(2);
  });
});
