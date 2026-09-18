import { error } from '@sveltejs/kit';
import { find, pages } from '$lib/content';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => pages.filter((p) => !p.raw).map((p) => ({ slug: p.slug }));

/** Slug conhecido → página. Desconhecido → pode ser o kebab de um título renomeado; a página resolve no cliente. */
export const load: PageLoad = ({ params }) => {
  const slug = params.slug.replace(/\/+$/, '');
  const page = find(slug);
  if (page?.raw) error(404, 'não encontrado');
  return { page: page ?? null, slug };
};
