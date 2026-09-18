// Páginas do atlas: HTML em /content lido no build; o parse vem da biblioteca atlas-core.
import { parsePages, groupByCat, findPage } from '@lucasgiraldelli/atlas-core';
export type { Page } from '@lucasgiraldelli/atlas-core';

const files = import.meta.glob('/content/**/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const pages = parsePages(files).sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
export const byCat = () => groupByCat(pages);
export const find = (slug: string) => findPage(pages, slug);
