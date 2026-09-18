/** Fonte única das paletas. `scripts/gen-tokens.mjs` gera theme/tokens.css a partir daqui. */
export interface Tokens { bg: string; bg2: string; surface: string; ink: string; inkStrong: string; ink2: string; ink3: string; rule: string; rule2: string; blue: string; amber: string; green: string; red: string; codeBg: string; codeFg: string;
  /* acentos extras para cards, tags e realce */ violet: string; teal: string; pink: string; orange: string; sky: string }
export interface Palette { id: string; name: string; dark: Tokens; light: Tokens }

type Base = Omit<Tokens, 'violet' | 'teal' | 'pink' | 'orange' | 'sky'>;
const T = (bg: string, bg2: string, surface: string, ink: string, inkStrong: string, ink2: string, ink3: string, rule: string, rule2: string, blue: string, amber: string, green: string, red: string, codeBg: string, codeFg: string): Base =>
  ({ bg, bg2, surface, ink, inkStrong, ink2, ink3, rule, rule2, blue, amber, green, red, codeBg, codeFg });

export const PALETTES: Palette[] = [
  { id: 'apostila', name: 'Apostila',
    dark: { ...T('#0E1318', '#141B22', '#18212A', '#DEE6EC', '#F2F6F9', '#95A6B4', '#63757F', '#25313B', '#2F3E4A', '#6BAEDB', '#DFAE62', '#6FC79B', '#E0796B', '#0A0F13', '#CBD8E0'), violet: '#B39DDB', teal: '#7FCFC4', pink: '#E3A1C8', orange: '#E9A170', sky: '#8FCBE8' },
    light: { ...T('#EDE6D6', '#E5DDCB', '#F5F0E4', '#1C1A17', '#000000', '#4F4A42', '#7A736A', '#D5CBB6', '#BFB39B', '#2E6E9E', '#8F6214', '#2F7D55', '#B4483A', '#1E1B17', '#E8E1D2'), violet: '#6A4AA8', teal: '#1F7A70', pink: '#A94D80', orange: '#B2601F', sky: '#2F6F94' } },
  { id: 'solarized', name: 'Solarized',
    dark: { ...T('#002B36', '#073642', '#0A3F4C', '#A7B5B5', '#EEE8D5', '#93A1A1', '#657B83', '#0F4A57', '#2A6A78', '#268BD2', '#B58900', '#859900', '#DC322F', '#00212B', '#B8C4C4'), violet: '#6C71C4', teal: '#2AA198', pink: '#D33682', orange: '#CB4B16', sky: '#2AA198' },
    light: { ...T('#FDF6E3', '#EEE8D5', '#F7F0DD', '#586E75', '#073642', '#657B83', '#93A1A1', '#E3DCC6', '#D3CBB0', '#268BD2', '#B58900', '#859900', '#DC322F', '#073642', '#EEE8D5'), violet: '#6C71C4', teal: '#2AA198', pink: '#D33682', orange: '#CB4B16', sky: '#268BD2' } },
  { id: 'gruvbox', name: 'Gruvbox',
    dark: { ...T('#282828', '#32302F', '#3C3836', '#EBDBB2', '#FBF1C7', '#BDAE93', '#928374', '#504945', '#665C54', '#83A598', '#FABD2F', '#B8BB26', '#FB4934', '#1D2021', '#EBDBB2'), violet: '#D3869B', teal: '#8EC07C', pink: '#D3869B', orange: '#FE8019', sky: '#83A598' },
    light: { ...T('#FBF1C7', '#F2E5BC', '#F9F5D7', '#3C3836', '#282828', '#665C54', '#928374', '#D5C4A1', '#BDAE93', '#076678', '#B57614', '#79740E', '#9D0006', '#3C3836', '#FBF1C7'), violet: '#8F3F71', teal: '#427B58', pink: '#8F3F71', orange: '#AF3A03', sky: '#076678' } },
  { id: 'nord', name: 'Nord',
    dark: { ...T('#2E3440', '#3B4252', '#434C5E', '#E5E9F0', '#ECEFF4', '#C2C9D6', '#8791A3', '#434C5E', '#4C566A', '#88C0D0', '#EBCB8B', '#A3BE8C', '#BF616A', '#242933', '#D8DEE9'), violet: '#B48EAD', teal: '#8FBCBB', pink: '#B48EAD', orange: '#D08770', sky: '#81A1C1' },
    light: { ...T('#ECEFF4', '#E5E9F0', '#F7F9FB', '#2E3440', '#1F242E', '#4C566A', '#6E788A', '#D8DEE9', '#C4CCDA', '#5E81AC', '#9A7327', '#5E7F47', '#BF616A', '#2E3440', '#ECEFF4'), violet: '#8A5F82', teal: '#4E8A88', pink: '#8A5F82', orange: '#B0603E', sky: '#5E81AC' } },
  { id: 'catppuccin', name: 'Catppuccin',
    dark: { ...T('#1E1E2E', '#181825', '#313244', '#CDD6F4', '#FFFFFF', '#A6ADC8', '#7F849C', '#313244', '#45475A', '#89B4FA', '#F9E2AF', '#A6E3A1', '#F38BA8', '#11111B', '#CDD6F4'), violet: '#CBA6F7', teal: '#94E2D5', pink: '#F5C2E7', orange: '#FAB387', sky: '#89DCEB' },
    light: { ...T('#EFF1F5', '#E6E9EF', '#F8F9FC', '#4C4F69', '#1E1E2E', '#5C5F77', '#8C8FA1', '#DCE0E8', '#BCC0CC', '#1E66F5', '#DF8E1D', '#40A02B', '#D20F39', '#4C4F69', '#EFF1F5'), violet: '#8839EF', teal: '#179299', pink: '#EA76CB', orange: '#FE640B', sky: '#04A5E5' } }
];

/** Paleta fixa: escuro = catppuccin (mocha), claro = apostila (papel machê). Sem seletor na UI. */
export const DEFAULTS = { dark: 'catppuccin', light: 'apostila' } as const;
export const byId = (id: string) => PALETTES.find((p) => p.id === id);
