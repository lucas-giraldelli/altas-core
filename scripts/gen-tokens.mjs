// Gera src/lib/theme/tokens.css a partir de palettes.ts (fonte única de cores). Roda no prebuild.
import { writeFileSync } from 'node:fs';
const { PALETTES, DEFAULTS } = await import('../src/lib/theme/palettes.ts');
const block = (sel, t, scheme) => `${sel}{
  --bg:${t.bg}; --bg-2:${t.bg2}; --surface:${t.surface};
  --ink:${t.ink}; --ink-strong:${t.inkStrong}; --ink-2:${t.ink2}; --ink-3:${t.ink3};
  --rule:${t.rule}; --rule-2:${t.rule2};
  --blue:${t.blue}; --amber:${t.amber}; --green:${t.green}; --red:${t.red};
  --violet:${t.violet}; --teal:${t.teal}; --pink:${t.pink}; --orange:${t.orange}; --sky:${t.sky};
  --code-bg:${t.codeBg}; --code-fg:${t.codeFg}; color-scheme:${scheme};
}`;
let css = `/* GERADO por scripts/gen-tokens.mjs a partir de theme/palettes.ts. Não editar à mão. */
:root{
  --serif:"Literata Variable",Literata,Georgia,"Iowan Old Style","Times New Roman",serif;
  --mono:"JetBrains Mono Variable","JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  --fs-base:20px; --fs-scale:1; --fs:calc(var(--fs-base) * var(--fs-scale)); --lh:1.7; --measure:80ch; --wide:110ch;
}
@media (min-width:1200px){ :root{ --fs-base:23px; --lh:1.65; } }
@media (max-width:900px){ :root{ --fs-base:17px; } }
`;
for (const p of PALETTES) {
  const dSel = p.id === DEFAULTS.dark ? `:root, :root[data-palette="${p.id}"]` : `:root[data-palette="${p.id}"]`;
  const lSel = p.id === DEFAULTS.light ? `:root[data-theme="light"], :root[data-palette="${p.id}"][data-theme="light"]` : `:root[data-palette="${p.id}"][data-theme="light"]`;
  css += `\n/* ${p.name} */\n${block(dSel, p.dark, 'dark')}\n${block(lSel, p.light, 'light')}\n`;
}
css += `\n:root{ --blue-dim:color-mix(in srgb,var(--blue) 16%,transparent); --amber-dim:color-mix(in srgb,var(--amber) 16%,transparent); }\n`;
writeFileSync(new URL('../src/lib/theme/tokens.css', import.meta.url), css);
console.log(`tokens: ${PALETTES.length} paletas`);
