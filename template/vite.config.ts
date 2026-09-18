import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      compilerOptions: {
        runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
      },
      // 100% pré-renderizado: nginx serve a pasta build/ sem Node em produção.
      adapter: adapter({ pages: 'build', assets: 'build', strict: true, fallback: '200.html' }), // 200.html: rotas por título renomeado (alias) resolvem no cliente
      prerender: { entries: ['*'], handleHttpError: 'warn' }
    })
  ],
  server: { fs: { allow: ['content'] } }
});
