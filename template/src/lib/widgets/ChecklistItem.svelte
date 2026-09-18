<script lang="ts">
  import { Check, PenLine, ChevronDown, ChevronUp, Sparkles } from '@lucide/svelte';
  import { grade, type Progress, type Grade } from '$lib/db/progress';
  let { html, refId, excerpt, refText, slug, index, canEdit, record, onSave, lang = 'pt-BR' }: {
    html: string; refId: string; excerpt: string; refText: string; slug: string; index: number; canEdit: boolean; record: Progress | undefined; onSave: (d: Partial<Progress>) => Promise<void>; lang?: string;
  } = $props();
  const en = $derived(lang.startsWith('en'));
  const T = $derived(en ? {
    explain: 'Explain in my own words', prompt: 'Explain it in your own words, without consulting the text:', save: 'save', compare: ' and compare', evaluate: 'save and evaluate', evaluating: 'evaluating…', evalTitle: 'Evaluate my explanation (Gemini)', goto: 'go to section',
    mine: 'your answer', ref: 'what the document says', verdictLbl: 'evaluation', verdict: { solido: 'solid', parcial: 'partial', revisar: 'review' } as Record<string, string>, right: 'right', missing: 'missing', wrong: 'wrong', tip: 'tip',
    off: 'evaluation is off (no key)', fail: 'could not evaluate now', answered: 'Done (click to undo)', unanswered: 'Mark as done'
  } : {
    explain: 'Explicar com minhas palavras', prompt: 'Explicação com as próprias palavras, sem consultar o texto:', save: 'salvar', compare: ' e comparar', evaluate: 'salvar e avaliar', evaluating: 'avaliando…', evalTitle: 'Avaliar minha explicação (Gemini)', goto: 'ir à seção',
    mine: 'resposta registrada', ref: 'o que o documento diz', verdictLbl: 'avaliação', verdict: { solido: 'sólido', parcial: 'parcial', revisar: 'revisar' } as Record<string, string>, right: 'acertou', missing: 'faltou', wrong: 'erro', tip: 'dica',
    off: 'avaliação desligada (sem chave)', fail: 'não foi possível avaliar agora', answered: 'Concluído (clique para desfazer)', unanswered: 'Marcar como concluído'
  });
  let grading = $state(false), gerr = $state('');
  const fb = $derived<Grade | null>(record?.feedback ? JSON.parse(record.feedback) : null);
  async function evaluate() {
    grading = true; gerr = '';
    try {
      const text = draft.trim() || answer; if (!text) return;
      if (text !== answer) await onSave({ answer: text });
      const req = () => grade({ slug, item: index, question: html.replace(/<[^>]+>/g, ''), reference: refText, answer: text, lang });
      let g: Grade; try { g = await req(); } catch (e: any) { if (e?.status && e.status < 500) throw e; await new Promise((r) => setTimeout(r, 1500)); g = await req(); } // Gemini oscila: uma segunda tentativa
      await onSave({ feedback: JSON.stringify(g), verdict: g.verdict });
    } catch (e: any) { gerr = e?.status === 503 ? T.off : `${T.fail} (${e?.status ?? 'rede'}${e?.response?.message ? ': ' + e.response.message : ''})`; }
    finally { grading = false; }
  }
  let open = $state(false), draft = $state(''), busy = $state(false), saved = $state(false);
  const done = $derived(!!record?.done);
  const answer = $derived(record?.answer ?? '');
  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';
  function toggleOpen() { open = !open; if (open) draft = answer; }
  async function save() { busy = true; await onSave({ answer: draft.trim() }); saved = true; busy = false; }
</script>

<div class="ci" class:done>
  <button type="button" class="tick" aria-pressed={done} title={done ? T.answered : T.unanswered} disabled={!canEdit} onclick={() => onSave({ done: !done })}>{#if done}<Check size={13} />{/if}</button>
  <div class="body">
    <div class="row">
      <span class="text">{@html html}</span>
      {#if canEdit}<button type="button" class="explain" title={T.explain} onclick={toggleOpen}><PenLine size={13} />{#if answer && !open} <span class="when">{fmt(record?.updated)}</span>{/if}{#if open}<ChevronUp size={13} />{:else}<ChevronDown size={13} />{/if}</button>{/if}
    </div>
    {#if open}
      <div class="panel">
        <label>{T.prompt}</label>
        <textarea bind:value={draft} rows="4" placeholder="…" onkeydown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) evaluate(); }}></textarea>
        <div class="actions">
          <button type="button" class="ai" onclick={evaluate} disabled={grading || busy || !draft.trim() || (!!fb && draft.trim() === answer)} title={T.evalTitle}><Sparkles size={13} /> {grading ? T.evaluating : T.evaluate}</button>
          {#if answer && refId}<a href="#{refId}">{T.goto}</a>{/if}
          {#if gerr}<span class="gerr">{gerr}</span>{/if}
        </div>
        {#if fb}
          <div class="fb v-{fb.verdict}">
            <div class="lbl">{T.verdictLbl} · <b>{T.verdict[fb.verdict] ?? fb.verdict}</b></div>
            {#if fb.right}<p><span class="k ok">{T.right}</span> {fb.right}</p>{/if}
            {#if fb.missing}<p><span class="k miss">{T.missing}</span> {fb.missing}</p>{/if}
            {#if fb.wrong}<p><span class="k bad">{T.wrong}</span> {fb.wrong}</p>{/if}
            {#if fb.tip}<p><span class="k tip">{T.tip}</span> {fb.tip}</p>{/if}
          </div>
        {/if}
        {#if (saved || answer) && excerpt}
          <div class="compare">
            <div class="col"><div class="lbl">{T.mine}</div><p>{answer || draft}</p></div>
            <div class="col ref"><div class="lbl">{T.ref}</div>{@html excerpt}</div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .ci { display: flex; gap: 12px; align-items: flex-start; }
  .tick { flex: none; width: 20px; height: 20px; margin-top: .3em; display: grid; place-items: center; border: 1.5px solid var(--blue); border-radius: 4px; background: none; color: var(--bg); cursor: pointer; padding: 0; }
  .tick:disabled { cursor: default; opacity: .7; }
  .done .tick { background: var(--blue); }
  .done .text { color: var(--ink-2); }
  .body { flex: 1; min-width: 0; }
  .row { display: flex; gap: 10px; align-items: baseline; }
  .text { flex: 1; }
  .explain { display: inline-flex; align-items: center; gap: 4px; font: inherit; font-size: 13px; color: var(--ink-3); background: none; border: 1px solid transparent; border-radius: 4px; padding: 3px 6px; cursor: pointer; white-space: nowrap; }
  .explain:hover { color: var(--blue); border-color: var(--rule-2); }
  .when { font-family: var(--mono); font-size: 11px; }
  .panel { margin: 10px 0 14px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--rule); border-radius: 8px; }
  label { display: block; font-size: .85em; color: var(--ink-2); margin-bottom: 6px; }
  textarea { width: 100%; font: inherit; font-size: .95em; color: var(--ink); background: var(--bg-2); border: 1px solid var(--rule-2); border-radius: 4px; padding: 8px; resize: vertical; }
  .actions { display: flex; gap: 12px; align-items: center; margin-top: 8px; }
  .actions button { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 14px; color: var(--blue); background: none; border: 1px solid var(--blue); border-radius: 4px; padding: 5px 10px; cursor: pointer; }
  .actions button:disabled { opacity: .4; cursor: default; }
  .actions a { font-size: 14px; color: var(--ink-3); }
  .actions .ai { color: var(--violet); border-color: var(--violet); }
  .gerr { font-size: 13px; color: var(--red); }
  .fb { margin-top: 12px; padding: 10px 14px; border-left: 3px solid var(--ink-3); background: var(--bg-2); border-radius: 6px; font-size: .92em; }
  .fb p { margin: 4px 0; }
  .fb.v-solido { border-left-color: var(--green); } .fb.v-parcial { border-left-color: var(--amber); } .fb.v-revisar { border-left-color: var(--red); }
  .k { display: inline-block; min-width: 62px; font-family: var(--mono); font-size: 11px; letter-spacing: .06em; text-transform: uppercase; margin-right: 6px; }
  .k.ok { color: var(--green); } .k.miss { color: var(--amber); } .k.bad { color: var(--red); } .k.tip { color: var(--violet); }
  .compare { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; font-size: .92em; }
  .lbl { font-family: var(--mono); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 6px; }
  .col p { margin: 0; white-space: pre-wrap; }
  .ref :global(.box) { margin: 0; font-size: .95em; }
  @media (max-width: 700px) { .compare { grid-template-columns: 1fr; } }
</style>
