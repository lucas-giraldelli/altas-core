# Installing atlas-core: a knowledge base from plain HTML

This guide is written for a coding agent (or a person) setting up a site like [Atlas](https://github.com/lucas-giraldelli/atlas) from zero. Every step is a command or a complete file. At the end there is a static site that reads `content/**/*.html`, renders each page with the theme, table of contents, Mermaid, KaTeX and highlighted code, and lists everything on a home page grouped by folder.

What this guide does not cover: authentication, notes, reading progress, the LLM worker and the filesystem sync. Those live in the Atlas application repository and depend on PocketBase; see "Going further" at the end.

## 1. Requirements

- Node 20 or newer, pnpm 9 or newer, git.
- The package is installed from GitHub and built on install (`prepare` runs `svelte-package`), so the first `pnpm install` takes a few seconds longer.

## 2. Scaffold

```sh
pnpm dlx sv@latest create my-atlas --template minimal --types ts --no-add-ons --no-install
cd my-atlas
pnpm add -D @sveltejs/adapter-static
pnpm add github:lucas-giraldelli/atlas-core svelte mermaid katex highlight.js @lucide/svelte @fontsource-variable/literata @fontsource-variable/jetbrains-mono
```

pnpm refuses to run install scripts of dependencies unless allowed. Create `pnpm-workspace.yaml`:

```yaml
allowBuilds:
  "@lucasgiraldelli/atlas-core": true
```

Then `pnpm install`.

## 3. Configuration

`vite.config.ts` (replace the generated one):

```ts
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      // Fully prerendered. nginx or any static host serves build/; 200.html handles unknown paths on the client.
      adapter: adapter({ pages: 'build', assets: 'build', strict: true, fallback: '200.html' }),
      prerender: { entries: ['*'], handleHttpError: 'warn' }
    })
  ],
  server: { fs: { allow: ['content'] } }
});
```

Delete `svelte.config.js` if the template created one with its own adapter, or make it match the adapter above.

`src/routes/+layout.ts`:

```ts
export const prerender = true;
export const trailingSlash = 'always';
```

## 4. Content index

`src/lib/content/index.ts`:

```ts
import { parsePages, groupByCat, findPage } from '@lucasgiraldelli/atlas-core/content';
export type { Page } from '@lucasgiraldelli/atlas-core/content';

const files = import.meta.glob('/content/**/*.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
export const pages = parsePages(files);
export const byCat = () => groupByCat(pages);
export const find = (slug: string) => findPage(pages, slug);
```

The folder structure is the taxonomy: `content/<category>/[<subcategory>/]<slug>.html`. The slug is the file name; keep it as the kebab-case of the title, without accents. Files under any `assets/` folder are ignored by the index.

## 5. Layout

`src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import '@fontsource-variable/literata';
  import '@fontsource-variable/jetbrains-mono';
  import '@lucasgiraldelli/atlas-core/styles.css';
  import { ModeToggle, setLocale, ptBR } from '@lucasgiraldelli/atlas-core';
  // UI strings default to English. Remove this line for English, or pass a partial object to translate.
  setLocale(ptBR);
  let { children } = $props();
</script>

<div class="topbar"><ModeToggle /></div>
{@render children()}
```

The theme reads `data-theme="dark|light"` on `<html>`; `ModeToggle` writes it and remembers the choice. To avoid a flash on load, add this to `src/app.html` inside `<head>`:

```html
<script>try{var d=document.documentElement,m=localStorage.getItem("atlas-theme");if(m==="light")d.setAttribute("data-theme","light");var s=localStorage.getItem("atlas-scale");if(s)d.style.setProperty("--fs-scale",s);if(localStorage.getItem("atlas-toc")==="closed")d.setAttribute("data-toc","closed")}catch(e){}</script>
```

## 6. Home page

`src/routes/+page.svelte`, the minimum: categories as headings, pages as links.

```svelte
<script lang="ts">
  import { byCat } from '$lib/content';
  const cats = byCat();
</script>

<main class="home">
  <div class="doc-head"><h1>Atlas</h1></div>
  {#each Object.keys(cats).sort() as cat}
    <h2 class="cat">{cat}</h2>
    <ul class="pages">
      {#each cats[cat] as p}
        <li><a href={p.raw ? `/raw/${p.slug}.html` : `/${p.slug}/`}>{p.title}{#if p.sub} <small>{p.sub}</small>{/if}</a></li>
      {/each}
    </ul>
  {/each}
</main>
```

## 7. Document route

`src/routes/[...slug]/+page.ts`:

```ts
import { error } from '@sveltejs/kit';
import { find, pages } from '$lib/content';
import type { EntryGenerator, PageLoad } from './$types';

export const entries: EntryGenerator = () => pages.filter((p) => !p.raw).map((p) => ({ slug: p.slug }));

export const load: PageLoad = ({ params }) => {
  const page = find(params.slug.replace(/\/+$/, ''));
  if (!page || page.raw) error(404, 'not found');
  return { page };
};
```

`src/routes/[...slug]/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { enhance, Toc, Diagrams } from '@lucasgiraldelli/atlas-core';
  let { data } = $props();
  let main = $state<HTMLElement>()!;
  onMount(() => {
    let cleanup = () => {};
    enhance(main, data.page).then((c) => (cleanup = c));
    return () => cleanup();
  });
</script>

<svelte:head><title>{data.page.title} · Atlas</title></svelte:head>

<div class="reading">
  <Toc target={main} title={data.page.title} home="/" />
  <main lang={data.page.lang} bind:this={main}>{@html data.page.html}</main>
  <Diagrams target={main} />
</div>
```

`enhance` runs the four enhancers in order: Mermaid (theme-aware, re-rendered on theme change), KaTeX (`$…$`, `$$…$$`, color macros `\hlb \hla \hlg \hlr \hlv \hlt`), highlight.js (`<pre data-lang="ts">`) and the reveal buttons of exercises. `Diagrams` adds zoom, drag, pinch and fullscreen to every `figure.diagram`.

## 8. Raw files

Legacy pages (no `atlas-mode` meta) and attachments (`.pdf`, images, `.ahtml`) are served untouched under `/raw/`. Copy `content/` into `static/raw/` before building; the Atlas repository does this with a small script (`scripts/sync-raw.mjs`) run in the `build` script:

```json
"build": "node scripts/sync-raw.mjs && vite build"
```

## 9. First page

Copy `node_modules/@lucasgiraldelli/atlas-core/docs/page-template.html` to `content/general/first-page.html`, fill the placeholders, and read `docs/PAGE-CONTRACT.md` in the same folder for the component vocabulary (boxes with tags, cards, numbered lists, steps, diagrams, exercises, checklist). Required `<head>` metas: `title`, `description`, `atlas-mode` (`referencia | leitura | apostila`), `atlas-source`, `atlas-date`. Pages carry no `<style>` or `<script>`.

```sh
pnpm build && pnpm preview
```

## 10. Serving

Any static server works on `build/`. With nginx, point `root` at `build`, add `try_files $uri $uri/ /200.html;` and serve `/raw/` from `build/raw/`. The Atlas repository has a complete `nginx.conf` and `docker-compose.yml`.

## Going further

The Atlas application adds, on top of this core, a PocketBase instance (SQLite, one container) that stores notes per section, a checklist with LLM grading, reading position, archived and read flags, group names and order, and a request queue for a worker that writes new pages with Gemini and keeps `content/` folders in sync with the categories shown in the interface. All of it is in <https://github.com/lucas-giraldelli/atlas>: `pb_hooks/`, `scripts/pb-setup.mjs`, `scripts/worker.mjs`, `scripts/fs-ops.mjs`, `src/lib/db/` and `src/lib/widgets/`. The core has no dependency on any of it.
