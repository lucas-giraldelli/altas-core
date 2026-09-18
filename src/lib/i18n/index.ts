/** UI strings. English by default; call `setLocale(ptBR)` (or a partial object) to translate. */
export interface Locale {
  toc: { label: string; show: string; hide: string; back: string };
  diagram: { zoomIn: string; zoomOut: string; reset: string; fullscreen: string; exitFullscreen: string; hideCaption: string; showCaption: string; toolbar: string };
  reveal: { solution: string; hideSolution: string; hint: string; hideHint: string };
  mode: { light: string; dark: string; toggle: string };
}
export const en: Locale = {
  toc: { label: 'Table of contents', show: 'Show contents', hide: 'Hide contents', back: 'Back to home' },
  diagram: { zoomIn: 'Zoom in', zoomOut: 'Zoom out', reset: 'Reset', fullscreen: 'Fullscreen', exitFullscreen: 'Exit fullscreen', hideCaption: 'Hide caption', showCaption: 'Show caption', toolbar: 'Diagram' },
  reveal: { solution: 'Show solution', hideSolution: 'Hide solution', hint: 'Hint', hideHint: 'Hide hint' },
  mode: { light: 'Light mode', dark: 'Dark mode', toggle: 'Toggle light/dark' }
};
export const ptBR: Locale = {
  toc: { label: 'Índice do material', show: 'Mostrar índice', hide: 'Recolher índice', back: 'Voltar ao início' },
  diagram: { zoomIn: 'Aproximar', zoomOut: 'Afastar', reset: 'Redefinir', fullscreen: 'Tela cheia', exitFullscreen: 'Sair da tela cheia', hideCaption: 'Ocultar legenda', showCaption: 'Mostrar legenda', toolbar: 'Diagrama' },
  reveal: { solution: 'Ver resolução', hideSolution: 'Ocultar resolução', hint: 'Dica', hideHint: 'Ocultar dica' },
  mode: { light: 'Modo claro', dark: 'Modo escuro', toggle: 'Alternar claro/escuro' }
};
let current: Locale = en;
export const t = () => current;
export function setLocale(l: Partial<Locale> & { [K in keyof Locale]?: Partial<Locale[K]> }) {
  current = { toc: { ...en.toc, ...l.toc }, diagram: { ...en.diagram, ...l.diagram }, reveal: { ...en.reveal, ...l.reveal }, mode: { ...en.mode, ...l.mode } };
}
