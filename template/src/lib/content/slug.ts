/** Título → kebab-case sem acentos. É a mesma regra dos nomes de arquivo em content/. */
export const kebab = (s: string) =>
  s.replace(/\s*\(EN\)\s*$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase();
