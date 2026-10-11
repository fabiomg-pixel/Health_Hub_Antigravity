// Corrida guiada (#corrida): fica aberta na tela, mostra a etapa, o que fazer e quanto falta,
// avisa por voz, vibração e bip. Os números vêm do protocolo da fase 1 (PROJETO_CHAT §15).
// Não mede nada: o relógio (Garmin) segue como registro; aqui é só o guia.

const C_PLANOS = {
  base: { nome: 'Base · 30 min', sub: 'Fase 1: constância, tudo fácil', etapas: [
    { n: 'Aquecimento', s: 180, v: '5,5 a 6 km/h', t: 'Caminhada rápida. Solte os ombros e respire fundo.', fc: 'FC abaixo de 120' },
    { n: 'Corrida fácil', s: 1440, v: '8 a 8,5 km/h', t: 'Ritmo de conversa. Passos curtos e rápidos: 84 a 86 por pé (cerca de 170 por minuto).', fc: 'FC até 150', marcas: 300 },
    { n: 'Desaquecimento', s: 180, v: '5 a 5,5 km/h', t: 'Caminhe até a respiração voltar ao normal.', fc: 'FC caindo' }] },
  curta: { nome: 'Curta · 20 min', sub: 'Dia de pouca energia ou semáforo amarelo', etapas: [
    { n: 'Aquecimento', s: 180, v: '5,5 a 6 km/h', t: 'Caminhada rápida.', fc: 'FC abaixo de 120' },
    { n: 'Corrida fácil', s: 840, v: '8 km/h', t: 'Mais devagar do que parece necessário. Passos curtos.', fc: 'FC até 145', marcas: 300 },
    { n: 'Desaquecimento', s: 180, v: '5 km/h', t: 'Caminhe até a respiração voltar ao normal.', fc: 'FC caindo' }] },
  qualidade: { nome: 'Qualidade · 4 × 4 min', sub: 'Fase 2: só depois da porteira (FC de repouso ≤ 52 por 3 dias, VFC ≥ 38, duas semanas com 5 corridas)', etapas: [
    { n: 'Aquecimento', s: 600, v: '8 a 8,5 km/h', t: 'Fácil. Aqui você ainda não está treinando.', fc: 'FC até 150' }]
    .concat([1, 2, 3, 4].flatMap(i => [
      { n: `Forte ${i} de 4`, s: 240, v: '9,5 a 10 km/h', t: 'Firme, mas sob controle. Você ainda fala frases curtas.', fc: 'FC 155 a 170' },
      { n: i < 4 ? `Recuperação ${i}` : 'Recuperação final', s: 120, v: '8 km/h', t: 'Respire e solte as pernas.', fc: 'FC descendo' }]))
    .concat([{ n: 'Desaquecimento', s: 300, v: '5 a 5,5 km/h', t: 'Caminhe até normalizar.', fc: 'FC caindo' }]) }
};

let C = null;   // sessão em andamento: { plano, ini, pausado, acum, i, falou, metro }
let C_TICK = null, C_AUDIO = null, C_METRO = null, C_LOCK = null;

const cDur = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const cTotal = p => p.etapas.reduce((a, e) => a + e.s, 0);

function cFalar(txt) {
  try { if (C && C.mudo) return; const u = new SpeechSynthesisUtterance(txt); u.lang = 'pt-BR'; u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}
function cBip(f = 880, ms = 150) {
  try {
    C_AUDIO = C_AUDIO || new (window.AudioContext || window.webkitAudioContext)();
    const o = C_AUDIO.createOscillator(), g = C_AUDIO.createGain();
    o.frequency.value = f; g.gain.value = 0.15; o.connect(g); g.connect(C_AUDIO.destination); o.start(); o.stop(C_AUDIO.currentTime + ms / 1000);
  } catch (e) {}
}
function cVibrar(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
async function cTela() { try { if ('wakeLock' in navigator && !C_LOCK) { C_LOCK = await navigator.wakeLock.request('screen'); C_LOCK.addEventListener('release', () => { C_LOCK = null; }); } } catch (e) {} }
function cSoltar() { try { if (C_LOCK) C_LOCK.release(); } catch (e) {} C_LOCK = null; }
function cMetro(liga) {
  if (C_METRO) { clearInterval(C_METRO); C_METRO = null; }
  if (liga) C_METRO = setInterval(() => { if (C && !C.pausado && cEtapa().n === 'Corrida fácil') cBip(1200, 40); }, 60000 / 170);
}

function cDecorrido() { return C.acum + (C.pausado ? 0 : (Date.now() - C.ini) / 1000); }
function cEtapa() {
  const et = C.plano.etapas; return et[Math.min(C.i, et.length - 1)];
}
function cInicioEtapa(i) { return C.plano.etapas.slice(0, i).reduce((a, e) => a + e.s, 0); }

function cAnunciar(e, primeira) {
  cBip(988, 200); cVibrar([250, 120, 250]);
  const prox = C.plano.etapas[C.i + 1];
  cFalar(`${e.n}. ${e.v.replace('km/h', 'quilômetros por hora').replace('a ', 'a ')}. ${e.t} Duração: ${Math.round(e.s / 60)} minuto${Math.round(e.s / 60) === 1 ? '' : 's'}.`);
}

function cTic() {
  if (!C) return;
  const el = cDecorrido(), p = C.plano, total = cTotal(p);
  if (!C.pausado) {
    // troca de etapa pelo relógio (não por contagem), para não se perder se a aba atrasar
    while (C.i < p.etapas.length && el >= cInicioEtapa(C.i) + p.etapas[C.i].s) {
      C.i++; C.falou = {};
      if (C.i < p.etapas.length) cAnunciar(p.etapas[C.i]);
    }
    if (C.i >= p.etapas.length) { cFim(); return; }
    const e = p.etapas[C.i], rest = cInicioEtapa(C.i) + e.s - el;
    if (rest <= 10 && rest > 8 && !C.falou.dez && C.i + 1 < p.etapas.length) { C.falou.dez = 1; cBip(660, 120); cFalar(`Em dez segundos: ${p.etapas[C.i + 1].n}.`); }
    if (e.marcas) { const k = Math.floor((el - cInicioEtapa(C.i)) / e.marcas); if (k >= 1 && !C.falou['m' + k] && rest > 20) { C.falou['m' + k] = 1; cBip(740, 120); cVibrar(200); cFalar(`Confira a frequência cardíaca. O teto é ${e.fc.replace('FC até ', '')}. Se passar, diminua o passo.`); } }
  }
  cPintar();
}

function cPintar() {
  const box = document.getElementById('c-vivo'); if (!box || !C) return;
  const p = C.plano, el = cDecorrido(), total = cTotal(p), e = cEtapa(), rest = Math.max(0, cInicioEtapa(C.i) + e.s - el), prox = p.etapas[C.i + 1];
  const segs = p.etapas.map((s, i) => `<i style="flex:${s.s};background:${i < C.i ? 'var(--campo)' : i === C.i ? 'var(--sol)' : 'var(--fraca)'}"></i>`).join('');
  box.innerHTML = `
    <div class="c-et">${esc(e.n)}</div>
    <div class="c-tempo">${cDur(rest)}</div>
    <div class="c-v">${esc(e.v)} · ${esc(e.fc)}</div>
    <p class="c-t">${esc(e.t)}</p>
    <div class="c-seg">${segs}</div>
    <div class="c-mini"><span>Total ${cDur(el)} de ${cDur(total)}</span><span>${prox ? 'Depois: ' + esc(prox.n) : 'Última etapa'}</span></div>`;
  const pb = document.getElementById('c-pausa'); if (pb) pb.textContent = C.pausado ? 'Continuar' : 'Pausar';
}

function cFim(parou) {
  const el = Math.round(cDecorrido()); const nome = C.plano.nome;
  clearInterval(C_TICK); C_TICK = null; cMetro(false); cSoltar();
  if (!parou) { cBip(1318, 400); cVibrar([400, 150, 400]); cFalar('Fim da corrida. Boa. Caminhe mais um pouco e beba água.'); }
  const min = Math.round(el / 60); C = null;
  const v = document.getElementById('view'); if (!v) return;
  const texto = `Corrida guiada (${nome}): ${min} min${parou ? ', parei antes do fim' : ', completa'}.`;
  v.innerHTML = `<div class="campo tinta"><div class="dentro" style="padding-bottom:22px"><div class="topo"><div class="rot">Corrida</div></div><h1 class="titulo longo">${parou ? 'Sessão encerrada' : 'Corrida completa'}</h1><div class="sub">${min} min · ${esc(nome)}</div></div></div>
    <section class="bloco"><div class="aviso">O relógio guarda a corrida de verdade (distância, FC, cadência). Anote aqui só como foi: tornozelo, respiração, vontade de parar.</div>
    <button class="botao" id="c-reg" type="button">Registrar a corrida</button></section>
    <section class="bloco"><a class="botao claro" href="#corrida">Voltar</a></section>`;
  document.getElementById('c-reg').onclick = () => {
    REG_TIPO = 'observacao'; location.hash = '#reg';
    setTimeout(() => { const t = document.getElementById('rg-txt'); if (t && !t.value) t.value = texto + ' '; }, 80);
  };
}

const topoC = (t, sub) => '<div class="campo tinta"><div class="dentro" style="padding-bottom:22px"><div class="topo"><div class="rot">Corrida</div></div><h1 class="titulo longo">' + esc(t) + '</h1>' + (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div></div>';

function renderCorrida() {
  const v = document.getElementById('view'); if (!v) return;
  if (C_TICK) clearInterval(C_TICK); C_TICK = null; cMetro(false);
  if (!C) {
    const sem = (typeof avaliarSemaforo === 'function') ? avaliarSemaforo() : null;
    const seg = sem && (sem.estado === 'segurar' || sem.estado === 'ajustar');
    const rec = seg ? 'curta' : 'base', P = C_PLANOS[rec];
    const dia = (typeof DATA !== 'undefined' && DATA && DATA.dias || []).find(d => d.data === hojeDDMM());
    const foco = dia && dia.treino && dia.treino.foco;
    const noPlano = foco && /corrida/i.test(foco);
    const porque = seg ? 'O semáforo está em ' + sem.estado + ' hoje: ' + ((sem.motivos || [])[0] || 'recuperação baixa') + ' Por isso a versão curta.'
      : noPlano ? 'É a corrida do plano de hoje: ' + foco + '.' : 'Fase 1: constância, tudo fácil.' + (dia ? '' : ' Hoje não há corrida no plano publicado; esta é a sessão-padrão da fase 1.');
    const resumo = P.etapas.map(e => `${Math.round(e.s / 60)} min ${e.n.toLowerCase()} (${e.v})`).join(' · ');
    v.innerHTML = topoC('Corrida de hoje', 'Eu escolhi a sessão. É só tocar em iniciar e deixar a tela acesa.') +
      `<section class="bloco"><div class="c-card"><div class="c-et">${esc(P.nome)}</div><p class="c-t" style="margin:8px 0">${esc(porque)}</p><div class="c-mini" style="display:block">${esc(resumo)}</div></div>
      <button class="botao" id="c-ini" type="button" style="margin-top:14px">Iniciar</button></section>
      <section class="bloco"><label class="c-op"><input type="checkbox" id="c-metro" checked> Metrônomo de cadência (170 batidas por minuto, só na corrida fácil)</label>
      <label class="c-op"><input type="checkbox" id="c-mudo"> Sem voz (só bip e vibração)</label>
      <details class="c-outro"><summary>Trocar a sessão</summary>${Object.entries(C_PLANOS).filter(([k]) => k !== 'qualidade' && k !== rec).map(([k, p]) => `<button type="button" class="linha c-esc" data-p="${k}"><span class="corpo">${esc(p.nome)}<small>${esc(p.sub)}</small></span><span class="num">iniciar</span></button>`).join('')}<div class="aviso">A sessão de qualidade (4 × 4) só entra quando a porteira da fase 2 abrir; eu aviso.</div></details>
      <div class="aviso">No iPhone, bloquear a tela corta a voz e o bip: mantenha o painel aberto. O ritmo na esteira é você que ajusta; o guia só marca o tempo.</div></section>
      <section class="bloco"><a class="botao claro" href="#home">Voltar</a></section>`;
    const comecar = k => { C = { plano: C_PLANOS[k], ini: Date.now(), acum: 0, pausado: false, i: 0, falou: {}, mudo: document.getElementById('c-mudo').checked };
      cMetro(document.getElementById('c-metro').checked); cTela(); cBip(660, 80); cAnunciar(C.plano.etapas[0], true); renderCorrida(); };
    document.getElementById('c-ini').onclick = () => comecar(rec);
    v.querySelectorAll('.c-esc').forEach(b => b.onclick = () => comecar(b.dataset.p));
    return;
  }
  v.innerHTML = `<div class="campo tinta"><div class="dentro" style="padding-bottom:22px"><div class="topo"><div class="rot">Corrida</div></div><h1 class="titulo longo">${esc(C.plano.nome)}</h1></div></div>
    <section class="bloco"><div id="c-vivo" class="c-vivo"></div></section>
    <section class="bloco"><button class="botao" id="c-pausa" type="button">Pausar</button></section>
    <section class="bloco"><button class="botao claro" id="c-parar" type="button">Encerrar</button></section>`;
  document.getElementById('c-pausa').onclick = () => {
    if (C.pausado) { C.pausado = false; C.ini = Date.now(); cFalar('Continuando.'); cTela(); }
    else { C.acum += (Date.now() - C.ini) / 1000; C.pausado = true; cFalar('Pausado.'); }
    cPintar();
  };
  document.getElementById('c-parar').onclick = () => { if (confirm('Encerrar a corrida agora?')) cFim(true); };
  cPintar(); C_TICK = setInterval(cTic, 500);
}

document.addEventListener('visibilitychange', () => { if (!document.hidden && C) { cTela(); cTic(); } });
window.addEventListener('hashchange', () => {
  if (!/^#corrida/.test(location.hash) && C_TICK && !C) { clearInterval(C_TICK); C_TICK = null; }
});

function linkCorrida() {
  return `<section class="bloco" style="padding-bottom:0"><a class="linha" href="#corrida"><span class="corpo">Corrida guiada<small>Etapas, tempo e voz na tela · base de 30 min</small></span><span class="num">abrir</span></a></section>`;
}
