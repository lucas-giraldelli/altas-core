// atlas-core: a static knowledge base from plain HTML pages.
export { parsePages, groupByCat, findPage } from './content/loader.js';
export type { Page, Mode as PageMode } from './content/types.js';
export { enhance, type Enhancer } from './enhance/index.js';
export { mermaid } from './enhance/mermaid.js';
export { katex } from './enhance/katex.js';
export { highlight } from './enhance/highlight.js';
export { reveal } from './enhance/reveal.js';
export { mountIn } from './widgets/mountIn.js';
export { default as Diagrams } from './widgets/Diagrams.svelte';
export { default as DiagramTools } from './widgets/DiagramTools.svelte';
export { default as Toc } from './ui/Toc.svelte';
export { default as ModeToggle } from './ui/ModeToggle.svelte';
export { PALETTES, DEFAULTS, byId as paletteById, type Palette, type Tokens } from './theme/palettes.js';
export { getMode, setMode, cssTokens, getScale, setScale, getToc, setToc, type Mode } from './theme/index.js';
export { setLocale, en, ptBR, type Locale } from './i18n/index.js';
