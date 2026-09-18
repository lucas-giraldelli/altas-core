# atlas-core

Core of [Atlas](https://github.com/lucas-giraldelli/atlas), a personal knowledge base built from plain didactic HTML pages. The library turns a folder of `.html` files into a themed, pre-rendered SvelteKit site: it extracts the `<main>` and metadata of each page, applies light and dark themes, builds a table of contents and renders Mermaid diagrams, KaTeX formulas and highlighted code.

The repository accepts no issues or pull requests. It is published as reference and for reuse.

## Installation

```sh
pnpm add github:lucas-giraldelli/atlas-core
pnpm add svelte mermaid katex highlight.js @lucide/svelte
```

The package is built on install (`prepare` runs `svelte-package`).

## Usage

Content loader, in a SvelteKit project with pages under `content/`:

```ts
import { parsePages, groupByCat, findPage } from '@lucasgiraldelli/atlas-core';

const files = import.meta.glob('/content/**/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const pages = parsePages(files);
export const byCat = groupByCat(pages);
```

Styles and fonts, in the root layout:

```ts
import '@lucasgiraldelli/atlas-core/styles.css';
import '@fontsource-variable/literata';
import '@fontsource-variable/jetbrains-mono';
```

Rendering a page:

```svelte
<script lang="ts">
  import { enhance, Toc, Diagrams, ModeToggle, setLocale, ptBR } from '@lucasgiraldelli/atlas-core';
  setLocale(ptBR); // UI strings default to English
  let root: HTMLElement;
  $effect(() => { enhance(root, page); });
</script>

<ModeToggle />
<Toc target={root} title={page.title} home="/" />
<main bind:this={root}>{@html page.html}</main>
<Diagrams target={root} />
```

## Page contract

A page is a plain HTML file with `<head>` metadata (`title`, `description`, `atlas-mode`, `atlas-source`, `atlas-date`) and a `<main>` using the component vocabulary described in [`docs/PAGE-CONTRACT.md`](docs/PAGE-CONTRACT.md). A starting point is in [`docs/page-template.html`](docs/page-template.html). Pages contain no styles or scripts.

## Theme

Palettes live in `src/lib/theme/palettes.ts`; `pnpm gen-tokens` regenerates `tokens.css` from them. The default dark palette is Catppuccin Mocha; the default light palette is the "paper" theme of the original Atlas.

## License

MIT.
