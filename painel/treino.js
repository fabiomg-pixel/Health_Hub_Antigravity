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
let T_TICK = null, T_FIM_DESCANSO = 0, T_CTX = null;

const rirHtml = s => `<div class="rir" role="group" aria-label="Quanto sobrou nessa série">Sobrou fôlego? ${[['f', 'Folga'], ['d', 'Duro'], ['l', 'Limite']].map(([k, r]) => `<button type="button" data-r="${k}" class="${s.rir === k ? 'on' : ''}" aria-pressed="${s.rir === k}">${r}</button>`).join('')}</div>`;
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
// Variantes (Fabio, 31/10): "casa" = a versão em casa com TRX e peso do corpo (sem pesos: ele não tem em casa, 31/10) que toda sessão de força leva;
// "bonus" = a rodada bônus de força curta dos dias de corrida (4 exercícios de grupos pouco usados, A e B alternados).
function bonusForca(iso) { const l = (TREINOS && TREINOS.bonus && TREINOS.bonus.forca) || []; return l.length ? l[Math.floor(Date.parse(iso) / 864e5) % l.length] : null; }
function sessaoDe(iso, v) {
  const base = TREINOS && TREINOS.sessoes && TREINOS.sessoes[iso];
  if (v === 'casa' && base && base.casa) return { iso, variante: 'casa', pesada: base.pesada, ...base.casa };
  if (v === 'bonus') { const b = bonusForca(iso); return b ? { iso, variante: 'bonus', pesada: false, ...b } : null; }
  if (v === 'rotina') { const r = TREINOS && TREINOS.rotina_casa; return r ? { iso, variante: 'rotina', pesada: false, ...r } : null; }   // missão paralela (02/11)
  if (base) return { iso, ...base };
  const dd = iso.slice(8, 10) + '/' + iso.slice(5, 7), d = DATA && DATA.dias.find(x => x.data === dd);
  if (!d) return null;
  const ex = exerciciosDoPlano(d); if (!ex.length) return null;
  const f = partirFoco((d.treino && d.treino.foco) || 'Treino');
  return { iso, titulo: f.titulo, regra: f.sub || '', exercicios: ex };
}
function linkTreino(iso) {
  const s = sessaoDe(iso); if (!s) return '';
  return `<section class="bloco" style="padding-bottom:0"><a class="linha" href="#treino/${iso}"><span class="corpo">${iso === isoLocal() ? 'Treino de hoje' : 'Treino de ' + esc(iso.slice(8, 10) + '/' + iso.slice(5, 7))}<small>${esc(s.titulo)} · ${s.exercicios.length} exercícios · carga e repetições</small></span><span class="num">abrir</span></a>${s.casa ? `<a class="linha" href="#treino/${iso}/casa"><span class="corpo">Versão em casa<small>TRX + peso do corpo · ${s.casa.exercicios.length} exercícios</small></span><span class="num">abrir</span></a>` : ''}</section>`;
}
// Rodada bônus (Fabio, 31/10): no dia de corrida, força curta de grupos pouco usados; no dia de força, corrida leve de 20-30 min.
// Opcional, só com o semáforo em Pode, depois da sessão principal. Pontuação extra (jornada.py), fora das missões.
function blocoBonus(iso, tipo) {
  const B = TREINOS && TREINOS.bonus; if (!B || !['forca', 'corrida'].includes(tipo)) return '';
  const sem = typeof avaliarSemaforo === 'function' ? avaliarSemaforo().estado : 'pode';
  const feito = (REGISTROS || []).some(x => x.tipo === 'Treino' && x.data === iso && /rodada b[ôo]nus/i.test(x.texto || ''));
  let corpo;
  if (feito) corpo = `<div class="par">Feita. A pontuação extra entra no próximo recálculo da Campanha.</div>`;
  else if (sem !== 'pode') corpo = `<div class="par">O semáforo de hoje não está em Pode: a rodada bônus fica para outro dia.</div>`;
  else if (tipo === 'forca') corpo = `<div class="par">${esc(B.corrida.texto)}</div><button type="button" class="botao claro" id="b-corrida">Registrar a corrida bônus</button><div id="b-status" class="msg" role="status" aria-live="polite"></div>`;
  else { const b = bonusForca(iso); corpo = `<div class="par">${esc(b.titulo.replace(/^Rodada bônus:\s*/, ''))}: ${b.exercicios.map(e => esc(e.nome)).join(', ')}. Uns 12 min, depois da corrida.</div><a class="botao claro" href="#treino/${iso}/bonus">Iniciar a rodada bônus</a>`; }
  return `<section class="bloco"><div class="cab"><h2>Rodada bônus</h2><small>opcional · pontuação extra</small></div>${corpo}</section>`;
}
// Missões paralelas (Fabio, 02/11): todo dia, opcionais. Passeio com os cachorros (um toque registra) e rotina de casa
// (alongamento, flexão e prancha no player). Não são exercício nem item do dia: só XP; 5 dias na semana = +30 XP cada.
function blocoParalelas(iso) {
  const J = typeof JORNADA !== 'undefined' && JORNADA, ps = (J && J.capitulo && J.capitulo.paralelas) || [], hoje = iso === isoLocal();
  const reg = re => (REGISTROS || []).some(x => x.tipo === 'Treino' && x.data === iso && /miss[ãa]o paralela/i.test(x.texto || '') && re.test(x.texto || ''));
  const feitoC = reg(/cachorr/i), feitoR = reg(/rotina de casa/i);
  const sem = id => { const p = ps.find(x => x.id === id); return p ? `${p.feito} de ${p.meta} dias na semana` : ''; };
  const linha = (nome, sub, feito, acao) => `<div class="linha" style="align-items:center"><span class="corpo">${esc(nome)}<small>${esc(sub)}</small></span>${feito ? '<span class="num" style="font-size:15px">feito</span>' : acao}</div>`;
  return `<section class="bloco"><div class="cab"><h2>Missões paralelas</h2><small>opcionais · só pontos, não contam como treino</small></div>
    ${linha('Passeio com os cachorros', 'jogging curto · ' + sem('caes'), feitoC, hoje ? '<button type="button" class="botao claro" id="p-caes" style="width:auto;min-width:96px;margin:0">Feito</button>' : '')}
    ${linha('Rotina de casa', 'alongamento, flexão e prancha, ~10 min · ' + sem('rotina'), feitoR, hoje ? `<a class="botao claro" href="#treino/${iso}/rotina" style="width:auto;min-width:96px;margin:0">Iniciar</a>` : '')}
    <div id="p-status" class="msg" role="status" aria-live="polite"></div></section>`;
}
document.addEventListener('click', async ev => {
  const b = ev.target.closest && ev.target.closest('#p-caes'); if (!b) return;
  const st = document.getElementById('p-status'); b.disabled = true; st.textContent = 'Enviando…';
  const texto = 'Missão paralela: passeio com os cachorros (jogging curto).';
  try {
    await enviarRegistro({ tipo: 'treino', data: isoLocal(), texto });
    try { REGISTROS.unshift({ id: 'local-' + Date.now(), data: isoLocal(), tipo: 'Treino', texto, foto: false, fotos: 0 }); } catch (e) {}
    st.className = 'msg ok'; st.textContent = 'Registrado. Os cachorros agradecem.'; b.replaceWith(Object.assign(document.createElement('span'), { className: 'num', textContent: 'feito' }));
  } catch (e) { st.className = 'msg err'; st.textContent = 'Sem sinal: tente de novo daqui a pouco.'; b.disabled = false; }
});
document.addEventListener('click', async ev => {   // delegado: o bloco é redesenhado junto com a aba Hoje
    const b = ev.target.closest && ev.target.closest('#b-corrida'); if (!b) return;
    const iso = isoLocal();
    const min = parseInt(prompt('Quantos minutos de corrida leve? (20 a 30)', '25'), 10); if (!min) return;
    const st = document.getElementById('b-status'); b.disabled = true; st.textContent = 'Enviando…';
    try { await enviarRegistro({ tipo: 'treino', data: iso, texto: `Rodada bônus: corrida leve de manutenção, ${min} min em zona 2.` }); st.textContent = 'Registrado. Bom trabalho.'; }
    catch (e) { st.textContent = 'Sem sinal: tente de novo daqui a pouco.'; b.disabled = false; }
});

// ───────── o que foi feito da última vez ─────────
function historicoDeCargas() {
  const todas = {};
  const add = (id, data, s, lv) => { const l = todas[id] = todas[id] || []; if (!l.some(x => x.data === data && JSON.stringify(x.s) === JSON.stringify(s))) l.push({ data, s, lv: !!lv }); };
  const loc = lsGet(T_HIST, {});
  Object.keys(loc).forEach(id => { (Array.isArray(loc[id]) ? loc[id] : [loc[id]]).forEach(x => x && add(id, x.data, x.s, x.lv)); });
  (typeof REGISTROS !== 'undefined' ? REGISTROS : []).filter(r => r.tipo === 'Treino').forEach(r => {
    const m = String(r.texto || '').match(/#sets (\{.*\})\s*$/); if (!m) return;
    try { const j = JSON.parse(m[1]); (j.ex || []).forEach(e => add(e.i, r.data, e.s, j.lv)); } catch (e) {}
  });
  const h = {};
  Object.keys(todas).forEach(id => { const l = todas[id].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0)); h[id] = { data: l[0].data, s: l[0].s, lv: l[0].lv, todas: l }; });
  return h;
}

// ───────── estado do treino em andamento (fica no aparelho) ─────────
function mapaEstados() {
  const m = lsGet(T_ESTADO, {});
  if (m && m.data && m.s) return { [m.data]: m };   // formato antigo: um dia só
  return m && typeof m === 'object' ? m : {};
}
function gravarEstado(st) { const m = mapaEstados(); m[st.chave || st.data] = st; const corte = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10); Object.keys(m).forEach(k => { if (k < corte) delete m[k]; }); lsSet(T_ESTADO, m); }
function limparEstado(iso) { const m = mapaEstados(); delete m[iso]; lsSet(T_ESTADO, m); }
function estadoDe(iso, chave) {
  chave = chave || iso;
  let st = mapaEstados()[chave];
  if (!st || typeof st.s !== 'object' || !st.s || Array.isArray(st.s)) st = { data: iso, inicio: null, ef: null, nota: '', s: {}, troca: {} };
  if (!st.troca || typeof st.troca !== 'object') st.troca = {};
  st.data = iso; st.chave = chave; gravarEstado(st);
  return st;
}
// Flexibilidade (Fabio, 27/10): séries a mais por exercício e exercícios extras entram no treino do dia e no registro.
const NOME_GRUPO = { peito_empurrar: 'Peito', ombro_empurrar: 'Ombro (empurrar)', costas: 'Costas', biceps: 'Bíceps', triceps: 'Tríceps', ombro_lateral: 'Ombro lateral', core_tempo: 'Core (tempo)', core_dinamico: 'Abdominal', quadriceps_composto: 'Pernas (composto)', extensao: 'Extensora', posterior: 'Posterior', unilateral: 'Unilateral', panturrilha: 'Panturrilha', gluteo: 'Glúteo' };
function comExtras(sessao, st) { return { ...sessao, exercicios: sessao.exercicios.concat(st.extras || []) }; }
function novoExtra(op, grupo, sessao) {
  const usados = new Set(sessao.exercicios.map(e => e.id)); let id = op.id, n = 2;
  while (usados.has(id)) id = op.id + '_' + n++;
  const tempo = grupo === 'core_tempo';
  return { id, nome: op.nome, series: 3, reps: tempo ? '' : '10', kg: null, descanso_s: 75, halter: !!op.halter, grupo: grupo || undefined, extra: true, ...(tempo ? { tipo: 'tempo', alvo_s: 40 } : {}) };
}
// o exercício de fato feito: o do plano ou o que ele trocou por equivalente
const efetivo = (e, st) => st.troca[e.id] || { id: e.id, nome: e.nome, halter: !!e.halter };
function acharGrupo(e) {
  if (e.grupo) return e.grupo;
  const gs = (TREINOS && TREINOS.biblioteca && TREINOS.biblioteca.grupos) || {};
  return Object.keys(gs).find(g => gs[g].chaves.some(c => e.id.indexOf(c) >= 0)) || null;
}
function dicaDe(e, ef) {
  if (ef.id === e.id && e.dica) return e.dica;
  const ops = Object.values((TREINOS && TREINOS.biblioteca && TREINOS.biblioteca.grupos) || {}).flatMap(g => g.opcoes);
  const op = ops.find(o => o.id === ef.id) || ops.find(o => ef.id.indexOf(o.id) === 0 || o.id.indexOf(ef.id) === 0);
  return (op && op.dica) || '';
}
const linkVideo = nome => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(semEmoji(nome) + ' execução correta');
function opcoesDe(e) { const g = acharGrupo(e), gs = (TREINOS && TREINOS.biblioteca && TREINOS.biblioteca.grupos) || {}; return g && gs[g] ? gs[g].opcoes : []; }
// Progressão de carga (carga, 11/10): sobe só quando TODAS valem: (1) as duas últimas sessões PESADAS desse exercício
// fecharam o topo das repetições em todas as séries, com o esforço registrado em todas e folga na última; (2) nenhuma série
// foi ao limite; (3) a semana não está em faixa média (o painel libera a carga); (4) não subiu nos últimos 7 dias;
// (5) é dia de hoje (nunca pré-preenche aumento de dia futuro); (6) se TRAVAR_UNILATERAL estiver ligada, unilaterais e
// panturrilha não sobem sozinhos (hoje desligada: tornozelo liberado). Treino leve não conta. Máximo 2 aumentos por treino.
// Salto: halter +1 kg (+2 a partir de 20 kg); pernas e demais +2,5 kg.
// Em 11/10 o Fabio informou que o tornozelo está liberado: a trava dos unilaterais está desligada. Ligue de novo se houver dor.
const TRAVAR_UNILATERAL = false;
const TRAVADOS = /bulgaro|afundo|passada|step_up|unilateral|panturrilha/;
const kgFmt = v => fNum(v, v % 1 ? 1 : 0);
function ultimaCarga(sess) { const f = (sess.s || []).filter(x => x && x[0] != null); return f.length ? f[f.length - 1][0] : null; }
function avaliarSessao(s, topo) { const f = (s || []).filter(x => x && x[1] != null); return { bateu: !!topo && f.length > 0 && f.every(x => +x[1] >= topo), rirTodas: f.length > 0 && f.every(x => x[2]), folga: f.length > 0 && f[f.length - 1][2] === 'f', limite: f.some(x => x[2] === 'l') }; }
function progressao(e, ef, h, iso) {
  if (!h || !h.todas || !h.todas.length) return null;
  const antes = h.todas.filter(x => x.data < iso);   // a sessão de hoje (reaberta) não conta como base nem como evidência
  if (!antes.length) return null;
  const pesadas = antes.filter(x => !x.lv), ref = pesadas[0] || antes[0], base = ultimaCarga(ref);
  if (base == null || base === 0) return null;
  const mantem = motivo => ({ kg: base, motivo, subiu: false });
  if (iso !== isoLocal()) return mantem('');
  if (TRAVAR_UNILATERAL && TRAVADOS.test(ef.id)) return mantem('Carga mantida: exercício unilateral ou de panturrilha não sobe sozinho; essa decisão é sua e do fisio.');
  if (!pesadas.length) return mantem('Carga mantida: a última carga vem de um treino leve e ainda não há treino pesado desse exercício (o leve não conta para subir). Ajuste pela sensação.');
  const topo = topoReps(e.reps), av = pesadas.slice(0, 1).map(x => avaliarSessao(x.s, topo));   // regra simples: a última sessão pesada basta
  if (av.some(x => x.limite)) return mantem('Carga mantida: em uma das últimas sessões alguma série foi ao limite.');
  const sem = typeof avaliarSemaforo === 'function' ? avaliarSemaforo() : { liberaCarga: true };
  if (!sem.liberaCarga) return mantem(sem.estado === 'sem_dado' ? 'Carga mantida: o painel ainda não tem os dados do relógio de hoje.' : 'Carga mantida: o semáforo de hoje não está em Pode, então a carga não sobe hoje.');
  if (!av.every(x => x.bateu && x.rirTodas && x.folga)) return mantem(av[0].bateu && !av[0].rirTodas ? 'Carga mantida: registre "sobrou fôlego" em todas as séries para a carga poder subir.' : 'Carga mantida: ainda não fechou todas as repetições, com folga, em todas as séries.');
  const salto = ef.halter ? (base >= 20 ? 2 : 1) : 2.5;
  return { kg: base + salto, subiu: true, salto, motivo: `Subiu de ${kgFmt(base)} para ${kgFmt(base + salto)} kg: na última vez você fechou ${topo} repetições com folga em todas as séries.` };
}
function reduzirSeSegurar(kg, ef, st) {
  if (kg === '' || kg == null || st.data !== isoLocal() || typeof avaliarSemaforo !== 'function' || avaliarSemaforo().estado !== 'segurar') return kg;
  const passo = ef.halter ? 1 : 2.5; return Math.round(kg * 0.9 / passo) * passo;
}
function kgInicial(e, ef, i, hist, st) {
  if (ef.id === e.id && e.kg != null) return reduzirSeSegurar(e.kg, ef, st);
  if (ef.id === e.id && st.prog && st.prog[e.id]) return reduzirSeSegurar(st.prog[e.id].kg, ef, st);
  const u = hist[ef.id], dele = u && (u.s[i] || u.s[u.s.length - 1]);
  return dele && dele[0] != null ? reduzirSeSegurar(dele[0], ef, st) : '';
}
function preencher(sessao, st, hist) {
  if (!st.prog) { st.prog = {}; let aumentos = 0;
    sessao.exercicios.forEach(e => { if (e.kg != null || e.tipo === 'tempo') return; const ef = efetivo(e, st), pr = progressao(e, ef, hist[ef.id], st.data); if (!pr) return;
      if (pr.subiu && ++aumentos > 2) { pr.kg = pr.kg - pr.salto; pr.subiu = false; pr.motivo = 'Carga mantida: no máximo 2 aumentos por treino.'; }
      st.prog[e.id] = pr; }); }
  sessao.exercicios.forEach(e => {
    const novo = !st.s[e.id], l = st.s[e.id] = st.s[e.id] || [];
    for (let i = 0; novo && i < e.series; i++) {   // só monta na primeira vez: depois, + Série e − Série mandam
      if (l[i]) continue;
      if (e.tipo === 'tempo') { l[i] = { seg: e.alvo_s || 30, ok: false }; continue; }
      l[i] = { kg: kgInicial(e, efetivo(e, st), i, hist, st), reps: topoReps(e.reps), ok: false, auto: true };   // auto = carga sugerida, ainda não digitada
    }
  });
  gravarEstado(st);
}

// ───────── a tela ─────────
function renderTreino(id) {
  pararRelogios();
  const partes = id.split('/'), pedida = partes[1], iso = pedida || isoLocal(), dataOk = /^\d{4}-\d{2}-\d{2}$/.test(iso), v = partes[2] || '';
  let sessao = dataOk ? sessaoDe(iso, v) : null;
  const base = dataOk && TREINOS && TREINOS.sessoes && TREINOS.sessoes[iso];
  const outra = !base || !base.casa || v === 'bonus' ? '' : (v === 'casa'
    ? `<a class="linha" href="#treino/${iso}" style="margin-top:12px;border-color:#fff;color:#fff"><span class="corpo">Voltar para a versão da academia</span></a>`
    : `<a class="linha" href="#treino/${iso}/casa" style="margin-top:12px;border-color:#fff;color:#fff"><span class="corpo">Treinar em casa (TRX + peso do corpo)<small style="color:#fff;opacity:.8">${esc(base.casa.exercicios.length)} exercícios, mesmo objetivo</small></span></a>`);
  const topo = `<div class="campo tinta"><div class="dentro" style="padding-bottom:22px">
    <div class="topo"><div class="rot">Treino${dataOk ? ' · ' + esc(iso.slice(8, 10) + '/' + iso.slice(5, 7)) : ''}</div><div class="selo" id="t-clock" role="timer" aria-label="tempo de treino">0:00</div></div>
    <h1 class="titulo longo">${sessao ? esc(sessao.titulo) : 'Sem treino com séries hoje'}</h1>
    ${sessao && sessao.regra ? `<div class="sub">${esc(sessao.regra)}</div>` : ''}${outra}</div></div>`;
  if (!sessao) {
    const prox = DATA.dias.filter(d => exerciciosDoPlano(d).length).map(d => `<a class="linha" href="#treino/${new Date().getFullYear()}-${d.data.slice(3, 5)}-${d.data.slice(0, 2)}"><span class="corpo">${esc(d.nome)} · ${esc(d.data)}<small>${esc(partirFoco((d.treino && d.treino.foco) || '').titulo)}</small></span></a>`).join('');
    $("view").innerHTML = topo + `<section class="bloco"><div class="cab"><h2>Escolha um treino</h2></div>${prox || '<div class="par">Nenhum dia da semana publicada tem exercícios com séries.</div>'}</section>`;
    return;
  }
  const st = estadoDe(iso, v ? iso + ':' + v : iso), hist = historicoDeCargas();
  sessao = comExtras(sessao, st); sessao.rota = 'treino/' + iso + (v ? '/' + v : '');
  preencher(sessao, st, hist);
  const fila = lsGet(T_FILA, []);
  const alerta = typeof avisoDaSessao === 'function' ? avisoDaSessao(sessao) : null;
  let h = `<div id="t-bar" role="timer" aria-label="Situação do treino"><span id="t-bar-x"></span><b id="t-bar-t">0:00</b></div>` + topo + (alerta ? `<div class="aviso" style="margin:0;padding:14px 22px;border:0;background:var(--sol);color:var(--tinta);font-weight:700" role="status">${esc(alerta)}</div>` : '') + `<div class="aviso" style="margin:0;padding:12px 22px;border:0;font-size:13px">${esc((TREINOS && TREINOS.biblioteca && TREINOS.biblioteca.aviso_dicas) || '')}</div>`;
  h += sessao.exercicios.map((e, xi) => {
    const ef = efetivo(e, st), ult = hist[ef.id], tempo = e.tipo === 'tempo', opcoes = opcoesDe(e), trocado = ef.id !== e.id;
    const lastTxt = ult ? 'Última vez (' + isoDDMM(ult.data) + '): ' + ult.s.map(s => tempo ? s[0] + ' s' : (s[0] != null ? fNum(s[0], s[0] % 1 ? 1 : 0) + ' kg × ' + s[1] : s[1])).join(', ') : '';
    return `<section class="bloco"><div class="cab"><h2 style="font-size:20px">${esc(ef.nome)}</h2><small>${e.extra ? 'extra · ' : ''}${st.s[e.id].length} × ${tempo ? (e.alvo_s || '') + ' s' : esc(e.reps)}${st.s[e.id].length !== e.series ? ' (plano: ' + e.series + ')' : ''} · descanso ${e.descanso_s || 60} s</small></div>
      ${(!trocado && e.kg == null && st.prog && st.prog[e.id] && st.prog[e.id].motivo) ? `<div class="alim-leitura" style="padding-bottom:4px">${esc(st.prog[e.id].motivo)}</div>` : ''}
      ${trocado ? `<div class="alim-leitura" style="padding-bottom:4px">No lugar de ${esc(e.nome)}. ${ef.halter ? 'A carga é por halter (cada mão). ' : ''}${ult ? '' : 'Sem histórico nesse exercício: use uma carga com a qual você faria uns 16 repetições.'}</div>` : (e.nota ? `<div class="alim-leitura" style="padding-bottom:4px">${esc(e.nota)}</div>` : '')}
      <button type="button" class="trocar" data-x="${xi}" aria-expanded="false">Aparelho ocupado? Trocar exercício</button>
      <div class="opcoes" id="op-${xi}" hidden>${opcoes.filter(op => op.id !== ef.id && op.id !== e.id).map(op => `<button type="button" data-x="${xi}" data-op="${esc(op.id)}">${esc(op.nome)}${op.halter ? ' · por halter' : ''}</button>`).join('')}${trocado ? `<button type="button" data-x="${xi}" data-op="${esc(e.id)}">Voltar para ${esc(e.nome)}</button>` : ''}<button type="button" data-x="${xi}" data-op="__outro">Outro (digitar o nome)</button></div>
      <details class="exec"><summary>Ver execução</summary><div class="miolo">${dicaDe(e, ef) ? `<div class="par">${esc(dicaDe(e, ef))}</div>` : ''}
        <div class="par"><a href="${linkVideo(ef.nome)}" target="_blank" rel="noopener">Abrir vídeo de ${esc(ef.nome)} no YouTube</a></div>
        </div></details>
      ${lastTxt ? `<div class="ml" style="font-size:13px;color:var(--sec);padding:6px 0 2px">${esc(lastTxt)}</div>` : ''}
      ${st.s[e.id].map((s, i) => `<div class="serie" data-x="${xi}" data-i="${i}"><span class="sn">${i + 1}</span>
        ${tempo ? `<label class="cp"><input class="n" inputmode="numeric" data-c="seg" value="${esc(s.seg)}" aria-label="segundos da série ${i + 1}"><small>s</small></label><span></span>`
          : `<label class="cp"><input class="n" inputmode="decimal" data-c="kg" value="${esc(s.kg)}" aria-label="carga da série ${i + 1}"><small>${ef.halter ? 'kg/halter' : 'kg'}</small></label>
             <label class="cp"><input class="n" inputmode="numeric" data-c="reps" value="${esc(s.reps)}" aria-label="repetições da série ${i + 1}"><small>reps</small></label>`}
        <button type="button" class="okb ${s.ok ? 'on' : ''}" aria-pressed="${s.ok}" aria-label="${tempo && !s.ok ? 'cronometrar a série ' + (i + 1) : 'série ' + (i + 1) + ' feita'}">${s.ok ? 'Feita' : (tempo ? 'Cronometrar' : 'Fazer')}</button></div>${s.ok && e.tipo !== 'tempo' ? rirHtml(s) : ''}`).join('')}
      <div class="flex-serie"><button type="button" data-mais="${xi}">+ Série</button>${st.s[e.id].length > 1 && !st.s[e.id][st.s[e.id].length - 1].ok ? `<button type="button" data-menos="${xi}">− Série</button>` : ''}${e.extra && !st.s[e.id].some(x => x.ok) ? `<button type="button" data-tira="${xi}">Tirar exercício</button>` : ''}</div>
    </section>`;
  }).join('');
  const gs = (TREINOS && TREINOS.biblioteca && TREINOS.biblioteca.grupos) || {};
  h += `<section class="bloco"><button type="button" class="trocar" id="t-add" aria-expanded="false">+ Adicionar exercício</button>
    <div id="t-addbox" hidden>${Object.keys(gs).map(g => `<div class="ml" style="font-size:13px;font-weight:700;color:var(--sec);padding:10px 0 0">${esc(NOME_GRUPO[g] || g)}</div><div class="opcoes">${gs[g].opcoes.map(op => `<button type="button" data-addg="${esc(g)}" data-addop="${esc(op.id)}">${esc(op.nome)}${op.halter ? ' · por halter' : ''}</button>`).join('')}</div>`).join('')}
      <div class="opcoes"><button type="button" data-addop="__outro">Outro (digitar o nome)</button></div></div></section>`;
  h += `<section class="bloco"><div class="cab"><h2>Como foi</h2><small>opcional</small></div>
    <div class="seg" style="margin-top:12px;grid-template-columns:repeat(3,minmax(0,1fr))">${[['leve', 'Leve'], ['ok', 'No ponto'], ['pesado', 'Pesado']].map(([k, r]) => `<button type="button" data-ef="${k}" class="${st.ef === k ? 'on' : ''}">${r}</button>`).join('')}</div>
    <textarea id="t-nota" aria-label="Nota do treino: dor, tornozelo, algo que mudou" rows="2" placeholder="Dor, tornozelo, algo que mudou no treino" style="width:100%;margin-top:12px;font:inherit;padding:10px;border:2px solid var(--tinta);background:#fff">${esc(st.nota || '')}</textarea>
    <button type="button" id="t-fim" class="linha" style="margin-top:14px;justify-content:center;font-weight:800;background:var(--tinta);color:#fff;border:0">Terminar treino</button>
    <div id="t-status" class="msg" role="status" aria-live="polite" style="margin-top:10px"></div>
    ${fila.length ? `<div class="aviso">${fila.length} treino(s) guardado(s) neste aparelho, aguardando sinal para enviar.</div>` : ''}
    <div class="aviso">As cargas ficam neste aparelho enquanto o treino está aberto. Ao terminar, o resumo vai para o seu diário e vira o ponto de partida do próximo treino.</div></section>`;
  $("view").innerHTML = h;
  ligarTreino(sessao, st, iso);
  T_CTX = { sessao, st };
  tictac(st);
}

function barraDescanso() {
  let b = document.getElementById('t-desc');
  if (!b) { b = document.createElement('div'); b.id = 't-desc'; b.hidden = true; document.body.appendChild(b); }
  return b;
}
let T_LOCK = null;
async function manterTela() { try { if ('wakeLock' in navigator && !T_LOCK) { T_LOCK = await navigator.wakeLock.request('screen'); T_LOCK.addEventListener('release', () => { T_LOCK = null; }); } } catch (e) {} }
function soltarTela() { try { if (T_LOCK) T_LOCK.release(); } catch (e) {} T_LOCK = null; }
document.addEventListener('visibilitychange', () => { if (!document.hidden && /^#treino/.test(location.hash)) manterTela(); });
function pararRelogios() { if (T_TICK) clearInterval(T_TICK); T_TICK = null; T_FIM_DESCANSO = 0; const b = barraDescanso(); b.hidden = true; b.dataset.ativo = ''; }
function tictac(st) {
  if (T_TICK) clearInterval(T_TICK);
  const rel = () => {
    const tempoTxt = st.inicio ? relogio(Math.floor((Date.now() - st.inicio) / 1000)) : '0:00';
    const c = document.getElementById('t-clock'); if (c) c.textContent = tempoTxt;
    const bt = document.getElementById('t-bar-t'); if (bt) bt.textContent = tempoTxt;
    const bx = document.getElementById('t-bar-x');
    if (bx && T_CTX) {   // barra fixa no topo: o que falta, sem rolar a tela entre as séries
      let txt = 'Tudo feito: toque em Terminar treino';
      for (const e of T_CTX.sessao.exercicios) { const l = T_CTX.st.s[e.id] || [], i = l.findIndex(x => !x.ok); if (i >= 0) { txt = efetivo(e, T_CTX.st).nome + ' · série ' + (i + 1) + ' de ' + l.length; break; } }
      if (bx.textContent !== txt) bx.textContent = txt;
    }
    const b = barraDescanso();
    if (T_FIM_DESCANSO) {
      const falta = Math.ceil((T_FIM_DESCANSO - Date.now()) / 1000);
      if (falta <= 0) { T_FIM_DESCANSO = 0; b.dataset.ativo = ''; b.hidden = false; b.setAttribute('role', 'status'); b.innerHTML = '<span>Descanso acabou</span><button type="button" id="t-ok">Fechar</button>'; try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} document.getElementById('t-ok').onclick = () => { b.hidden = true; }; }
      else {
        b.hidden = false;
        if (b.dataset.ativo !== '1') {   // monta uma vez; depois só o relógio muda
          b.dataset.ativo = '1'; b.setAttribute('role', 'timer');
          b.innerHTML = `<span>Descanso <b id="t-rest"></b></span><span><button type="button" id="t-mais">+15 s</button> <button type="button" id="t-pula">Pular</button></span>`;
          document.getElementById('t-mais').onclick = () => { T_FIM_DESCANSO += 15000; }; document.getElementById('t-pula').onclick = () => { T_FIM_DESCANSO = 0; b.hidden = true; b.dataset.ativo = ''; };
        }
        const r = document.getElementById('t-rest'); if (r) r.textContent = relogio(falta);
      }
    }
  };
  rel(); T_TICK = setInterval(rel, 500);
}
window.addEventListener('hashchange', () => { if (!/^#treino/.test(location.hash)) { pararRelogios(); soltarTela(); } });

function ligarTreino(sessao, st, iso) {
  const salvar = () => gravarEstado(st);
  document.querySelectorAll('.serie').forEach(row => {
    const e = sessao.exercicios[+row.dataset.x], s = st.s[e.id][+row.dataset.i];
    row.querySelectorAll('input.n').forEach(inp => inp.addEventListener('input', () => {
      s[inp.dataset.c] = inp.dataset.c === 'kg' ? inp.value : (numT(inp.value) ?? ''); if (inp.dataset.c === 'kg') delete s.auto; salvar();
      if (inp.dataset.c === 'kg') conferirCarga(row, st.s[e.id], +row.dataset.i);
    }));
    row.querySelector('.okb').addEventListener('click', ev => {
      if (e.tipo === 'tempo' && !s.ok) { cronometrar(e, +row.dataset.i); return; }   // tempo só vale cronometrado
      s.ok = !s.ok; if (s.ok && !st.inicio) st.inicio = Date.now(); if (s.ok) manterTela(); salvar();
      if (s.ok) {   // virada: a boia afunda com mola e um clarão de água passa pela linha (palco.css)
        const b = ev.currentTarget; b.classList.remove('mola'); void b.offsetWidth; b.classList.add('mola');
        row.classList.add('agua-viva'); setTimeout(() => row.classList.remove('agua-viva'), 750);
        if (typeof pVibrar === 'function') pVibrar(20);
        if (e.tipo !== 'tempo') conferirRecorde(e, st, iso, numT(s.kg), numT(s.reps), null);
      }
      ev.currentTarget.classList.toggle('on', s.ok); ev.currentTarget.textContent = s.ok ? 'Feita' : 'Fazer'; ev.currentTarget.setAttribute('aria-pressed', s.ok);
      const seguinte = row.nextElementSibling, ja = seguinte && seguinte.classList.contains('rir');
      if (s.ok && e.tipo !== 'tempo' && !ja) row.insertAdjacentHTML('afterend', rirHtml(s)); else if (!s.ok) { delete s.rir; if (ja) seguinte.remove(); salvar(); }
      if (s.ok) T_FIM_DESCANSO = Date.now() + (e.descanso_s || 60) * 1000; else { T_FIM_DESCANSO = 0; barraDescanso().hidden = true; }
    });
  });
  $("view").onclick = ev => {
    const b = ev.target.closest && ev.target.closest('.rir button'); if (!b) return;
    let row = b.parentElement.previousElementSibling; while (row && !row.classList.contains('serie')) row = row.previousElementSibling; if (!row) return;
    const e = sessao.exercicios[+row.dataset.x], s = st.s[e.id][+row.dataset.i];
    s.rir = s.rir === b.dataset.r ? undefined : b.dataset.r; salvar();
    b.parentElement.querySelectorAll('button').forEach(x => { x.classList.toggle('on', x.dataset.r === s.rir); x.setAttribute('aria-pressed', x.dataset.r === s.rir); });
  };
  document.querySelectorAll('.trocar').forEach(b => b.addEventListener('click', () => { const box = document.getElementById('op-' + b.dataset.x); box.hidden = !box.hidden; b.setAttribute('aria-expanded', !box.hidden); }));
  document.querySelectorAll('.opcoes button[data-op]').forEach(b => b.addEventListener('click', () => {
    const e = sessao.exercicios[+b.dataset.x], hist = historicoDeCargas();
    let op = b.dataset.op === '__outro' ? null : (opcoesDe(e).find(x => x.id === b.dataset.op) || (b.dataset.op === e.id ? { id: e.id, nome: e.nome, halter: !!e.halter } : null));
    if (b.dataset.op === '__outro') { const nome = (prompt('Qual exercício você fez no lugar?') || '').trim(); if (!nome) return; op = { id: 'x_' + slugT(nome), nome, halter: /halter/i.test(nome) }; }
    if (!op) return;
    if (op.id === e.id) delete st.troca[e.id]; else st.troca[e.id] = { id: op.id, nome: op.nome, halter: !!op.halter };
    const ef = efetivo(e, st);
    st.s[e.id].forEach((s, i) => { if (e.tipo !== 'tempo' && !s.ok && (s.kg === '' || s.kg == null || s.auto)) { s.kg = kgInicial(e, ef, i, hist, st); s.auto = true; } });
    salvar(); renderTreino(sessao.rota);
  }));
  const redesenhar = () => { salvar(); renderTreino(sessao.rota); };
  document.querySelectorAll('[data-mais]').forEach(b => b.addEventListener('click', () => {
    const e = sessao.exercicios[+b.dataset.mais], l = st.s[e.id], u = l[l.length - 1] || {};
    l.push(e.tipo === 'tempo' ? { seg: u.seg || e.alvo_s || 30, ok: false } : { kg: u.kg ?? '', reps: u.reps ?? topoReps(e.reps), ok: false }); redesenhar();
  }));
  document.querySelectorAll('[data-menos]').forEach(b => b.addEventListener('click', () => {
    const l = st.s[sessao.exercicios[+b.dataset.menos].id]; if (l.length > 1 && !l[l.length - 1].ok) { l.pop(); redesenhar(); }
  }));
  document.querySelectorAll('[data-tira]').forEach(b => b.addEventListener('click', () => {
    const e = sessao.exercicios[+b.dataset.tira]; st.extras = (st.extras || []).filter(x => x.id !== e.id); delete st.s[e.id]; redesenhar();
  }));
  const addB = document.getElementById('t-add');
  if (addB) addB.addEventListener('click', () => { const box = document.getElementById('t-addbox'); box.hidden = !box.hidden; addB.setAttribute('aria-expanded', !box.hidden); });
  document.querySelectorAll('[data-addop]').forEach(b => b.addEventListener('click', () => {
    let op, g = b.dataset.addg || null;
    if (b.dataset.addop === '__outro') { const nome = (prompt('Qual exercício você vai fazer?') || '').trim(); if (!nome) return; op = { id: 'x_' + slugT(nome), nome, halter: /halter/i.test(nome) }; }
    else op = ((TREINOS.biblioteca.grupos[g] || {}).opcoes || []).find(x => x.id === b.dataset.addop);
    if (!op) return;
    st.extras = (st.extras || []).concat([novoExtra(op, g, sessao)]); redesenhar();
  }));
  function cronometrar(e, i) {
    const s = st.s[e.id][i];
    const alvo = numT(s.seg) || e.alvo_s || 30, lados = /cada/i.test(String(e.reps || ''));
    folego(efetivo(e, st).nome, alvo, lados, seg => {
      s.seg = seg; s.ok = true; if (!st.inicio) st.inicio = Date.now(); salvar();
      conferirRecorde(e, st, iso, null, null, seg);
      renderTreino(sessao.rota); T_FIM_DESCANSO = Date.now() + (e.descanso_s || 45) * 1000;   // depois: o redesenho zera o descanso
    });
  }
  document.querySelectorAll('[data-ef]').forEach(b => b.addEventListener('click', () => { st.ef = st.ef === b.dataset.ef ? null : b.dataset.ef; salvar(); document.querySelectorAll('[data-ef]').forEach(x => x.classList.toggle('on', x.dataset.ef === st.ef)); }));
  document.getElementById('t-nota').addEventListener('input', ev => { st.nota = ev.target.value; salvar(); });
  document.getElementById('t-fim').addEventListener('click', ev => terminarTreino(sessao, st, iso, ev.currentTarget));
}

// Recorde (palco.js): a primeira série de cada exercício que passa o melhor que você já fez antes de hoje vira palco.
function conferirRecorde(e, st, iso, kg, reps, seg) {
  if (typeof recordeDe !== 'function') return;
  const ef = efetivo(e, st); st.recordes = st.recordes || [];
  if (st.recordes.includes(ef.id)) return;
  const rec = recordeDe(ef.id, kg, reps, seg, iso, +(String(e.reps || '').match(/\d+/) || [1])[0]);
  if (!rec) return;
  st.recordes.push(ef.id); gravarEstado(st); palcoRecorde(ef.nome, rec);
}

// ───────── cronômetro dos exercícios de tempo ─────────
// Fabio (31/10): a prancha dependia de um cronômetro que não existia. Tela cheia, legível do chão e de lado:
// número enorme e a água subindo (a visão periférica lê o nível sem focar), 3-2-1 antes, voz e bipe nos últimos 3 s.
// "cada lado" vira duas fases com 5 s para trocar. "Terminei aqui" registra o tempo que aguentou (o menor dos lados).
let T_AUDIO = null, T_FOLEGO = null;
function tFalar(t) { try { const u = new SpeechSynthesisUtterance(t); u.lang = 'pt-BR'; u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }
function tBip(f, ms) { try { T_AUDIO = T_AUDIO || new (window.AudioContext || window.webkitAudioContext)(); const o = T_AUDIO.createOscillator(), g = T_AUDIO.createGain(); o.frequency.value = f || 880; g.gain.value = 0.18; o.connect(g); g.connect(T_AUDIO.destination); o.start(); o.stop(T_AUDIO.currentTime + (ms || 140) / 1000); } catch (e) {} }
function tVibrar(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
function folego(nome, alvo, lados, aoFim) {
  if (T_FOLEGO) clearInterval(T_FOLEGO);
  tBip(1, 1);   // o primeiro som precisa nascer do toque (iOS); este é inaudível
  const fases = [{ t: 'prep', s: 3, rot: lados ? 'Lado esquerdo' : 'Prepare-se' }, { t: 'segura', s: alvo, rot: lados ? 'Lado esquerdo' : 'Segure' }]
    .concat(lados ? [{ t: 'troca', s: 5, rot: 'Troque de lado' }, { t: 'segura', s: alvo, rot: 'Lado direito' }] : []);
  let ov = document.getElementById('t-folego');
  if (!ov) { ov = document.createElement('div'); ov.id = 't-folego'; document.body.appendChild(ov); }
  ov.innerHTML = `<canvas class="f-mar" aria-hidden="true"></canvas>
    <div class="f-topo"><span>${esc(nome)}</span><span class="f-fase"></span></div>
    <div class="f-num" role="timer" aria-live="off"></div><div class="f-sub"></div>
    <div class="f-bts"><button type="button" class="f-fim">Terminei aqui</button><button type="button" class="f-cancela">Cancelar</button></div>`;
  ov.hidden = false; manterTela();
  const $f = c => ov.querySelector(c), num = $f('.f-num'), fase = $f('.f-fase'), sub = $f('.f-sub');
  const mar = typeof pMar === 'function' ? pMar($f('.f-mar'), { nivel: 0.04 }) : null;
  const feitos = []; let k = -1, fimFase = 0, ultimo = null;
  const fechar = () => { clearInterval(T_FOLEGO); T_FOLEGO = null; if (mar) mar.parar(); ov.hidden = true; ov.className = ''; };
  const proxima = () => {
    k++;
    if (k >= fases.length) {   // a água chega no alto e espirra; "Feito" fica 1 s na tela
      clearInterval(T_FOLEGO); T_FOLEGO = null; tBip(1320, 260); tVibrar([120, 60, 220]); tFalar('Feito');
      ov.className = 'f-fim'; num.textContent = 'Feito'; sub.textContent = ''; fase.textContent = '';
      if (mar) { mar.alvo = 0.86; mar.alvoCor = [11, 94, 124]; for (let j = 0; j < 9; j++) mar.impulso(j / 8, -16); mar.respingo(0.5, 40, 11); }
      setTimeout(() => { fechar(); aoFim(Math.min(...feitos)); }, 1100); return;
    }
    const f = fases[k]; fimFase = Date.now() + f.s * 1000; ultimo = null;
    ov.className = 'f-' + f.t; fase.textContent = f.rot;
    if (f.t === 'segura') { tFalar(lados && k > 1 ? 'Lado direito. Vai.' : 'Vai.'); tVibrar(80); if (mar) [0.15, 0.5, 0.85].forEach(x => mar.impulso(x, -7)); }
    if (f.t === 'troca') { tFalar('Troque de lado'); tVibrar([60, 60, 60]); }
  };
  const tique = () => {
    const f = fases[k], resta = Math.max(0, fimFase - Date.now()), sR = Math.ceil(resta / 1000), feito = 1 - resta / (f.s * 1000);
    num.textContent = f.t === 'segura' ? String(sR) : String(sR);
    sub.textContent = f.t === 'segura' ? `de ${f.s} s` : (f.t === 'prep' ? 'começa em' : 'troque e posicione');
    const final3 = f.t === 'segura' && sR <= 3;
    if (mar) { mar.alvo = 0.04 + 0.82 * (f.t === 'segura' ? feito : f.t === 'troca' ? 1 - feito : 0); mar.alvoCor = final3 ? [255, 180, 143] : [11, 94, 124]; }
    ov.classList.toggle('f-final', final3);
    if (sR !== ultimo) {
      if (sR <= 3 && sR > 0) { tBip(f.t === 'segura' ? 990 : 660, 120); if (mar && f.t === 'segura') mar.impulso(Math.random(), -10); }
      if (mar && f.t === 'troca') mar.impulso(sR % 2 ? 0.03 : 0.97, -12);
      if (f.t === 'segura' && sR === 10 && f.s >= 20) tFalar('Dez segundos');
      ultimo = sR;
    }
    if (resta <= 0) { if (f.t === 'segura') feitos.push(f.s); proxima(); }
  };
  const saiu = () => { if (document.hidden && fases[k] && fases[k].t === 'segura' && T_FOLEGO) { fechar(); document.removeEventListener('visibilitychange', saiu); tFalar('Cronômetro interrompido'); alert('O app saiu da tela durante a prancha, então o cronômetro foi cancelado. Faça de novo ou use Terminei aqui com o tempo certo.'); } };
  document.addEventListener('visibilitychange', saiu);
  $f('.f-fim').onclick = () => {
    const f = fases[k];
    if (f && f.t === 'segura') feitos.push(Math.max(1, Math.round(f.s - (fimFase - Date.now()) / 1000)));
    if (!feitos.length) { fechar(); return; }
    fechar(); tVibrar(120); aoFim(Math.min(...feitos));
  };
  $f('.f-cancela').onclick = () => { fechar(); speechSynthesis && speechSynthesis.cancel && speechSynthesis.cancel(); };
  proxima(); tique(); T_FOLEGO = setInterval(tique, 100);
}

// ───────── gravar ─────────
function montarRegistro(sessao, st, iso) {
  const feitos = sessao.exercicios.map(e => ({ e, ss: (st.s[e.id] || []).filter(x => x.ok) })).filter(x => x.ss.length);
  if (!feitos.length) return null;
  for (const { e, ss } of feitos) { if (e.tipo === 'tempo') continue; const i = ss.findIndex(x => numT(x.kg) == null); if (i >= 0) return { erro: `${efetivo(e, st).nome}: a série ${i + 1} está sem carga. Preencha (0 para o peso do corpo) ou desfaça a série.` }; }
  const dur = st.inicio ? Math.max(1, Math.round((Date.now() - st.inicio) / 60000)) : null;
  const j = { v: 1, t: slugT(sessao.titulo), dur, ef: st.ef, lv: sessao.pesada === false ? 1 : undefined, ex: feitos.map(({ e, ss }) => { const f = efetivo(e, st), o = { i: f.id, s: ss.map(x => e.tipo === 'tempo' ? [x.seg] : (x.rir ? [numT(x.kg) ?? 0, x.reps, x.rir] : [numT(x.kg) ?? 0, x.reps])) }; if (f.id !== e.id) o.o = e.id; if (f.halter) o.h = 1; return o; }) };
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
  (p._j.ex || []).forEach(e => { const l = (Array.isArray(h[e.i]) ? h[e.i] : (h[e.i] ? [h[e.i]] : [])).filter(x => x.data !== p.data); l.push({ data: p.data, s: e.s, lv: !!p._j.lv }); h[e.i] = l.slice(-4); });
  lsSet(T_HIST, h);
}
async function terminarTreino(sessao, st, iso, btn) {
  const stat = document.getElementById('t-status'), p = montarRegistro(sessao, st, iso);
  if (st.enviado) return;   // segundo toque (ou volta à tela) não grava de novo
  if (!p) { stat.className = 'msg err'; stat.textContent = 'Marque ao menos uma série como feita.'; return; }
  if (p.erro) { stat.className = 'msg err'; stat.textContent = p.erro; return; }
  btn.disabled = true; stat.className = 'msg'; stat.textContent = 'Enviando…';
  guardarHistoricoLocal(p); st.enviado = true; gravarEstado(st);
  // o Hoje e a faixa de dias leem REGISTROS: sem isto o treino só aparecia como feito depois de recarregar o app
  try { REGISTROS.unshift({ id: 'local-' + Date.now(), data: iso, hora: null, tipo: 'Treino', refeicao: null, texto: p.texto, foto: false, fotos: 0, processado: false }); } catch (e) {}
  try { await enviarRegistro(p); stat.className = 'msg ok'; stat.textContent = 'Treino anotado no seu diário.'; }
  catch (e) { const f = lsGet(T_FILA, []); f.push({ ...p }); lsSet(T_FILA, f); stat.className = 'msg ok'; stat.textContent = 'Sem sinal: o treino ficou guardado neste aparelho e vai quando a rede voltar.'; }
  const series = sessao.exercicios.reduce((n, e) => n + (st.s[e.id] || []).filter(x => x.ok).length, 0), recs = (st.recordes || []).length;
  limparEstado(st.chave || iso); pararRelogios(); soltarTela();
  btn.textContent = 'Treino encerrado';
  // palco do fim (palco.js); o XP é o da sessão pelas regras da Campanha (força 100, rodada bônus 50)
  if (typeof palcoFim === 'function') palcoFim({ titulo: sessao.variante === 'bonus' ? 'Rodada bônus feita' : sessao.variante === 'rotina' ? 'Rotina de casa feita' : 'Treino feito',
    stats: [{ n: series, rot: 'séries' }, { n: (p._j && p._j.dur) || 0, rot: 'minutos' }, { n: recs, rot: recs === 1 ? 'recorde' : 'recordes', cor: 'var(--sol)' }],
    xp: sessao.variante === 'bonus' ? 50 : sessao.variante === 'rotina' ? 15 : 100, xpRot: sessao.variante === 'rotina' ? 'da missão paralela' : 'pela sessão' });
}
let T_ESVAZIANDO = false;
async function esvaziarFila() {
  if (T_ESVAZIANDO) return;
  let f = lsGet(T_FILA, []); if (!f.length || !navigator.onLine) return;
  T_ESVAZIANDO = true;
  try {
    for (const p of f) {   // tira cada item da fila assim que ele vai (antes só no fim: queda no meio reenviava tudo; o servidor também barra repetido)
      try { await enviarRegistro(p); lsSet(T_FILA, lsGet(T_FILA, []).filter(x => !(x.data === p.data && x.texto === p.texto))); } catch (e) { break; }
    }
  } finally { T_ESVAZIANDO = false; }
}
window.addEventListener('online', esvaziarFila);
esvaziarFila();

// Aviso de digitação: carga muito diferente da série vizinha costuma ser erro (56 em vez de 26). Só avisa, não bloqueia.
function conferirCarga(row, series, i) {
  const cur = numT(series[i].kg), vizinha = [series[i - 1], series[i + 1]].map(x => x && numT(x.kg)).find(v => v > 0);
  let av = row.nextElementSibling && row.nextElementSibling.classList.contains('alerta-carga') ? row.nextElementSibling : null;
  const suspeita = cur != null && vizinha && (cur > vizinha * 1.6 || cur < vizinha * 0.5);
  if (!suspeita) { if (av) av.remove(); return; }
  if (!av) { av = document.createElement('div'); av.className = 'alerta-carga'; row.after(av); }
  av.textContent = 'Confere? A série vizinha está em ' + String(vizinha).replace('.', ',') + ' kg e esta em ' + String(cur).replace('.', ',') + ' kg.';
}
