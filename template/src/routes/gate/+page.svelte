<script lang="ts">
  /* Tela do PIN. Um único <input> invisível por cima de 8 células desenhadas (mantém teclado
     numérico, colar e autofill). Autentica no PocketBase e grava o token num cookie que o
     nginx checa em toda requisição (auth_request). Sem esse cookie nada do site é servido. */
  import { loginWithPin, pb } from '$lib/db/client.svelte';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  const LEN = 8;
  let pin = $state(''), wrong = $state(false), busy = $state(false), down = $state(false), focused = $state(false);
  let input: HTMLInputElement;

  async function submit() {
    if (pin.length !== LEN || busy) return;
    busy = true; wrong = false; down = false;
    try {
      await loginWithPin(pin);
      document.cookie = `atlas_token=${pb.authStore.token}; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax; Secure`;
      const next = page.url.searchParams.get('next') || '/';
      location.replace(next.startsWith('/') ? next : '/');
    } catch (err: any) {
      if (err?.status === 400 || err?.status === 401) wrong = true; else down = true;
      pin = ''; input.focus();
    } finally { busy = false; }
  }
  // autofocus não sobrevive à hidratação em alguns navegadores; foca de novo ao montar e ao voltar à aba
  onMount(() => {
    input.focus();
    const f = () => input.focus();
    // o foco nunca sai do PIN: qualquer pointerdown fora dele é cancelado (não seleciona texto) e re-foca
    const down = (e: PointerEvent) => { if (e.target !== input) { e.preventDefault(); input.focus(); } };
    addEventListener('focus', f); document.addEventListener('pointerdown', down);
    return () => { removeEventListener('focus', f); document.removeEventListener('pointerdown', down); };
  });
  function oninput() { pin = pin.replace(/\D/g, '').slice(0, LEN); wrong = false; if (pin.length === LEN) submit(); }
</script>

<svelte:head><title>Atlas</title></svelte:head>

<form class="gate" onsubmit={(e) => { e.preventDefault(); submit(); }}>
  <h1>Atlas</h1>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="cells" class:wrong class:busy onclick={() => input.focus()}>
    {#each Array(LEN) as _, i}
      <span class="cell" class:filled={i < pin.length} class:active={focused && i === pin.length}>{i < pin.length ? '•' : ''}</span>
    {/each}
    <!-- svelte-ignore a11y_autofocus -->
    <input bind:this={input} type="password" inputmode="numeric" pattern="[0-9]*" maxlength={LEN} autocomplete="current-password"
      aria-label="PIN" bind:value={pin} {oninput} onfocus={() => (focused = true)} onblur={() => { focused = false; setTimeout(() => input?.focus(), 0); }} autofocus disabled={busy} />
  </div>
  <p class="err" aria-live="polite">{wrong ? 'PIN incorreto' : down ? 'API indisponível' : ' '}</p>
</form>

<style>
  .gate { min-height: 100vh; display: grid; place-content: center; gap: 18px; text-align: center; user-select: none; -webkit-user-select: none; }
  h1 { font-size: 40px; font-weight: 400; margin: 0; }
  .cells { position: relative; display: flex; gap: 8px; justify-content: center; cursor: text; }
  .cell { width: 40px; height: 52px; display: grid; place-items: center; font-size: 26px; color: var(--ink);
    background: var(--surface); border: 1px solid var(--rule-2); border-radius: 8px; transition: border-color .12s, transform .12s; }
  .cell.filled { border-color: var(--ink-3); }
  .cell.active { border-color: var(--blue); box-shadow: 0 0 0 2px color-mix(in srgb, var(--blue) 30%, transparent); }
  .cells.wrong .cell { border-color: var(--red); animation: shake .3s; }
  .cells.busy .cell { opacity: .6; }
  @keyframes shake { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
  input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; font-size: 26px; letter-spacing: 2.2em; }
  .err { color: var(--red); margin: 0; font-size: 15px; min-height: 1.4em; }
  @media (max-width: 420px) { .cell { width: 34px; height: 46px; font-size: 22px; } .cells { gap: 6px; } }
</style>
