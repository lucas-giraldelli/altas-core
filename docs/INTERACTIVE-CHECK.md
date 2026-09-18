# Interactive check: grading the reader's explanations with an LLM

Every page ends with `ul.checklist` ("at the end of this module the reader should be able to…"), each `<li data-ref="#section-id">` pointing to the section that answers it. The core renders the list; this document describes the optional layer that makes it interactive: the reader writes an explanation in their own words, the text is saved, and a language model compares it with the referenced section and returns a verdict.

The core has no dependency on this layer. It needs a small backend; the reference implementation uses PocketBase (one binary, SQLite) and Gemini, but any backend that exposes one authenticated endpoint works.

## 1. Why the key never reaches the browser

The site is static, so anything shipped to the client is public. The model key therefore lives only in the backend process, read from an environment variable, and the browser calls an endpoint that requires a logged-in user. The endpoint builds the prompt, calls the model and stores the result.

## 2. Backend: PocketBase

Collections (create them in the dashboard or with the Admin API; all rules `@request.auth.id != ""`):

```
progress   slug text, item number, done bool, answer text, feedback json, verdict text
           unique index on (slug, item)
```

`item` must not be marked `required`: PocketBase rejects `0` for required numbers and the first checklist item has index 0.

Key and model come from the environment. With Docker Compose:

```yaml
services:
  db:
    image: ghcr.io/muchobien/pocketbase:latest
    env_file: secrets.env          # GEMINI_API_KEY=…  GEMINI_MODEL=gemini-3.5-flash-lite  (never committed)
    volumes:
      - ./pb_data:/pb_data
      - ./pb_hooks:/pb_hooks:ro
    ports: ["8090:8090"]
```

Add `secrets.env` to `.gitignore`. A key is created at <https://aistudio.google.com/apikey>.

## 3. The grading hook

`pb_hooks/grade.pb.js`. PocketBase loads it on start and reloads on change.

```js
/// <reference path="../pb_data/types.d.ts" />
// POST /api/atlas/grade  { slug, item, question, reference, answer, lang }
routerAdd("POST", "/api/atlas/grade", (e) => {
  const key = $os.getenv("GEMINI_API_KEY");
  const model = $os.getenv("GEMINI_MODEL") || "gemini-3.5-flash-lite";
  if (!key) throw new ApiError(503, "GEMINI_API_KEY not configured", {});

  const body = e.requestInfo().body;
  const question = String(body.question || "").slice(0, 500);
  const reference = String(body.reference || "").slice(0, 6000);
  const answer = String(body.answer || "").slice(0, 3000);
  const en = String(body.lang || "en").indexOf("en") === 0;
  if (!question || !answer) throw new BadRequestError("question and answer are required");

  const prompt = `You are a patient, direct tutor. The student read a text and now explains the item below in their own words, without looking. Compare the explanation with the reference (the source of truth) and answer ${en ? "in English" : "in Brazilian Portuguese"} as strict JSON with the keys:
- "verdict": "solido" | "parcial" | "revisar"
- "right": what the student got right (1 sentence)
- "missing": what is missing or vague (1 sentence; "" if nothing)
- "wrong": a conceptual error, if any (1 sentence; "" if none)
- "tip": one short tip to retain it (1 sentence)
No em dashes. No empty praise. Correct but incomplete is "parcial".

ITEM: ${question}

REFERENCE:
${reference}

STUDENT'S EXPLANATION:
${answer}`;

  const res = $http.send({
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 400 } }),
    timeout: 30
  });
  if (res.statusCode >= 300) throw new ApiError(502, "Gemini: " + res.statusCode, { detail: res.raw.slice(0, 300) });

  let out;
  try { out = JSON.parse(res.json.candidates[0].content.parts[0].text); }
  catch (_) { throw new ApiError(502, "unexpected model response", {}); }

  // keep the feedback next to the saved answer
  try {
    const rec = e.app.findFirstRecordByFilter("progress", "slug = {:slug} && item = {:item}", { slug: String(body.slug || ""), item: Number(body.item) });
    rec.set("feedback", JSON.stringify(out)); rec.set("verdict", out.verdict || "");
    e.app.save(rec);
  } catch (_) {}

  return e.json(200, out);
}, $apis.requireAuth());
```

Test it from a shell (replace the token with one from `users/auth-with-password`):

```sh
curl -s -X POST http://localhost:8090/api/atlas/grade -H "Authorization: $TOKEN" -H 'content-type: application/json' \
  -d '{"slug":"math/fractions","item":0,"question":"Explain why 1/2 = 2/4","reference":"Multiplying numerator and denominator by the same non-zero number keeps the value.","answer":"same thing times two on top and bottom"}'
```

A `503` means the key is missing in the container environment; a `502` carries the model's status code in `detail`.

## 4. Client

Reference text for an item is the text of the section pointed to by `data-ref`, taken from the rendered page:

```ts
const refText = (root: HTMLElement, li: HTMLLIElement) => {
  const id = li.dataset.ref?.slice(1); const sec = id && root.querySelector(`#${id}`)?.closest('section');
  return (sec?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 6000);
};
```

The call, with the PocketBase JS SDK:

```ts
const grade = (body: { slug: string; item: number; question: string; reference: string; answer: string; lang?: string }) =>
  pb.send('/api/atlas/grade', { method: 'POST', body });
```

Save the answer in `progress` before grading, retry once on a 5xx (the model is occasionally unavailable), and show the reason on failure instead of a generic message. The widget is mounted after `enhance` has run, with `mountIn` from the core:

```ts
import { mountIn } from '@lucasgiraldelli/atlas-core';
const cleanup = mountIn(root, 'ul.checklist', Checklist, (ul) => ({ slug: page.slug, items: [...ul.querySelectorAll('li')], root }));
```

The widget hides the original `ul` and renders its own list: a checkbox per item, a textarea with "save and evaluate", the verdict block (`right`, `missing`, `wrong`, `tip`) and, side by side, the saved answer and the referenced section. Disable the button while grading, when the textarea is empty, and when the text equals the one already graded.

## 5. Costs and limits

Each grading is one request of roughly two to four thousand input tokens. With a flash-class model this is a fraction of a cent. The hook truncates the reference at 6000 characters and the answer at 3000, which keeps the prompt bounded regardless of section size.
