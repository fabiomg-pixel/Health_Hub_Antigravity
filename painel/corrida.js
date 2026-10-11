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

let C_DADOS = null;   // sessões definidas pelo treinador (data/corridas.json)
fetch('data/corridas.json').then(r => r.ok ? r.json() : null).then(j => { C_DADOS = j; if (location.hash === '#corrida' && !C) renderCorrida(); }).catch(() => {});
function cSessaoDoDia() {
  const ss = (C_DADOS && C_DADOS.sessoes) || {}, hoje = isoLocal();
  const ks = Object.keys(ss).filter(k => k >= hoje).sort(); if (!ks.length) return null;
  const k = ks[0], x = ss[k];
  return { iso: k, hoje: k === hoje, plano: { nome: x.titulo, sub: x.porque || '', etapas: x.etapas }, porque: x.porque || '' };
}

let C_REC = null;
let C = null;   // sessão em andamento: { plano, ini, pausado, acum, i, falou, metro }
let C_TICK = null, C_AUDIO = null, C_METRO = null, C_LOCK = null;

const cDur = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const cTotal = p => p.etapas.reduce((a, e) => a + e.s, 0);

function cResumo(P) {
  const e = P.etapas, tiros = e.filter(x => x.tiro).length;
  const min = Math.round(cTotal(P) / 60);
  return `${min} min em ${e.length} etapas` + (tiros ? `, com ${tiros} tiros` : '') + ': ' + e.filter((x, i) => i < 3 || i === e.length - 1).map(x => `${Math.max(1, Math.round(x.s / 60))} min ${x.n.toLowerCase()} (${x.v})`).join(' · ') + (e.length > 4 ? ' · …' : '');
}
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
  if (liga) C_METRO = setInterval(() => { if (C && !C.pausado && parseFloat(String(cEtapa().v).replace(',', '.')) >= 8) cBip(1200, 40); }, 60000 / 170);
}


// ───────── GPS (corrida na rua) ─────────
// Só funciona com o painel aberto e a tela acesa (iPhone e navegadores suspendem o GPS com a tela travada).
// Nada de trajeto é guardado nem enviado: só a distância e o ritmo da sessão, na memória da página.
const cKm = (a, b) => { const R = 6371000, r = x => x * Math.PI / 180, dl = r(b.lat - a.lat), dn = r(b.lon - a.lon);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const cPace = ms => { if (!ms || ms < 0.4) return '—'; const sKm = 1000 / ms, m = Math.floor(sKm / 60), s = Math.round(sKm % 60); return m + ':' + String(s === 60 ? 0 : s).padStart(2, '0') + ' /km'; };
function cFaixa(v) {   // "8,0 km/h" -> [7,5 .. 8,5]; "5,5 a 6,5 km/h" -> [5,5 .. 6,5]
  const n = (String(v).match(/\d+(?:,\d+)?/g) || []).map(x => parseFloat(x.replace(',', '.')));
  if (!n.length) return null; return n.length > 1 ? [n[0], n[1]] : [n[0] - 0.5, n[0] + 0.5];
}
function cGpsIniciar() {
  const g = C.gps = { ok: false, erro: '', dist: 0, vel: 0, ult: null, kmFalado: 0, ultTreino: 0, id: null };
  if (!('geolocation' in navigator)) { g.erro = 'Este aparelho não tem GPS no navegador.'; return; }
  g.id = navigator.geolocation.watchPosition(p => {
    if (!C || !C.gps) return;
    g.ok = true; g.erro = '';
    const c = p.coords, agora = { lat: c.latitude, lon: c.longitude, t: Date.now() };
    if (c.accuracy > 35) return;                          // sinal ruim: ignora o ponto
    if (g.ult) {
      const d = cKm(g.ult, agora), dt = (agora.t - g.ult.t) / 1000;
      if (dt <= 0 || d < 2) return;                       // parado ou ruído
      const v = d / dt;
      if (v > 7) return;                                  // salto de GPS (acima de 25 km/h)
      if (!C.pausado) { g.dist += d; g.vel = g.vel ? g.vel * 0.7 + v * 0.3 : v; }
    }
    g.ult = agora;
  }, e => { g.erro = e.code === 1 ? 'Permissão de localização negada: o guia segue só por tempo.' : 'Sem sinal de GPS por enquanto.'; }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
}
function cGpsParar() { try { if (C && C.gps && C.gps.id != null) navigator.geolocation.clearWatch(C.gps.id); } catch (e) {} }
function cGpsAvisos(e, el, rest) {
  const g = C.gps; if (!g || !g.ok || C.pausado) return;
  const km = Math.floor(g.dist / 1000);
  if (km > g.kmFalado) { g.kmFalado = km; const ritmoMedio = cPace(g.dist / Math.max(1, el)); cBip(1046, 150); cFalar(`${km} quilômetro${km > 1 ? 's' : ''}. Tempo ${cDur(el).replace(':', ' minutos e ')} segundos. Ritmo médio ${ritmoMedio.replace(' /km', ' por quilômetro').replace(':', ' minutos e ') .replace('minutos e 00','minutos')}.`); }
  const f = cFaixa(e.v), kmh = g.vel * 3.6, desdeTroca = el - cInicioEtapa(C.i);
  if (f && g.vel && desdeTroca > 25 && rest > 12 && el - g.ultTreino > 45) {
    if (kmh < f[0] - 0.8) { g.ultTreino = el; cFalar('Um pouco mais rápido. Alvo ' + e.v.replace('km/h', 'quilômetros por hora') + '.'); }
    else if (kmh > f[1] + 0.8) { g.ultTreino = el; cFalar('Reduza um pouco. Alvo ' + e.v.replace('km/h', 'quilômetros por hora') + '.'); }
  }
}

function cDecorrido() { return C.acum + (C.pausado ? 0 : (Date.now() - C.ini) / 1000); }
function cEtapa() {
  const et = C.plano.etapas; return et[Math.min(C.i, et.length - 1)];
}
function cInicioEtapa(i) { return C.plano.etapas.slice(0, i).reduce((a, e) => a + e.s, 0); }

function cAnunciar(e, primeira) {
  cBip(e.tiro ? 1175 : 988, 200); if (e.tiro) setTimeout(() => cBip(1175, 200), 260); cVibrar(e.tiro ? [300, 100, 300, 100, 300] : [250, 120, 250]);
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
    cGpsAvisos(e, el, rest);
    if (rest <= 10 && rest > 8 && !C.falou.dez && C.i + 1 < p.etapas.length) { C.falou.dez = 1; cBip(660, 120); cFalar(`Em dez segundos: ${p.etapas[C.i + 1].n}.`); }
    if (e.marcas) { const k = Math.floor((el - cInicioEtapa(C.i)) / e.marcas); if (k >= 1 && !C.falou['m' + k] && rest > 20) { C.falou['m' + k] = 1; cBip(740, 120); cVibrar(200); if (e.marcas >= 180 || k % 3 === 0) cFalar(`Confira a frequência cardíaca. Alvo: ${e.fc.replace('FC ', '')}.`); } }
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
    ${C.gps ? `<div class="c-v" style="margin-top:6px">${C.gps.erro ? esc(C.gps.erro) : C.gps.ok ? (C.gps.dist / 1000).toFixed(2).replace('.', ',') + ' km · ' + cPace(C.gps.vel) + ' · ' + (C.gps.vel * 3.6).toFixed(1).replace('.', ',') + ' km/h' : 'Procurando sinal de GPS…'}</div>` : ''}
    <div class="c-mini"><span>Total ${cDur(el)} de ${cDur(total)}</span><span>${prox ? 'Depois: ' + esc(prox.n) : 'Última etapa'}</span></div>`;
  const pb = document.getElementById('c-pausa'); if (pb) pb.textContent = C.pausado ? 'Continuar' : 'Pausar';
}

function cFim(parou) {
  const el = Math.round(cDecorrido()); const nome = C.plano.nome;
  const dist = C.gps && C.gps.ok ? C.gps.dist : 0; cGpsParar();
  clearInterval(C_TICK); C_TICK = null; cMetro(false); cSoltar();
  if (!parou) { cBip(1318, 400); cVibrar([400, 150, 400]); cFalar('Fim da corrida. Boa. Caminhe mais um pouco e beba água.'); }
  const min = Math.round(el / 60); C = null;
  const v = document.getElementById('view'); if (!v) return;
  const km = dist ? (dist / 1000).toFixed(2).replace('.', ',') + ' km (GPS do celular, aproximado)' : '';
  const texto = `Corrida guiada (${nome}): ${min} min${km ? ', ' + km : ''}${parou ? ', parei antes do fim' : ', completa'}.`;
  v.innerHTML = `<div class="campo tinta"><div class="dentro" style="padding-bottom:22px"><div class="topo"><div class="rot">Corrida</div></div><h1 class="titulo longo">${parou ? 'Sessão encerrada' : 'Corrida completa'}</h1><div class="sub">${min} min${km ? ' · ' + esc(km) : ''} · ${esc(nome)}</div></div></div>
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
    const ses = cSessaoDoDia();
    let rec, P, porque;
    if (ses) {
      rec = '__treinador'; P = ses.plano;
      const quando = ses.hoje ? 'Sessão de hoje, definida pelo treinador.' : 'Próxima sessão do plano (' + ses.iso.slice(8, 10) + '/' + ses.iso.slice(5, 7) + '), definida pelo treinador.';
      porque = quando + (ses.porque ? ' ' + ses.porque : '') + (seg ? ' Atenção: o semáforo está em ' + sem.estado + ' hoje (' + ((sem.motivos || [])[0] || 'recuperação baixa') + '). Se for correr, reduza ou use a versão curta em "Trocar a sessão".' : '');
    } else {
      rec = seg ? 'curta' : 'base'; P = C_PLANOS[rec];
      porque = seg ? 'O semáforo está em ' + sem.estado + ' hoje: ' + ((sem.motivos || [])[0] || 'recuperação baixa') + ' Por isso a versão curta.' : 'Sessão-padrão da fase 1: o treinador ainda não publicou a sessão de hoje.';
    }
    C_REC = { rec, P };
    let gpsLembrado = false; try { gpsLembrado = localStorage.getItem('corrida_gps') === '1'; } catch (e) {}
    const dia = null, foco = null, noPlano = false;
    const resumo = cResumo(P);
    v.innerHTML = topoC('Corrida de hoje', 'A sessão vem do treinador. É só tocar em iniciar e deixar a tela acesa.') +
      `<section class="bloco"><div class="c-card"><div class="c-et">${esc(P.nome)}</div><p class="c-t" style="margin:8px 0">${esc(porque)}</p><div class="c-mini" style="display:block">${esc(resumo)}</div></div>
      <button class="botao" id="c-ini" type="button" style="margin-top:14px">Iniciar</button></section>
      <section class="bloco"><label class="c-op"><input type="checkbox" id="c-metro" checked> Metrônomo de cadência (170 batidas por minuto, só na corrida fácil)</label>
      <label class="c-op"><input type="checkbox" id="c-gps"> Corrida na rua: usar o GPS do celular (distância, ritmo e aviso a cada km)</label>
      <label class="c-op"><input type="checkbox" id="c-mudo"> Sem voz (só bip e vibração)</label>
      <details class="c-outro"><summary>Trocar a sessão</summary>${Object.entries(C_PLANOS).filter(([k]) => k === 'base' || k === 'curta').filter(([k]) => k !== rec).map(([k, p]) => `<button type="button" class="linha c-esc" data-p="${k}"><span class="corpo">${esc(p.nome)}<small>${esc(p.sub)}</small></span><span class="num">iniciar</span></button>`).join('')}<div class="aviso">A sessão de qualidade (4 × 4) só entra quando a porteira da fase 2 abrir; eu aviso.</div></details>
      <div class="aviso">No iPhone, bloquear a tela corta a voz e o bip: mantenha o painel aberto. Na esteira, o ritmo é você que ajusta. Na rua, com o GPS ligado, o guia mede distância e ritmo e avisa se estiver rápido ou lento demais; ele pede a permissão de localização e não guarda nem envia o trajeto.</div></section>
      <section class="bloco"><a class="botao claro" href="#home">Voltar</a></section>`;
    document.getElementById('c-gps').checked = gpsLembrado;
    const comecar = (k, plano) => { try { localStorage.setItem('corrida_gps', document.getElementById('c-gps').checked ? '1' : '0'); } catch (e) {} C = { plano: plano || C_PLANOS[k], ini: Date.now(), acum: 0, pausado: false, i: 0, falou: {}, mudo: document.getElementById('c-mudo').checked };
      cMetro(document.getElementById('c-metro').checked); if (document.getElementById('c-gps').checked) cGpsIniciar(); cTela(); cBip(660, 80); cAnunciar(C.plano.etapas[0], true); renderCorrida(); };
    document.getElementById('c-ini').onclick = () => comecar(rec === '__treinador' ? null : rec, P);
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
