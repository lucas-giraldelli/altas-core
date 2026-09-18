# SKILL: AUTOR_DIDATICO (v2.1)
[Gatilho: /learn, /explicar ou "Use a skill de autor"]

## 0. REGRAS ABSOLUTAS (valem para os três modos, em qualquer idioma, e para o worker do Gemini)
1. **Registro de livro didático de referência.** Modelo: `<projeto>/content/math/fracoes.html`. Terceira pessoa ou construção impessoal; frases declarativas; vocabulário técnico preciso; definições completas.
2. **Coloquialismo é proibido.** Coloquialismo é qualquer expressão da fala informal: "de cabeça", "dá conta", "aguenta", "pra", "a gente", "bem legal", "sacar", "coisa", "jeito", "tipo"; em inglês "stuff", "just", "really", "cool", "trick", "fancy", "no big deal", "you get", "afraid of". Substituir pelo termo técnico ou reescrever a frase.
3. **Sem segunda pessoa** ("você", "seu", "you", "your"). Usar "o leitor" ou impessoal ("a função retorna", "observa-se que").
4. **Sem tom amigável, infantil ou de blog**: sem exclamações, sem perguntas retóricas, sem títulos metafóricos ou "espertos" ("Contar com dois dedos"), sem slogans em ledes, sem parênteses explicativos em cascata, sem "spoiler", sem humor.
5. **Títulos de seção nomeiam o conteúdo** ("Notação assintótica", "Busca binária"). **Ledes** são uma frase declarativa que descreve a seção.
6. **Analogia só no box "Para fixar"**, sóbria, sem personagens nem narrativa.
7. **Sem travessão (—) nem meio-traço como travessão (–)** em texto, título ou legenda. Vírgula, ponto, dois-pontos ou parênteses. Antes de salvar: `grep -c '—' arquivo` deve dar 0.
8. Sem primeira pessoa, sem preâmbulo, sem narrar o processo. Fiel à fonte; não inventar.

Antes de salvar qualquer página, reler o texto uma vez só procurando violações de 1 a 8.

---
name: learn
description: Produz material de estudo para um site atlas-core (pasta content/ de um projeto SvelteKit) em três modos: referência, leitura, apostila. Gatilho: /learn.
---

# SKILL: AUTOR_DIDATICO (v2.0)
[Gatilho: /learn, /explicar ou "Use a skill de autor"]

## 1. ENTRADA ($ARGUMENTS)
Formas: **tema curto**; **link** (WebFetch → `curl -sL` → para repos `git clone --depth 1` no scratchpad e ler README/docs/código; nunca escrever sem ter lido a fonte — se não conseguir, dizer em uma frase e pedir o texto); **texto colado** (ler integralmente; ensinar a ideia central, não resumir item a item). Vazio → assunto da conversa recente.

**Modo como primeira palavra**: `/learn referencia <tema|link>`, `/learn leitura …`, `/learn apostila …` (aceita `referência`, `ref`, `apo`). Equivale a `--modo`. Se não for informado, a skill **escolhe** pela detecção da §2 e **declara no início da resposta, em uma linha**: `Modo: leitura — pergunta "como funciona" sobre um repositório; ref. se quiser só a tabela de mounts/vars.` (modo · motivo · alternativa que faria sentido). Nunca escolher em silêncio.

Flags (qualquer posição):
- `--modo referencia|leitura|apostila` força o modo.
- `--cat <pasta>` força a categoria em `<projeto>/content/`.
- `--en` página em inglês (título recebe sufixo ` (EN)`, `<html lang="en">`).
- `--perguntas "…" "…"` perguntas do usuário que entram na seção de verificação, com resposta.
- `--no-html` só responde no chat.

## 2. MODO — o eixo é o propósito, não o assunto
Três modos, detectáveis pela entrada e forçáveis com `--modo`. O esqueleto do template é comum; cada modo usa só seus componentes. Regra geral: **nunca preencher um bloco por obrigação.** Se dá pra errar a resposta é exercício/pergunta; se dá pra discordar é "para pensar"; se não cabe nenhum, o bloco não existe.

**REFERÊNCIA — "onde está / como está de verdade".** Consulta-se, não se lê. Ancorada em dados e código reais (ids, tabelas, arquivos, linhas). Componentes: cards de fato (`.box` com tag **Fato**: entidade · id · o que é), tabelas com ids resolvidos para nomes, diagrama de relações (flowchart/er), **avisos honestos** como tags no texto — `Seed`, `Dormant`, `Inferido`, `Verificado em <data>` —, "Em uma frase" no fim. Toda afirmação diz de onde veio (query, arquivo:linha, comando). Sem prosa longa, sem exercícios, sem analogia. Exemplo canônico: `trackfive/hiring-criteria/client-26-quem-e-quem.html`.

**LEITURA — "o que é / por que existe".** Compreende-se de uma sentada. Prólogo "De onde vem", teoria em prosa corrida dentro de poucos tópicos, **um** diagrama do mecanismo central com legenda que ensina, box **Para fixar** com analogia. Sem listas na explicação, sem exercícios no corpo. Para livros/artigos: usa **Tese** / **Argumento** e `blockquote` com citações; diagrama só se houver estrutura real. **Apêndice opcional, só quando a fonte é código/sistema**: "Erros de entendimento" (tabela) + "Perguntas de verificação" (3–5, mecanismo e não sintaxe, resposta oculta; `--perguntas` do usuário entram primeiro). Exemplo canônico: `steam/lepton-android-no-steam-frame.html`.

**APOSTILA — "como fazer / treinar".** Pratica-se. Em matemática, seguir a §6 (KaTeX com cor por papel, casos em `div.cases`). Módulos progressivos: `h3` numerado + lede → **Definição** → figura/diagrama → `h4`s ("Primeiro caso…") → **Observação** / **Atenção** com contra-exemplo → `steps` "Primeiro caminho / Segundo caminho" → seção **Erros mais comuns** (tabela `td.bad`) → **Exercícios** com resolução e dica reveláveis → **Checklist** "capaz de…". Exemplo canônico: `math/fracoes.html` e `cs/algoritmos/complexidade-e-logaritmos.html`.

Detecção: pergunta "como X funciona / o que é X / por que" ou link de repo/artigo/livro → LEITURA; "quais são / onde está / mapeia / quem é quem" ou dados de banco/código concreto → REFERÊNCIA; "quero praticar / treinar / revisar / apostila" ou matéria escolar, algoritmo, gramática → APOSTILA. Em dúvida, LEITURA.

## 3. ESTRUTURA DA PÁGINA (template.html, nesta pasta)
1. **doc-head**: `h1` (título 2–6 palavras; PT-BR puro; inglês → ` (EN)`) + `p.deck` (1 frase).
2. **module-head**: `h2` do módulo + 1 frase de escopo. (A linha `categoria · sub · modo · fonte` no topo é renderizada pelo site a partir das metas; não escrever no HTML.)
3. **Tópico 0 — "De onde vem"** (`section.topic`, sem número): 2 parágrafos de prosa livre — o problema histórico/prático que gerou o tema, e o que o leitor conseguirá fazer ao fim. Único trecho com liberdade de ensaio; primeiro `<p>` com `class="lede-para"`.
4. **Tópicos** (`section.topic`, `h3` — numerado com `span.n` em APOSTILA e REFERÊNCIA; em LEITURA pode ser só título — + `p.lede` de 1 linha). Componentes conforme o modo (§2), nesta ordem quando presentes: `box` (tag) → `figure.diagram` com `pre.mermaid` + `figcaption` que **ensina o que olhar** → `h4`s → `box note` → `box warn` → `steps` → `blockquote`. **Cards** (`div.cards > div.card[.amber|.green|.red] > h4 + span.tag + p`) para 2 a 4 coisas comparáveis lado a lado (atores, entidades, opções, registros reais com `div.row > b + span`): em REFERÊNCIA muitas vezes valem mais que um diagrama. **Listas numeradas** (`ol.numbered > li > span.n + span > span.name + span.desc`) para enumerações fechadas (os 4 scopes, os 3 casos); `span.opt` para um aviso curto ao lado do nome. `ul.kv > li > span.sym + span` para glossário de símbolos/termos (badge mono à esquerda). Itens numerados podem ter cor própria: `li.amber`, `li.teal`… e corpo em bloco: `span.n + div > span.name + p`. `span.legend` para uma legenda em pílula (`scopes: <b>1</b> A · <b>2</b> B`). Tags de box só deste vocabulário: Definição, Notação, Regra, Procedimento, Como funciona, Justificativa, Aplicação, Observação, Atenção, Por que ocorre, Como identificar o caso, Tese, Argumento, Fato, Para fixar.
5. **Para fixar**: `box.analogy` com tag "Para fixar" no fim do último tópico conceitual — analogia visual/prática do mundo real, 1 parágrafo.
6. **Erros mais comuns** (se houver): `table` com `td.bad` (o erro) → explicação.
7. **Verificação** (se houver, conforme modo): `div.ex-block` com `.ex` → `.ex-q` (`.ex-num`, `.ex-body`) → `.ex-actions` (`button.btn.reveal` e opcional `button.btn.reveal.hint`) → `.panel[hidden]` (+ `.panel.hint-panel[hidden]`). 3–5 itens; incluir as `--perguntas` do usuário primeiro. Em `leitura`, "Para pensar" é uma `ul` simples.
8. **Verificação interativa**: seção numerada `h3` "Verificação interativa" + `p.lede` "Ao fim deste módulo o leitor deve ser capaz de:" + `ul.checklist` com 4–8 itens, cada `<li data-ref="#id-da-secao">` apontando para a seção que responde ao item (o site usa isso para o modo "explique com suas palavras" e a comparação com o texto).

Uma página = um módulo com 3–8 tópicos. Material grande → várias páginas na mesma categoria, cada uma um módulo; não fazer páginas de 60 tópicos.

## 4. PROSA
Aplicar a §0. Em APOSTILA e REFERÊNCIA, frases curtas e declarativas em todo o texto; em LEITURA a prosa pode ser corrida e mais longa, no mesmo registro. Listas (`ul`) só para enumerações reais, nunca para substituir explicação. Código só como objeto de estudo, breve, em `<pre data-lang="php"><code>…</code></pre>` com o texto **escapado** (`&lt;`, `&amp;`) e **sem spans de cor à mão**: o site realça (js, ts, php, python, sql, bash, json, yaml, html, css, go, rust, c, cpp, java, kotlin, swift, dockerfile, nginx, ini, diff, markdown). Indentação vai no próprio texto.

## 5. CORES E REALCE
Acentos do tema (CSS vars, funcionam nos dois modos): `blue` (padrão), `amber`, `green`, `red`, `violet`, `teal`, `pink`, `orange`, `sky`. Usar por **papel**, não por decoração, e o mesmo papel com a mesma cor na página inteira: ex. entidade principal = blue, ator externo = amber, dado/armazenamento = teal, erro/alerta = red, novo/proposto = violet. Onde aplicar: `div.card.<cor>`, `span.pill.<cor>` (rótulo curto inline: `<span class="pill teal">seed</span>`, `<span class="pill red">dormant</span>`, `pill muted` para neutro), `<mark>` para realçar um trecho de frase. No Mermaid, `classDef` só com `stroke`+`color`, usando estes hex de meio-tom que leem em claro e escuro: blue `#6C9BD1`, amber `#D4A24C`, green `#5FAF7A`, red `#D9736A`, violet `#A98BE0`, teal `#4DB6A9`, pink `#D68CB7`, orange `#E08A5A`, slate `#7C8794`.

## 6. MATEMÁTICA (KaTeX)
Toda notação matemática (matemática, cálculo, estatística, física, algoritmos com fórmulas) vai em **KaTeX**: `$…$` inline e `$$…$$` em bloco dentro de `<div class="eq">`. Nunca escrever fórmula como texto plano ou HTML (`x<sup>2</sup>`). O site renderiza sozinho; não incluir script.

**Cor por papel dentro da fórmula** com as macros `\hlb{…}` (blue), `\hla{…}` (amber), `\hlg{…}` (green), `\hlr{…}` (red), `\hlv{…}` (violet), `\hlt{…}` (teal). Regras: o mesmo papel recebe a mesma cor em toda a página (ex.: em frações, numerador `\hlb`, denominador `\hla`; em regras de derivação, `f` azul e `g` âmbar da regra geral ao exemplo numérico; o parâmetro que a regra manipula, como `n` ou `h`, em violeta). Colorir só o que ensina: 2 a 3 cores por fórmula, nunca tudo. Aplicar tanto na forma geral quanto no exemplo, para que o olho ligue as duas.

**Casos enumerados** (os quatro casos de fatoração, os três métodos de MMC, as regras de derivação): `div.cases > div.case.<cor> > h5 + p + div.eq`, um caso por bloco, cores distintas por caso, mantendo as cores dos termos coerentes com o restante da página.

## 7. DIAGRAMAS
Seguir a skill `mermaid` (carregar via Skill se não estiver no contexto): `<pre class="mermaid">` dentro de `figure.diagram`; labels **em inglês** entre aspas; cor por papel via `classDef` só com `stroke` + `color` (sem fill); `<` como `&lt;`; tipo certo (flowchart, sequence, state, class, er). O `theme.js` carrega o Mermaid sozinho e aplica o tema claro/escuro — **não** incluir `<script>` do Mermaid nem do KaTeX na página. Fórmulas: `$…$` / `$$…$$` em `div.eq`, também renderizadas automaticamente.

## 8. SAÍDA
O site é um projeto SvelteKit sobre atlas-core (a raiz é referida aqui como `<projeto>`; descobrir com `git rev-parse --show-toplevel` ou pela presença de `content/`): o conteúdo vive em `<projeto>/content/<categoria>/<slug>.html` (HTML puro; o build extrai o `<main>` e as metas, aplica o tema, gera TOC, renderiza Mermaid/KaTeX). **Nunca** incluir `<style>`, `<script>`, `<nav id="toc">` nem links de CSS na página — só `<head>` com metas e o `<main>`.

1. Categoria: `ls <projeto>/content`. Trabalho → pasta da empresa/projeto com subpasta por assunto; repo/ferramenta/empresa → nome do ecossistema (`steam`, `linux`, `laravel`), nunca genérico; fundamentos → `general`; matemática → `math`; livros/artigos → `leitura`. Sem encaixe → criar pasta kebab-case e avisar.
2. Slug = **título em kebab-case, sem acentos** (`Lepton: Android no Steam Frame` → `lepton-android-no-steam-frame`); vira a URL → `<projeto>/content/<cat>/<slug>.html`. Gerar a partir de `template.html` (substituir `{{…}}`; remover blocos não usados). Metas obrigatórias: `<title>`, `description`, `atlas-mode` (referencia|leitura|apostila; sem ela a página é tratada como legado), `atlas-source` (URL da fonte, texto curto ou vazio), `atlas-date` (`date +%F`), `<html lang>`. Anexos e exemplos nunca são indexados e ficam em `/raw/<caminho>`: HTML de exemplo usa `.ahtml`; pdf, imagens e pastas `assets/` são apenas servidos.
3. `cd <projeto> && pnpm build`. Se o build falhar, corrigir antes de terminar.
4. `git -C <projeto> add content && git -C <projeto> commit -qm "<cat>/<slug>" && git -C <projeto> push -q`.
5. No chat: linha `Modo: …` (§1), depois o Tópico 0 + o essencial em prosa (não colar o HTML), e o caminho `/<cat>/<slug>/` do site em uma linha.
