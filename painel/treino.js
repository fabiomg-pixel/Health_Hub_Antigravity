// Treino com séries (fase 1). Substitui o registro de carga que antes ficava no Fitbod.
//
// Fonte da sessão: data/treinos.json (sessões escritas à mão, por data) ou, para os dias da
// semana publicada, os exercícios numerados do semana.json. Grava pelo /api/log que já existe
// (Tipo Treino no Notion), com um resumo legível seguido de "#sets {json}" para o painel e para
// a revisão semanal lerem as cargas de volta. Sem sinal na academia: o treino em andamento fica
// no aparelho e a fila de envio tenta de novo quando voltar a rede.
// Usa os helpers do index.html: $, esc, fNum, semEmoji, partirFoco, isoLocal, DATA, REGISTROS.

let TREINOS = null;
const T_ESTADO = 'treino_estado', T_FILA = 'treino_fila', T_HIST = 'treino_hist';
let T_TICK = null, T_FIM_DESCANSO = 0;

const lsGet = (k, padrao) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const slugT = s => semEmoji(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const numT = v => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
const topoReps = r => { const m = String(r || '').match(/\d+/g); return m ? +m[m.length - 1] : ''; };
const relogio = s => Math.floor(s / 60) + ':' + String(Math.max(0, s % 60)).padStart(2, '0');

fetch('data/treinos.json').then(r => r.ok ? r.json() : null).then(j => { TREINOS = j; if (typeof renderStatus === 'function' && DATA) renderStatus(); if (/^#treino/.test(location.hash)) route(); }).catch(() => {});

// ───────── de onde vem a sessão ─────────
function exerciciosDoPlano(d) {
  const out = [];
  ((d.treino && d.treino.exercicios) || []).forEach(e => {
    const m = String(e.nome || '').match(/^\s*(\d)[️⃣]*\s*·?\s*(.+?)\s+—\s+(\d+)\s*[×x]\s*(.+)$/);
    if (!m || !e.reps || e.reps === '—') return;
    const reps = String(e.reps), baixo = +(reps.match(/\d+/) || [10])[0];
    out.push({ id: slugT(m[2]), nome: semEmoji(m[2]), series: +e.series || +m[3], reps, kg: null, descanso_s: baixo <= 8 ? 90 : 60 });
  });
  return out;
}
function sessaoDe(iso) {
  if (TREINOS && TREINOS.sessoes && TREINOS.sessoes[iso]) return { iso, ...TREINOS.sessoes[iso] };
  const dd = iso.slice(8, 10) + '/' + iso.slice(5, 7), d = DATA && DATA.dias.find(x => x.data === dd);
  if (!d) return null;
  const ex = exerciciosDoPlano(d); if (!ex.length) return null;
  const f = partirFoco((d.treino && d.treino.foco) || 'Treino');
  return { iso, titulo: f.titulo, regra: f.sub || '', exercicios: ex };
}
function linkTreino(iso) {
  const s = sessaoDe(iso); if (!s) return '';
  return `<section class="bloco" style="padding-bottom:0"><a class="linha" href="#treino/${iso}"><span class="corpo">Treino com séries<small>${esc(s.titulo)} · ${s.exercicios.length} exercícios · registrar carga e repetições</small></span><span class="num">abrir</span></a></section>`;
}

// ───────── o que foi feito da última vez ─────────
function historicoDeCargas() {
  const h = lsGet(T_HIST, {});
  (typeof REGISTROS !== 'undefined' ? REGISTROS : []).filter(r => r.tipo === 'Treino').forEach(r => {
    const m = String(r.texto || '').match(/#sets (\{.*\})\s*$/); if (!m) return;
    try { (JSON.parse(m[1]).ex || []).forEach(e => { if (!h[e.i] || h[e.i].data < r.data) h[e.i] = { data: r.data, s: e.s }; }); } catch (e) {}
  });
  return h;
}

// ───────── estado do treino em andamento (fica no aparelho) ─────────
function estadoDe(iso) {
  let st = lsGet(T_ESTADO, null);
  if (!st || st.data !== iso) { st = { data: iso, inicio: null, ef: null, nota: '', s: {}, troca: {} }; lsSet(T_ESTADO, st); }
  if (!st.troca) st.troca = {};
  return st;
}
// o exercício de fato feito: o do plano ou o que ele trocou por equivalente
const efetivo = (e, st) => st.troca[e.id] || { id: e.id, nome: e.nome, halter: !!e.halter };
function acharGrupo(e) {
  if (e.grupo) return e.grupo;
  const gs = (TREINOS && TREINOS.biblioteca && TREINOS.biblioteca.grupos) || {};
  return Object.keys(gs).find(g => gs[g].chaves.some(c => e.id.indexOf(c) >= 0)) || null;
}
function opcoesDe(e) { const g = acharGrupo(e), gs = (TREINOS && TREINOS.biblioteca && TREINOS.biblioteca.grupos) || {}; return g && gs[g] ? gs[g].opcoes : []; }
function kgInicial(e, ef, i, hist) {
  if (ef.id === e.id && e.kg != null) return e.kg;
  const u = hist[ef.id], dele = u && (u.s[i] || u.s[u.s.length - 1]);
  return dele && dele[0] != null ? dele[0] : '';
}
function preencher(sessao, st, hist) {
  sessao.exercicios.forEach(e => {
    const l = st.s[e.id] = st.s[e.id] || [];
    for (let i = 0; i < e.series; i++) {
      if (l[i]) continue;
      if (e.tipo === 'tempo') { l[i] = { seg: e.alvo_s || 30, ok: false }; continue; }
      l[i] = { kg: kgInicial(e, efetivo(e, st), i, hist), reps: topoReps(e.reps), ok: false };
    }
  });
  lsSet(T_ESTADO, st);
}

// ───────── a tela ─────────
function renderTreino(id) {
  pararRelogios();
  const iso = (id.split('/')[1]) || isoLocal(), sessao = sessaoDe(iso);
  const topo = `<div class="campo tinta"><div class="dentro" style="padding-bottom:22px">
    <div class="topo"><div class="rot">Treino · ${esc(iso.slice(8, 10) + '/' + iso.slice(5, 7))}</div><div class="selo" id="t-clock">0:00</div></div>
    <h1 class="titulo longo">${sessao ? esc(sessao.titulo) : 'Sem treino com séries hoje'}</h1>
    ${sessao && sessao.regra ? `<div class="sub">${esc(sessao.regra)}</div>` : ''}</div></div>`;
  if (!sessao) {
    const prox = DATA.dias.filter(d => exerciciosDoPlano(d).length).map(d => `<a class="linha" href="#treino/2026-${d.data.slice(3, 5)}-${d.data.slice(0, 2)}"><span class="corpo">${esc(d.nome)} · ${esc(d.data)}<small>${esc(partirFoco((d.treino && d.treino.foco) || '').titulo)}</small></span></a>`).join('');
    $("view").innerHTML = topo + `<section class="bloco"><div class="cab"><h2>Escolha um treino</h2></div>${prox || '<div class="par">Nenhum dia da semana publicada tem exercícios com séries.</div>'}</section>`;
    return;
  }
  const st = estadoDe(iso), hist = historicoDeCargas();
  preencher(sessao, st, hist);
  const fila = lsGet(T_FILA, []);
  let h = topo + `<div id="t-banner"></div>`;
  h += sessao.exercicios.map((e, xi) => {
    const ef = efetivo(e, st), ult = hist[ef.id], tempo = e.tipo === 'tempo', opcoes = opcoesDe(e), trocado = ef.id !== e.id;
    const lastTxt = ult ? 'Última vez (' + isoDDMM(ult.data) + '): ' + ult.s.map(s => tempo ? s[0] + ' s' : (s[0] != null ? fNum(s[0], s[0] % 1 ? 1 : 0) + ' kg × ' + s[1] : s[1])).join(', ') : '';
    return `<section class="bloco"><div class="cab"><h2 style="font-size:20px">${esc(ef.nome)}</h2><small>${e.series} × ${tempo ? (e.alvo_s || '') + ' s' : esc(e.reps)} · descanso ${e.descanso_s || 60} s</small></div>
      ${trocado ? `<div class="alim-leitura" style="padding-bottom:4px">No lugar de ${esc(e.nome)}. ${ef.halter ? 'A carga é por halter (cada mão). ' : ''}${ult ? '' : 'Sem histórico nesse exercício: use uma carga com a qual você faria uns 16 repetições.'}</div>` : (e.nota ? `<div class="alim-leitura" style="padding-bottom:4px">${esc(e.nota)}</div>` : '')}
      <button type="button" class="trocar" data-x="${xi}" aria-expanded="false">Trocar exercício</button>
      <div class="opcoes" id="op-${xi}" hidden>${opcoes.filter(op => op.id !== ef.id && op.id !== e.id).map(op => `<button type="button" data-x="${xi}" data-op="${esc(op.id)}">${esc(op.nome)}${op.halter ? ' · por halter' : ''}</button>`).join('')}${trocado ? `<button type="button" data-x="${xi}" data-op="${esc(e.id)}">Voltar para ${esc(e.nome)}</button>` : ''}<button type="button" data-x="${xi}" data-op="__outro">Outro (digitar o nome)</button></div>
      ${lastTxt ? `<div class="ml" style="font-size:13px;color:var(--sec);padding:6px 0 2px">${esc(lastTxt)}</div>` : ''}
      ${st.s[e.id].map((s, i) => `<div class="serie" data-x="${xi}" data-i="${i}"><span class="sn">${i + 1}</span>
        ${tempo ? `<label class="cp"><input class="n" inputmode="numeric" data-c="seg" value="${esc(s.seg)}" aria-label="segundos da série ${i + 1}"><small>s</small></label><span></span>`
          : `<label class="cp"><input class="n" inputmode="decimal" data-c="kg" value="${esc(s.kg)}" aria-label="carga da série ${i + 1}"><small>${ef.halter ? 'kg/halter' : 'kg'}</small></label>
             <label class="cp"><input class="n" inputmode="numeric" data-c="reps" value="${esc(s.reps)}" aria-label="repetições da série ${i + 1}"><small>reps</small></label>`}
        <button type="button" class="okb ${s.ok ? 'on' : ''}" aria-pressed="${s.ok}" aria-label="série ${i + 1} feita">${s.ok ? 'Feita' : 'Fazer'}</button></div>`).join('')}
    </section>`;
  }).join('');
  h += `<section class="bloco"><div class="cab"><h2>Como foi</h2><small>opcional</small></div>
    <div class="seg" style="margin-top:12px;grid-template-columns:repeat(3,minmax(0,1fr))">${[['leve', 'Leve'], ['ok', 'No ponto'], ['pesado', 'Pesado']].map(([k, r]) => `<button type="button" data-ef="${k}" class="${st.ef === k ? 'on' : ''}">${r}</button>`).join('')}</div>
    <textarea id="t-nota" rows="2" placeholder="Dor, tornozelo, algo que mudou no treino" style="width:100%;margin-top:12px;font:inherit;padding:10px;border:2px solid var(--tinta);background:#fff">${esc(st.nota || '')}</textarea>
    <button type="button" id="t-fim" class="linha" style="margin-top:14px;justify-content:center;font-weight:800;background:var(--tinta);color:#fff;border:0">Terminar treino</button>
    <div id="t-status" class="status" style="margin-top:10px"></div>
    ${fila.length ? `<div class="aviso">${fila.length} treino(s) guardado(s) neste aparelho, aguardando sinal para enviar.</div>` : ''}
    <div class="aviso">As cargas ficam neste aparelho enquanto o treino está aberto. Ao terminar, o resumo vai para o seu diário e vira o ponto de partida do próximo treino.</div></section>`;
  $("view").innerHTML = h;
  ligarTreino(sessao, st, iso);
  tictac(st);
}

function barraDescanso() {
  let b = document.getElementById('t-desc');
  if (!b) { b = document.createElement('div'); b.id = 't-desc'; b.hidden = true; document.body.appendChild(b); }
  return b;
}
function pararRelogios() { if (T_TICK) clearInterval(T_TICK); T_TICK = null; T_FIM_DESCANSO = 0; barraDescanso().hidden = true; }
function tictac(st) {
  if (T_TICK) clearInterval(T_TICK);
  const rel = () => {
    const c = document.getElementById('t-clock'); if (c) c.textContent = st.inicio ? relogio(Math.floor((Date.now() - st.inicio) / 1000)) : '0:00';
    const b = barraDescanso();
    if (T_FIM_DESCANSO) {
      const falta = Math.ceil((T_FIM_DESCANSO - Date.now()) / 1000);
      if (falta <= 0) { T_FIM_DESCANSO = 0; b.hidden = false; b.innerHTML = '<span>Descanso acabou</span><button type="button" id="t-ok">Fechar</button>'; try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} document.getElementById('t-ok').onclick = () => { b.hidden = true; }; }
      else { b.hidden = false; b.innerHTML = `<span>Descanso <b>${relogio(falta)}</b></span><span><button type="button" id="t-mais">+15 s</button> <button type="button" id="t-pula">Pular</button></span>`;
        document.getElementById('t-mais').onclick = () => { T_FIM_DESCANSO += 15000; }; document.getElementById('t-pula').onclick = () => { T_FIM_DESCANSO = 0; b.hidden = true; }; }
    }
  };
  rel(); T_TICK = setInterval(rel, 500);
}
window.addEventListener('hashchange', () => { if (!/^#treino/.test(location.hash)) pararRelogios(); });

function ligarTreino(sessao, st, iso) {
  const salvar = () => lsSet(T_ESTADO, st);
  document.querySelectorAll('.serie').forEach(row => {
    const e = sessao.exercicios[+row.dataset.x], s = st.s[e.id][+row.dataset.i];
    row.querySelectorAll('input.n').forEach(inp => inp.addEventListener('input', () => { s[inp.dataset.c] = inp.dataset.c === 'kg' ? inp.value : (numT(inp.value) ?? ''); salvar(); }));
    row.querySelector('.okb').addEventListener('click', ev => {
      s.ok = !s.ok; if (s.ok && !st.inicio) st.inicio = Date.now(); salvar();
      ev.currentTarget.classList.toggle('on', s.ok); ev.currentTarget.textContent = s.ok ? 'Feita' : 'Fazer'; ev.currentTarget.setAttribute('aria-pressed', s.ok);
      if (s.ok) T_FIM_DESCANSO = Date.now() + (e.descanso_s || 60) * 1000; else { T_FIM_DESCANSO = 0; barraDescanso().hidden = true; }
    });
  });
  document.querySelectorAll('.trocar').forEach(b => b.addEventListener('click', () => { const box = document.getElementById('op-' + b.dataset.x); box.hidden = !box.hidden; b.setAttribute('aria-expanded', !box.hidden); }));
  document.querySelectorAll('.opcoes button').forEach(b => b.addEventListener('click', () => {
    const e = sessao.exercicios[+b.dataset.x], hist = historicoDeCargas();
    let op = b.dataset.op === '__outro' ? null : (opcoesDe(e).find(x => x.id === b.dataset.op) || (b.dataset.op === e.id ? { id: e.id, nome: e.nome, halter: !!e.halter } : null));
    if (b.dataset.op === '__outro') { const nome = (prompt('Qual exercício você fez no lugar?') || '').trim(); if (!nome) return; op = { id: 'x_' + slugT(nome), nome, halter: /halter/i.test(nome) }; }
    if (!op) return;
    if (op.id === e.id) delete st.troca[e.id]; else st.troca[e.id] = { id: op.id, nome: op.nome, halter: !!op.halter };
    const ef = efetivo(e, st);
    st.s[e.id].forEach((s, i) => { if (e.tipo !== 'tempo') s.kg = kgInicial(e, ef, i, hist); });
    salvar(); renderTreino('treino/' + iso);
  }));
  document.querySelectorAll('[data-ef]').forEach(b => b.addEventListener('click', () => { st.ef = st.ef === b.dataset.ef ? null : b.dataset.ef; salvar(); document.querySelectorAll('[data-ef]').forEach(x => x.classList.toggle('on', x.dataset.ef === st.ef)); }));
  document.getElementById('t-nota').addEventListener('input', ev => { st.nota = ev.target.value; salvar(); });
  document.getElementById('t-fim').addEventListener('click', ev => terminarTreino(sessao, st, iso, ev.currentTarget));
}

// ───────── gravar ─────────
function montarRegistro(sessao, st, iso) {
  const feitos = sessao.exercicios.map(e => ({ e, ss: (st.s[e.id] || []).filter(x => x.ok) })).filter(x => x.ss.length);
  if (!feitos.length) return null;
  const dur = st.inicio ? Math.max(1, Math.round((Date.now() - st.inicio) / 60000)) : null;
  const j = { v: 1, t: slugT(sessao.titulo), dur, ef: st.ef, ex: feitos.map(({ e, ss }) => { const f = efetivo(e, st), o = { i: f.id, s: ss.map(x => e.tipo === 'tempo' ? [x.seg] : [numT(x.kg) ?? 0, x.reps]) }; if (f.id !== e.id) o.o = e.id; if (f.halter) o.h = 1; return o; }) };
  const json = JSON.stringify(j);
  const ef = { leve: 'leve', ok: 'no ponto', pesado: 'pesado' }[st.ef];
  const linhas = feitos.map(({ e, ss }) => { const f = efetivo(e, st), nome = f.id !== e.id ? `${f.nome} (no lugar de ${e.nome})` : e.nome;
    return e.tipo === 'tempo' ? `${nome}: ${ss.map(x => x.seg + ' s').join(', ')}` : `${nome}: ${ss.map(x => (numT(x.kg) ?? 0) + (f.halter ? ' kg por halter × ' : ' kg × ') + x.reps).join(', ')}`; }).join('; ');
  let cab = `Treino feito no painel: ${sessao.titulo}${dur ? ', ' + dur + ' min' : ''}${ef ? ', esforço ' + ef : ''}. ${linhas}${st.nota ? '. Nota: ' + st.nota.trim() : ''}`;
  const folga = 1880 - json.length - 8;
  if (cab.length > folga) cab = cab.slice(0, Math.max(40, folga - 1)) + '…';
  return { tipo: 'treino', data: iso, texto: cab + ' #sets ' + json, _j: j };
}
async function enviarRegistro(p) {
  const { _j, ...corpo } = p;
  const r = await fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
}
function guardarHistoricoLocal(p) {
  const h = lsGet(T_HIST, {});
  (p._j.ex || []).forEach(e => { h[e.i] = { data: p.data, s: e.s }; });
  lsSet(T_HIST, h);
}
async function terminarTreino(sessao, st, iso, btn) {
  const stat = document.getElementById('t-status'), p = montarRegistro(sessao, st, iso);
  if (!p) { stat.className = 'status err'; stat.textContent = 'Marque ao menos uma série como feita.'; return; }
  btn.disabled = true; stat.className = 'status'; stat.textContent = 'Enviando…';
  guardarHistoricoLocal(p);
  try { await enviarRegistro(p); stat.className = 'status ok'; stat.textContent = 'Treino anotado no seu diário.'; }
  catch (e) { const f = lsGet(T_FILA, []); f.push({ ...p }); lsSet(T_FILA, f); stat.className = 'status ok'; stat.textContent = 'Sem sinal: o treino ficou guardado neste aparelho e vai quando a rede voltar.'; }
  lsSet(T_ESTADO, null); pararRelogios();
  btn.textContent = 'Treino encerrado';
}
async function esvaziarFila() {
  let f = lsGet(T_FILA, []); if (!f.length || !navigator.onLine) return;
  const resto = [];
  for (const p of f) { try { await enviarRegistro(p); } catch (e) { resto.push(p); } }
  lsSet(T_FILA, resto);
}
window.addEventListener('online', esvaziarFila);
esvaziarFila();
