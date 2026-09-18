import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { makeFs } from '../../scripts/fs-ops.mjs';

/** PocketBase em memória: só o que fs-ops usa (getFullList com filtro de igualdade, getFirstListItem, create, update, delete). */
function fakePb(seed) {
  const data = structuredClone(seed); let n = 0;
  const match = (r, filter) => { const m = filter?.match(/^(\w+) = "(.*)"$/); return !m || r[m[1]] === m[2]; };
  return {
    data,
    collection: (c) => ({
      getFullList: async ({ filter } = {}) => data[c].filter((r) => match(r, filter)),
      getFirstListItem: async (filter) => { const r = data[c].find((x) => match(x, filter)); if (!r) throw new Error('404'); return r; },
      create: async (r) => { const x = { id: 'id' + ++n, ...r }; data[c].push(x); return x; },
      update: async (id, patch) => Object.assign(data[c].find((x) => x.id === id), patch),
      delete: async (id) => { data[c].splice(data[c].findIndex((x) => x.id === id), 1); }
    })
  };
}
const html = (t) => `<!DOCTYPE html><html lang="pt-BR"><head><title>${t}</title><meta name="atlas-mode" content="leitura"></head><body><main><div class="doc-head"><h1>${t}</h1></div><p><a href="/raw/trackfive/di/x.pdf">pdf</a></p></main></body></html>`;

let ROOT, pb, fs;
beforeEach(() => {
  ROOT = mkdtempSync(join(tmpdir(), 'atlas-fs-'));
  const sh = (c) => execSync(c, { cwd: ROOT, stdio: 'pipe' });
  sh('git init -q'); sh('git config user.email t@t'); sh('git config user.name t');
  for (const [p, t] of Object.entries({ 'trackfive/di/como-o-laravel-injeta.html': html('Como o Laravel injeta'), 'trackfive/di/x.pdf': 'pdf', 'math/fracoes.html': html('Frações'), 'math/integrais.html': html('Integrais') })) {
    mkdirSync(join(ROOT, 'content', p.split('/').slice(0, -1).join('/')), { recursive: true }); writeFileSync(join(ROOT, 'content', p), t);
  }
  sh('git add -A && git commit -qm init');
  pb = fakePb({
    overrides: [{ id: 'o1', slug: 'trackfive/di/como-o-laravel-injeta', title: 'Como o Laravel faz DI', read: true }, { id: 'o2', slug: 'math/fracoes', sub: 'basic' }],
    notes: [{ id: 'n1', slug: 'math/fracoes', body: 'nota' }], progress: [{ id: 'p1', slug: 'math/fracoes', item: 1, done: true }],
    groups: [{ id: 'g1', path: 'trackfive/di', title: 'dependency injection' }, { id: 'g2', path: 'trackfive', title: '' }], aliases: []
  });
  fs = makeFs(ROOT, pb);
});

describe('rename-page', () => {
  it('renomeia o arquivo pelo kebab do título, reescreve <title> e h1, limpa o override e registra alias', async () => {
    const r = await fs.ops['rename-page']({ slug: 'trackfive/di/como-o-laravel-injeta', title: 'Como o Laravel faz DI' });
    expect(r.slug).toBe('trackfive/di/como-o-laravel-faz-di');
    const t = readFileSync(join(ROOT, 'content/trackfive/di/como-o-laravel-faz-di.html'), 'utf8');
    expect(t).toContain('<title>Como o Laravel faz DI</title>'); expect(t).toContain('<h1>Como o Laravel faz DI</h1>');
    expect(existsSync(join(ROOT, 'content/trackfive/di/como-o-laravel-injeta.html'))).toBe(false);
    const o = pb.data.overrides.find((x) => x.id === 'o1'); expect(o.slug).toBe('trackfive/di/como-o-laravel-faz-di'); expect(o.title).toBe(''); expect(o.read).toBe(true);
    expect(pb.data.aliases).toEqual([expect.objectContaining({ from: 'trackfive/di/como-o-laravel-injeta', to: 'trackfive/di/como-o-laravel-faz-di' })]);
    expect(execSync('git status --porcelain', { cwd: ROOT }).toString()).toMatch(/^R/m);
  });
  it('negativo: recusa quando o destino já existe', async () => {
    await expect(fs.ops['rename-page']({ slug: 'math/fracoes', title: 'Integrais' })).rejects.toThrow('já existe');
    expect(existsSync(join(ROOT, 'content/math/fracoes.html'))).toBe(true);
  });
  it('negativo: página inexistente', async () => {
    await expect(fs.ops['rename-page']({ slug: 'math/nada', title: 'X' })).rejects.toThrow('inexistente');
  });
  it('ida e volta não deixa alias de si mesmo', async () => {
    await fs.ops['rename-page']({ slug: 'math/fracoes', title: 'Frações e razões' });
    await fs.ops['rename-page']({ slug: 'math/fracoes-e-razoes', title: 'Frações' });
    expect(pb.data.aliases.every((a) => a.from !== a.to)).toBe(true);
    expect(pb.data.aliases.find((a) => a.from === 'math/fracoes-e-razoes').to).toBe('math/fracoes');
  });
});

describe('move-page', () => {
  it('move para cat/sub, cria a pasta, re-chaveia notas e progresso, limpa cat/sub do override', async () => {
    const r = await fs.ops['move-page']({ slug: 'math/fracoes', cat: 'math', sub: 'basic' });
    expect(r.slug).toBe('math/basic/fracoes'); expect(existsSync(join(ROOT, 'content/math/basic/fracoes.html'))).toBe(true);
    expect(pb.data.notes[0].slug).toBe('math/basic/fracoes'); expect(pb.data.progress[0].slug).toBe('math/basic/fracoes');
    expect(pb.data.overrides.find((x) => x.id === 'o2').sub).toBe('');
  });
  it('remove a pasta de origem quando fica vazia', async () => {
    await fs.ops['move-page']({ slug: 'trackfive/di/como-o-laravel-injeta', cat: 'laravel', sub: '' });
    expect(existsSync(join(ROOT, 'content/trackfive/di'))).toBe(true); // ainda tem o pdf
    await fs.ops['move-page']({ slug: 'math/fracoes', cat: 'algebra', sub: '' }); await fs.ops['move-page']({ slug: 'math/integrais', cat: 'algebra', sub: '' });
    expect(existsSync(join(ROOT, 'content/math'))).toBe(false);
  });
  it('negativo: destino ocupado', async () => {
    mkdirSync(join(ROOT, 'content/calc')); writeFileSync(join(ROOT, 'content/calc/integrais.html'), html('Outra'));
    await expect(fs.ops['move-page']({ slug: 'math/integrais', cat: 'calc', sub: '' })).rejects.toThrow('já existe');
  });
});

describe('rename-group', () => {
  it('renomeia a pasta, reescreve links /raw/, re-chaveia páginas e grupos filhos', async () => {
    const r = await fs.ops['rename-group']({ path: 'trackfive/di', title: 'dependency injection' });
    expect(r.path).toBe('trackfive/dependency-injection'); expect(r.moved).toBe(1);
    expect(existsSync(join(ROOT, 'content/trackfive/dependency-injection/x.pdf'))).toBe(true);
    expect(readFileSync(join(ROOT, 'content/trackfive/dependency-injection/como-o-laravel-injeta.html'), 'utf8')).toContain('/raw/trackfive/dependency-injection/x.pdf');
    expect(pb.data.groups.find((g) => g.id === 'g1').path).toBe('trackfive/dependency-injection');
    expect(pb.data.overrides.find((x) => x.id === 'o1').slug).toBe('trackfive/dependency-injection/como-o-laravel-injeta');
    expect(pb.data.aliases[0]).toMatchObject({ from: 'trackfive/di/como-o-laravel-injeta', to: 'trackfive/dependency-injection/como-o-laravel-injeta' });
  });
  it('grupo só no PocketBase: cria a pasta com .gitkeep e re-chaveia', async () => {
    pb.data.groups.push({ id: 'g3', path: 'math/ops', title: 'devops' });
    await fs.ops['rename-group']({ path: 'math/ops', title: 'devops' });
    expect(existsSync(join(ROOT, 'content/math/devops/.gitkeep'))).toBe(true);
    expect(pb.data.groups.find((g) => g.id === 'g3').path).toBe('math/devops');
  });
  it('negativo: pasta de destino já existe', async () => {
    mkdirSync(join(ROOT, 'content/trackfive/general')); writeFileSync(join(ROOT, 'content/trackfive/general/a.html'), html('A'));
    await expect(fs.ops['rename-group']({ path: 'trackfive/di', title: 'General' })).rejects.toThrow('já existe');
  });
});

describe('create-group / delete-group', () => {
  it('cria pasta vazia com .gitkeep e o .gitkeep some quando chega uma página', async () => {
    await fs.ops['create-group']({ path: 'math/basic' });
    expect(existsSync(join(ROOT, 'content/math/basic/.gitkeep'))).toBe(true);
    await fs.ops['move-page']({ slug: 'math/fracoes', cat: 'math', sub: 'basic' });
    expect(existsSync(join(ROOT, 'content/math/basic/.gitkeep'))).toBe(false);
  });
  it('apaga só pasta vazia', async () => {
    await fs.ops['create-group']({ path: 'x/y' }); await fs.ops['delete-group']({ path: 'x/y' });
    expect(existsSync(join(ROOT, 'content/x'))).toBe(false);
    await expect(fs.ops['delete-group']({ path: 'math' })).rejects.toThrow('não está vazia');
  });
});
