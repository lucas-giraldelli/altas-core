# Adicionar uma página

Uma página é um arquivo HTML puro em `content/<categoria>/[<subcategoria>/]<slug>.html`. O slug é o título em kebab-case sem acentos e vira a URL. Categoria e subcategoria são só pastas; criar uma pasta nova cria a categoria. O site lê o `<head>` e o `<main>` e faz o resto (tema, índice lateral, Mermaid, KaTeX, notas).

## Contrato mínimo

```html
<!DOCTYPE html>
<html lang="pt-BR">                     <!-- "en" para inglês; título recebe " (EN)" -->
<head>
<meta charset="utf-8">
<title>Título curto</title>
<meta name="description" content="Uma frase.">
<meta name="atlas-mode" content="leitura">        <!-- referencia | leitura | apostila -->
<meta name="atlas-source" content="https://…">    <!-- URL ou texto curto; pode ser vazio -->
<meta name="atlas-date" content="2026-09-17">
</head>
<body>
<main>
  <div class="doc-head"><h1>Título</h1><p class="deck">Uma frase.</p></div>
  <div class="module-head"><h2>Nome do módulo</h2><p>Escopo em uma frase.</p></div>
  <section class="topic" id="um">
    <h3><span class="n">1</span>Primeiro tópico</h3>
    <p class="lede">Uma linha dizendo o que vem.</p>
    <p>Texto.</p>
  </section>
</main>
</body>
</html>
```

Regras: sem `<style>`, `<script>`, `<nav>` ou links de CSS dentro da página; sem travessões; sem `atlas-mode` a página é tratada como legado e servida crua.

## Componentes disponíveis (todos opcionais)

| bloco | uso |
|---|---|
| `div.box > span.tag + p` | Definição, Regra, Como funciona, Fato, Tese… |
| `div.box.note`, `div.box.warn`, `div.box.analogy` | Observação, Atenção, Para fixar |
| `figure.diagram > pre.mermaid + figcaption` | diagrama (labels em inglês, entre aspas) |
| `div.steps > span.lbl + p` | caminhos alternativos |
| `div.table-wrap > table` com `td.bad` | erros comuns |
| `div.ex-block > div.ex` | exercício com `button.btn.reveal` e `div.panel[hidden]` |
| `ul.checklist > li[data-ref="#secao"]` | "capaz de…"; `data-ref` liga o item à seção que o responde (checkbox + explicação salvas) |
| `div.cards > div.card[.<cor>] > h4 + span.tag + p` | cards lado a lado (atores, entidades, opções); `div.row > b + span` para campos |
| `ol.numbered > li > span.n + span` | lista numerada com marcador em destaque |
| `span.pill.<cor>`, `<mark>` | rótulo inline (seed, dormant, novo), realce de trecho |
| `ul.kv > li > span.sym + span` | glossário de símbolos/termos com badge mono |
| `ol.numbered > li.<cor> > span.n + div > span.name + p` | passos/fatos numerados com marcador colorido |
| `div.cards > div.card[.amber|.green|.red] > h4 + span.tag + p` | cards lado a lado (atores, entidades, opções) |
| `ol.numbered > li > span.n + span` | lista numerada com marcador em destaque |
| `pre[data-lang=php] > code` (texto escapado, sem spans), `blockquote` | código com realce automático, citação |
| `div.eq` com `$$…$$`; `\hlb{}` `\hla{}` `\hlg{}` `\hlr{}` `\hlv{}` `\hlt{}` | fórmula KaTeX; realce por papel dentro da fórmula (blue, amber, green, red, violet, teal) |
| `div.cases > div.case.<cor> > h5 + p + div.eq` | casos enumerados de matemática, um bloco colorido por caso |

Cores por papel (`<cor>` em card e pill): `blue` `amber` `green` `red` `violet` `teal` `pink` `orange` `sky`, mais `muted` em pill. Mesmo papel, mesma cor na página toda.

O modelo completo com todos os blocos está em `docs/page-template.html`. A skill `/learn` gera páginas neste contrato automaticamente.

## Anexos

`.ahtml`, `.pdf`, imagens ou qualquer coisa numa pasta `assets/` não entram no índice e ficam em `/raw/<caminho>`.

## Publicar

```sh
pnpm build && git add -A && git commit -m "feat(content): <cat>/<slug>" && git push
```
