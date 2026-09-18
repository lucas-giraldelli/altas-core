# atlas-core

Core of Atlas, a personal knowledge base built from plain didactic HTML pages. The library turns a folder of `.html` files into a themed, pre-rendered SvelteKit site: it extracts the `<main>` and metadata of each page, applies light and dark themes, builds a table of contents and renders Mermaid diagrams, KaTeX formulas and highlighted code.

The repository accepts no issues or pull requests. It is published as reference and for reuse.

## Quick start

```sh
pnpm dlx --allow-build=@lucasgiraldelli/atlas-core github:lucas-giraldelli/atlas-core my-atlas
```

creates a complete instance (PIN gate, notes, LLM-graded checklist, reading position, worker, PDF export, tests) from the template shipped in the package. The step-by-step, including the core-only path for a static reading site, is in [`docs/INSTALL.md`](docs/INSTALL.md).

## Installation (library only)

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

## Writing pages: the /learn skill

Pages are meant to be written by a coding agent. `skill/learn/` holds the authoring skill used for Atlas: three modes chosen by purpose (reference, reading, workbook), a textbook register with explicit prohibitions, the page structure, color roles, KaTeX and Mermaid rules, and the output steps (category, slug, build, commit). Install it as a skill of the agent in use, for example:

```sh
mkdir -p ~/.claude/skills && cp -r node_modules/@lucasgiraldelli/atlas-core/skill/learn ~/.claude/skills/learn
```

Then `/learn leitura <topic or URL>` writes a page into `content/`. The skill is in Portuguese; the pages it writes follow the language of the request (`--en` for English).

## Interactive check with an LLM

`docs/INTERACTIVE-CHECK.md` describes the optional layer that grades the reader's explanations against the referenced section: PocketBase collection, the grading hook with the model key kept server-side, and the client widget mounted with `mountIn`.

## Page contract

A page is a plain HTML file with `<head>` metadata (`title`, `description`, `atlas-mode`, `atlas-source`, `atlas-date`) and a `<main>` using the component vocabulary described in [`docs/PAGE-CONTRACT.md`](docs/PAGE-CONTRACT.md). A starting point is in [`docs/page-template.html`](docs/page-template.html). Pages contain no styles or scripts.

## Theme

Palettes live in `src/lib/theme/palettes.ts`; `pnpm gen-tokens` regenerates `tokens.css` from them. The default dark palette is Catppuccin Mocha; the default light palette is the "paper" theme of the original Atlas.

## License

MIT.
