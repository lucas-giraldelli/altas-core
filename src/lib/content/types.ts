export type Mode = 'referencia' | 'leitura' | 'apostila' | '';

export interface Page {
  slug: string;        // "steam/lepton"
  cat: string;         // primeiro segmento: "steam", "trackfive"
  sub: string;         // segundo segmento quando houver: "di", "hiring-criteria"; "" senão
  title: string;
  description: string;
  lang: string;
  mode: string;        // referencia | leitura | apostila | ""
  date: string;
  source: string;      // URL ou texto de referência (meta atlas-source), pode ser vazio
  en: boolean;
  raw: boolean;        // legacy → link to /raw/<slug>.html
  html?: string;       // <main> inner HTML (atlas pages only)
  hasMath: boolean;
  hasMermaid: boolean;
  checklist: number;   // itens da checklist final (0 = não tem)
}
