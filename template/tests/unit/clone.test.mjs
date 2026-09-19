import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { makeFs } from '../../scripts/fs-ops.mjs';

const fakePb = () => { const data = { overrides: [] }; return { data, collection: (c) => ({ getFullList: async () => data[c], getFirstListItem: async () => { throw new Error('404'); }, create: async (r) => { data[c].push(r); return r; }, update: async () => {}, delete: async () => {} }) }; };

describe('clone-page', () => {
  it('copia para a pasta escolhida com sufixo se o nome já existe e registra o dono', async () => {
    const ROOT = mkdtempSync(join(tmpdir(), 'atlas-clone-')); execSync('git init -q && git config user.email t@t && git config user.name t', { cwd: ROOT });
    mkdirSync(join(ROOT, 'content/eng/sub'), { recursive: true }); writeFileSync(join(ROOT, 'content/eng/sub/doc.html'), '<html><head><title>Doc</title></head><body><main></main></body></html>');
    const pb = fakePb(); const fs = makeFs(ROOT, pb);
    const a = await fs.ops['clone-page']({ slug: 'eng/sub/doc', cat: 'meus', sub: '', owner: 'u1' });
    expect(a.slug).toBe('meus/doc'); expect(existsSync(join(ROOT, 'content/meus/doc.html'))).toBe(true);
    const b = await fs.ops['clone-page']({ slug: 'eng/sub/doc', cat: 'eng', sub: 'sub', owner: 'u1' });
    expect(b.slug).toBe('eng/sub/doc-2');
    expect(pb.data.overrides).toEqual([{ slug: 'meus/doc', owner: 'u1' }, { slug: 'eng/sub/doc-2', owner: 'u1' }]);
    expect(existsSync(join(ROOT, 'content/eng/sub/doc.html'))).toBe(true); // original intacto
  });
});
