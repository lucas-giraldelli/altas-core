import { mount, unmount, type Component } from 'svelte';
/** Monta um componente Svelte dentro de cada elemento do conteúdo que casar com `selector`.
 *  `place` decide onde o host entra (padrão: depois do lede/h3 da seção). Devolve cleanup. */
export function mountIn<P extends Record<string, unknown>>(
  root: HTMLElement, selector: string, component: Component<P>, props: (el: HTMLElement) => P,
  place: (el: HTMLElement, host: HTMLElement) => void = defaultPlace
) {
  const mounted = [...root.querySelectorAll<HTMLElement>(selector)].map((el) => {
    const host = document.createElement('div'); host.className = 'widget-host';
    place(el, host);
    return mount(component, { target: host, props: props(el) });
  });
  return () => mounted.forEach((m) => unmount(m));
}
function defaultPlace(el: HTMLElement, host: HTMLElement) {
  const h = el.querySelector('h3, h2');
  const after = h?.nextElementSibling?.classList.contains('lede') ? h.nextElementSibling : h;
  (after ?? el).after(host);
}
