# Installing Atlas

Two ways to use atlas-core. **Full instance** (recommended): one command creates a complete Atlas, the same application the author runs, with PIN gate, notes, interactive checklist graded by an LLM, reading position, home with groups and archive, a worker that writes pages with any LLM and keeps folders in sync with categories, PDF export, tests. **Core only**: a static reading site with no backend, described at the end.

Every step is a command or a complete file. This guide is written so that a coding agent can follow it without judgment calls.

## Full instance

### 1. Requirements

- Node 20+, pnpm 9+, git, Docker with Compose.
- Optional: an LLM key (Gemini, Anthropic, OpenAI or an OpenAI-compatible endpoint such as Ollama). Without it everything works except grading and page generation.
- Optional, for PDF export: Chromium for Playwright (`pnpm exec playwright install chromium`). Without it the build skips PDFs.

### 2. Create

```sh
pnpm dlx --allow-build=@lucasgiraldelli/atlas-core github:lucas-giraldelli/atlas-core my-atlas
cd my-atlas
cp secrets.env.example secrets.env
```

Edit `secrets.env`:

```
LLM_KEY=…                          # credential
LLM_MODEL=gemini-3.5-flash-lite    # or claude-haiku-4-5-20251001, gpt-5-mini, llama3.1…
# LLM_PROVIDER=gemini              # gemini | anthropic | openai | ollama; inferred from key/model if omitted
# LLM_BASE_URL=http://host:11434/v1
PB_EMAIL=admin@example.com         # PocketBase superuser (worker, setup)
PB_PASS=a-long-password
PB_USERS=alice:12345678,bob:87654321   # interface users, name:PIN (8 digits); each person has their own PIN
```

`.env` holds the two public values the browser sees: `PUBLIC_PB_URL` (the PocketBase URL, `http://localhost:8090` locally) and `PUBLIC_PB_USERS` (the usernames the gate tries the PIN against, e.g. `alice,bob`). Each person has their own notes, checklist answers, reading position, read and archived flags; a document can be shared or owned by one person (others do not see it on the home).

### 3. Install and start

```sh
pnpm install                                   # builds atlas-core from GitHub (allowed in pnpm-workspace.yaml)
docker compose up -d                           # nginx on 127.0.0.1:4173, PocketBase on 127.0.0.1:8090
set -a; . ./secrets.env; set +a
node scripts/pb-setup.mjs                      # creates the superuser if missing, the collections and the interface user
pnpm build                                     # site in build/, PDFs in build/pdf/
```

Open <http://localhost:4173>, type the PIN. The home is empty until `content/` has pages.

### 4. First pages

Two options. With an agent: install the skill shipped in the package and ask for a page.

```sh
mkdir -p ~/.claude/skills && cp -r node_modules/@lucasgiraldelli/atlas-core/skill/learn ~/.claude/skills/learn
# then, in the agent: /learn leitura <topic or URL>
```

By hand: copy `node_modules/@lucasgiraldelli/atlas-core/docs/page-template.html` to `content/<category>/<slug>.html`, fill the placeholders following `docs/PAGE-CONTRACT.md`, `pnpm build`.

Folders are the taxonomy: `content/<category>/[<subcategory>/]<slug>.html`, slug = kebab-case of the title. Renaming or moving from the interface is applied to disk by the worker (next step).

### 5. Worker

The worker runs on the machine that owns the git repository. It consumes the `requests` collection: "ask Atlas" from the home (the LLM decides between pointing to an existing page, inserting a section, or writing a new page) and filesystem intents (rename, move, groups). After each change it builds, commits and pushes.

```sh
node scripts/worker.mjs --once      # one pass, useful to test
node scripts/worker.mjs             # loop, every 30 s
```

As a user service (Linux): copy `atlas-worker.service` to `~/.config/systemd/user/`, fix the paths, `systemctl --user daemon-reload && systemctl --user enable --now atlas-worker`. The worker commits with the repository's git identity (`git config user.name/user.email`).

### 6. Exposing on the internet

Put any TLS proxy in front of the two containers: site to `atlas:80`, API to `atlas-db:8090` (Cloudflare Tunnel, Caddy, Traefik). Then set `PUBLIC_PB_URL` in `.env` to the public API URL and rebuild. Everything behind the site requires the PIN cookie (nginx `auth_request` validated by PocketBase); the API enforces `@request.auth.id != ""` on every collection.

### 7. Tests

```sh
pnpm test         # unit: slug rules, loader, filesystem operations (temp git repo + fake PocketBase), LLM config
pnpm test:e2e     # Playwright against the running site; ATLAS_URL, PB_URL, ATLAS_PIN, PUBLIC_PB_EMAIL override defaults
pnpm test:llm     # one real LLM request through the worker (paid)
```

The e2e page tests reference the author's sample pages (`math/basic/fracoes`, `frontend/svelte/…`); adapt the slugs in `tests/e2e/*.spec.ts` to your content or keep them as examples.

### 8. Layout of an instance

```
content/            pages (folders = categories)
src/routes/         home, gate, [...slug] document
src/lib/db/         PocketBase client, overrides, notes, progress, requests
src/lib/widgets/    Notes, Checklist (LLM-graded), ReadDone
src/lib/ui/         Topbar (font, theme, PDF share, read), AskAtlas, RequestList
pb_hooks/           grade.pb.js (LLM grading endpoint, key stays server-side)
scripts/            pb-setup, worker, llm (providers), fs-ops (disk sync), gen-pdf, sync-raw
tests/              vitest + playwright
nginx.conf, docker-compose.yml, atlas-worker.service
```

Interface strings are in Portuguese (the author's language); UI strings of the core follow `setLocale()` in `src/routes/+layout.svelte`.

## Core only (static reading site, no backend)

### 1. Requirements

- Node 20 or newer, pnpm 9 or newer, git.
- The package is installed from GitHub and built on install (`prepare` runs `svelte-package`), so the first `pnpm install` takes a few seconds longer.

### 2. Scaffold

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

### 3. Configuration

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

### 4. Content index

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

### 5. Layout

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

### 6. Home page

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

### 7. Document route

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

### 8. Raw files

Legacy pages (no `atlas-mode` meta) and attachments (`.pdf`, images, `.ahtml`) are served untouched under `/raw/`. Copy `content/` into `static/raw/` before building. `scripts/sync-raw.mjs`:

```js
import { cpSync, rmSync } from 'node:fs';
rmSync('static/raw', { recursive: true, force: true });
cpSync('content', 'static/raw', { recursive: true });
```

and in `package.json`:

```json
"build": "node scripts/sync-raw.mjs && vite build"
```

Add `static/raw` to `.gitignore`.

### 9. First page

Copy `node_modules/@lucasgiraldelli/atlas-core/docs/page-template.html` to `content/general/first-page.html`, fill the placeholders, and read `docs/PAGE-CONTRACT.md` in the same folder for the component vocabulary (boxes with tags, cards, numbered lists, steps, diagrams, exercises, checklist). Required `<head>` metas: `title`, `description`, `atlas-mode` (`referencia | leitura | apostila`), `atlas-source`, `atlas-date`. Pages carry no `<style>` or `<script>`.

```sh
pnpm build && pnpm preview
```

### 10. Serving

Any static server works on `build/`. A minimal nginx server block:

```nginx
server {
  listen 80;
  root /srv/site/build;
  absolute_redirect off;
  types { text/html ahtml; application/manifest+json webmanifest; }
  include /etc/nginx/mime.types;
  location /_app/ { expires 1y; add_header Cache-Control "public, immutable"; }
  location / { try_files $uri $uri/index.html $uri/ /200.html; }
}
```

Build output changes hashes on every build, so `_app/` can be cached forever; HTML must not be.


