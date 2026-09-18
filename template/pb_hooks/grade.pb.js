/// <reference path="../pb_data/types.d.ts" />
// POST /api/atlas/grade  { slug, item, question, reference, answer }
// Avalia a explicação do usuário contra o trecho de referência do documento usando o LLM configurado.
// Exige usuário autenticado. A chave fica só aqui (env GEMINI_API_KEY), nunca no navegador.
routerAdd("POST", "/api/atlas/grade", (e) => {
  // LLM_KEY / LLM_MODEL / LLM_PROVIDER / LLM_BASE_URL (compat: GEMINI_API_KEY, GEMINI_MODEL)
  const key = $os.getenv("LLM_KEY") || $os.getenv("GEMINI_API_KEY");
  let model = $os.getenv("LLM_MODEL") || $os.getenv("GEMINI_MODEL");
  const base = $os.getenv("LLM_BASE_URL");
  let provider = ($os.getenv("LLM_PROVIDER") || "").toLowerCase();
  if (!provider) provider = /^claude/.test(model) || /^sk-ant-/.test(key) ? "anthropic" : /^gemini/.test(model) || /^(AIza|AQ\.)/.test(key) ? "gemini" : (base && !key) ? "ollama" : "openai";
  if (!model) model = { gemini: "gemini-3.5-flash-lite", anthropic: "claude-haiku-4-5-20251001", openai: "gpt-5-mini", ollama: "llama3.1" }[provider];
  if (!key && provider !== "ollama") throw new ApiError(503, "LLM_KEY não configurada", {});

  const body = e.requestInfo().body;
  const question = String(body.question || "").slice(0, 500);
  const reference = String(body.reference || "").slice(0, 6000);
  const answer = String(body.answer || "").slice(0, 3000);
  const lang = String(body.lang || "pt-BR");
  const en = lang.indexOf("en") === 0;
  if (!question || !answer) throw new BadRequestError("question e answer são obrigatórios");

  const prompt = (en ? `Answer in English. ` : ``) + `Você é um tutor paciente e direto. O estudante leu um material e tenta explicar, com as próprias palavras e sem consultar, o item abaixo. Compare a explicação dele com o trecho de referência (que é a fonte de verdade) e responda ${en ? "em inglês" : "em português do Brasil"}, em JSON estrito com as chaves:
- "verdict": "solido" | "parcial" | "revisar"
- "right": o que ele acertou (1 frase)
- "missing": o que faltou ou ficou vago (1 frase; "" se nada)
- "wrong": erro conceitual, se houver (1 frase; "" se nenhum)
- "tip": uma dica curta para fixar (1 frase)
Não use travessões. Não elogie de forma vazia. Se a explicação estiver correta mas incompleta, o veredito é "parcial".

ITEM: ${question}

REFERÊNCIA:
${reference}

EXPLICAÇÃO DO ESTUDANTE:
${answer}`;

  let req;
  if (provider === "gemini") req = {
    url: `${base || "https://generativelanguage.googleapis.com"}/v1beta/models/${model}:generateContent?key=${key}`,
    headers: { "Content-Type": "application/json" },
    body: { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 400 } },
    pick: (j) => j.candidates[0].content.parts[0].text
  };
  else if (provider === "anthropic") req = {
    url: `${base || "https://api.anthropic.com"}/v1/messages`,
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: { model: model, max_tokens: 400, temperature: 0.2, messages: [{ role: "user", content: prompt + "\n\nResponda somente com JSON válido, sem cercas de código." }] },
    pick: (j) => j.content.filter((c) => c.type === "text").map((c) => c.text).join("")
  };
  else req = {
    url: `${base || (provider === "ollama" ? "http://localhost:11434/v1" : "https://api.openai.com/v1")}/chat/completions`,
    headers: Object.assign({ "Content-Type": "application/json" }, key ? { "Authorization": "Bearer " + key } : {}),
    body: { model: model, temperature: 0.2, max_tokens: 400, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt + "\n\nResponda somente com JSON válido." }] },
    pick: (j) => j.choices[0].message.content
  };
  const res = $http.send({ url: req.url, method: "POST", headers: req.headers, body: JSON.stringify(req.body), timeout: 30 });
  if (res.statusCode >= 300) throw new ApiError(502, provider + ": " + res.statusCode, { detail: res.raw.slice(0, 300) });

  let text = "";
  try { text = req.pick(res.json); } catch (_) { throw new ApiError(502, "resposta inesperada de " + provider, {}); }
  text = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let out;
  try { out = JSON.parse(text); } catch (_) { const m = text.match(/\{[\s\S]*\}/); try { out = JSON.parse(m[0]); } catch (__) { out = { verdict: "parcial", right: "", missing: "", wrong: "", tip: text.slice(0, 300) }; } }

  // guarda o feedback junto do progresso (slug, item), se existir
  try {
    const rec = e.app.findFirstRecordByFilter("progress", "slug = {:slug} && item = {:item}", { slug: String(body.slug || ""), item: Number(body.item) });
    rec.set("feedback", JSON.stringify(out)); rec.set("verdict", out.verdict || "");
    e.app.save(rec);
  } catch (_) {}

  return e.json(200, out);
}, $apis.requireAuth());
