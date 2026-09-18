import { describe, it, expect } from 'vitest';
import { kebab } from '../../src/lib/content/slug';
import { kebab as kebabWorker } from '../../scripts/fs-ops.mjs';

describe('kebab (nome de arquivo a partir do título)', () => {
  it('remove acentos, pontuação e caixa', () => {
    expect(kebab('Lepton: Android no Steam Frame')).toBe('lepton-android-no-steam-frame');
    expect(kebab('Frações')).toBe('fracoes');
    expect(kebab('V1 APIS - Nextjs web')).toBe('v1-apis-nextjs-web');
  });
  it('descarta o sufixo (EN) e hifens nas pontas', () => {
    expect(kebab('Resume Parser Idea (EN)')).toBe('resume-parser-idea');
    expect(kebab('  --x-- ')).toBe('x');
  });
  it('é a mesma regra no site e no worker', () => {
    for (const t of ['Como o Laravel faz DI', 'Dependency Injection, simply', 'Ação & reação (EN)']) expect(kebab(t)).toBe(kebabWorker(t));
  });
  it('negativo: título vazio ou só símbolos vira string vazia (a interface deve recusar)', () => {
    expect(kebab('')).toBe(''); expect(kebab('???')).toBe('');
  });
});
