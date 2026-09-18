/** Enhancers: funções puras aplicadas ao HTML injetado da página. Contrato: (root, page) => cleanup. */
import type { Page } from '../content/types.js';
import { mermaid } from './mermaid.js';
import { katex } from './katex.js';
import { reveal } from './reveal.js';
import { highlight } from './highlight.js';
export type Enhancer = (root: HTMLElement, page: Page) => void | (() => void) | Promise<void | (() => void)>;
const ALL: Enhancer[] = [reveal, highlight, katex, mermaid];
export async function enhance(root: HTMLElement, page: Page) {
  const cleanups = await Promise.all(ALL.map((e) => e(root, page)));
  return () => cleanups.forEach((c) => c && c());
}
