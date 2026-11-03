// Animações do painel (Fabio, 31/10/2026: "pode levar tudo"). Desenho: canvas "Animações do Painel", rodada 2.
// A intensidade acompanha o significado: toque (CSS em palco.css), virada (mola na série feita) e palco.
// Palco = tela cheia, um por vez (fila); o primeiro toque leva ao estado final, o segundo fecha. Com movimento
// reduzido, o palco já abre no estado final. Palcos: abertura do dia (farol), recorde, estilha (bênção), Cinza
// (maldição ou percalço) e fim do treino ou da corrida. O cronômetro da prancha (treino.js) usa o mar daqui.
// Usa os helpers do index.html: esc, fNum, isoLocal, hojeDDMM, partirFoco, tipoProgramado, DATA.

const P_MENOS = matchMedia('(prefers-reduced-motion: reduce)');
function pVibrar(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }
let P_AUDIO = null;
function pSom(f, ms, vol) {
  try {
    P_AUDIO = P_AUDIO || new (window.AudioContext || window.webkitAudioContext)();
    const o = P_AUDIO.createOscillator(), g = P_AUDIO.createGain(), t = P_AUDIO.currentTime;
    o.frequency.value = f; g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000);
    o.connect(g); g.connect(P_AUDIO.destination); o.start(); o.stop(t + ms / 1000);
  } catch (e) {}
}
const pLer = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const pGravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const P_BOIA = '<svg width="18" height="24" viewBox="0 0 18 24" aria-hidden="true"><path d="M9 1v8" stroke="#fff" stroke-width="2"/><circle cx="9" cy="15" r="7" fill="#FFB48F" stroke="#fff" stroke-width="2"/></svg>';
const P_ESTRELA = '<svg width="44" height="44" viewBox="0 0 56 56" aria-hidden="true"><path d="M28 4l5 19 19 5-19 5-5 19-5-19-19-5 19-5z" fill="#FFB48F"/></svg>';
const P_ONDA = (cor, h) => `<svg viewBox="0 0 780 ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="M0 ${h > 40 ? 40 : 9}q24.4-${h > 40 ? 14 : 12} 48.75 0${' t48.75 0'.repeat(15)}V${h}H0z" fill="${cor}"/></svg>`;

// ───────── a fila de palcos ─────────
const P_FILA = []; let P_ATIVO = null;
function palco(classe, montar) { P_FILA.push({ classe, montar }); if (!P_ATIVO) pProximo(); }
function pProximo() {
  const p = P_FILA.shift(); if (!p) { P_ATIVO = null; return; }
  const el = document.createElement('div');
  el.className = 'palco ' + p.classe; el.tabIndex = -1; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  const ctl = { el, acoes: {}, aoPular: [], aoFechar: [], timers: [] };
  ctl.depois = (ms, f) => { ctl.timers.push(setTimeout(f, ms)); };
  ctl.fechar = () => {
    if (ctl.fechado) return; ctl.fechado = true; ctl.timers.forEach(clearTimeout);
    ctl.aoFechar.forEach(f => { try { f(); } catch (e) {} });
    el.classList.add('sai'); setTimeout(() => { el.remove(); pProximo(); }, 300);
  };
  ctl.pular = () => {
    if (ctl.pulado) { ctl.fechar(); return; }
    ctl.pulado = true;
    try { el.getAnimations({ subtree: true }).forEach(a => { const t = a.effect && a.effect.getComputedTiming(); if (t && t.iterations !== Infinity) a.finish(); }); }
    catch (e) { ctl.fechar(); return; }
    ctl.aoPular.forEach(f => { try { f(); } catch (e) {} });
  };
  el.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('[data-p]');
    if (b) { ev.stopPropagation(); (ctl.acoes[b.dataset.p] || ctl.fechar)(); return; }
    ctl.pular();
  });
  el.addEventListener('keydown', ev => { if (ev.key === 'Escape') ctl.fechar(); });
  P_ATIVO = ctl; document.body.appendChild(el);
  p.montar(ctl);
  try { el.focus({ preventScroll: true }); } catch (e) {}
  if (P_MENOS.matches) requestAnimationFrame(() => ctl.pular());
}

// ───────── o mar: água com física (colunas com mola), para canvas ─────────
function pMar(cv, o) {
  o = o || {};
  const cor = o.cor || [11, 94, 124], N = 44;
  const m = { h: new Array(N).fill(0), v: new Array(N).fill(0), nivel: o.nivel ?? 0.1, alvo: o.nivel ?? 0.1, cor: cor.slice(), alvoCor: cor.slice(),
    gotas: [], vivo: true, antes: o.antes || null, depois: o.depois || null, fundo: o.fundo || null, W: 0, H: 0 };
  const ctx = cv.getContext('2d');
  const medir = () => {
    const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
    if (w !== m.W || h !== m.H) { m.W = w; m.H = h; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  };
  const ix = x => Math.max(0, Math.min(N - 1, Math.round(x * (N - 1))));
  m.impulso = (x, f) => { m.v[ix(x)] += f; };                          // x em fração da largura
  m.superficie = xp => m.H - m.nivel * m.H + m.h[ix(xp / (m.W || 1))]; // x em px
  m.respingo = (x, n, forca, cores) => {
    for (let k = 0; k < n; k++) m.gotas.push({ x: x * m.W + (Math.random() - 0.5) * 50, y: m.superficie(x * m.W), vx: (Math.random() - 0.5) * 6,
      vy: -2 - Math.random() * forca, r: 1.5 + Math.random() * 3.5, c: cores ? cores[k % cores.length] : null });
  };
  const passo = () => {
    if (!m.vivo) return;
    medir(); const now = performance.now(), W = m.W, H = m.H;
    m.nivel += (m.alvo - m.nivel) * 0.06;
    for (let c = 0; c < 3; c++) m.cor[c] += (m.alvoCor[c] - m.cor[c]) * 0.08;
    if (Math.random() < 0.1) m.v[Math.floor(Math.random() * N)] += (Math.random() - 0.5) * 1.4;
    for (let i = 0; i < N; i++) { m.v[i] += -0.025 * m.h[i] - 0.028 * m.v[i]; m.h[i] += m.v[i]; }
    for (let p = 0; p < 3; p++) for (let i = 0; i < N; i++) {
      if (i > 0) m.v[i - 1] += 0.11 * (m.h[i] - m.h[i - 1]);
      if (i < N - 1) m.v[i + 1] += 0.11 * (m.h[i] - m.h[i + 1]);
    }
    if (m.fundo) { ctx.fillStyle = m.fundo; ctx.fillRect(0, 0, W, H); } else ctx.clearRect(0, 0, W, H);
    if (m.antes) m.antes(ctx, W, H, now);
    const base = H - m.nivel * H, pa = W / (N - 1), rgb = 'rgb(' + m.cor.map(Math.round).join(',') + ')';
    ctx.fillStyle = 'rgba(14,115,150,.6)'; ctx.beginPath(); ctx.moveTo(0, H);
    for (let i = 0; i < N; i++) ctx.lineTo(i * pa, base - 10 + m.h[(i + 7) % N] * 0.7 + Math.sin(now / 700 + i * 0.45) * 4);
    ctx.lineTo(W, H); ctx.fill();
    ctx.fillStyle = rgb; ctx.beginPath(); ctx.moveTo(0, H);
    for (let i = 0; i < N; i++) ctx.lineTo(i * pa, base + m.h[i]);
    ctx.lineTo(W, H); ctx.fill();
    m.gotas = m.gotas.filter(g => { g.vy += 0.32; g.x += g.vx; g.y += g.vy; return g.y < m.superficie(g.x) + 4 || g.vy < 0; });
    m.gotas.forEach(g => { ctx.fillStyle = g.c || rgb; ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.fill(); });
    if (m.depois) m.depois(ctx, W, H, now);
    m.raf = requestAnimationFrame(passo);
  };
  m.parar = () => { m.vivo = false; cancelAnimationFrame(m.raf); };
  passo();
  return m;
}

// números que contam até o valor (data-n; data-dec = casas decimais; data-mais = sinal de +)
function pContar(ctl, ini) {
  const els = [...ctl.el.querySelectorAll('[data-n]')], t0 = performance.now();
  const escreve = (el, u) => { const n = +el.dataset.n, dec = +(el.dataset.dec || 0), v = n * (1 - Math.pow(1 - u, 3));
    el.textContent = (el.dataset.mais != null ? '+' : '') + (dec ? fNum(v, dec) : Math.round(v)); };
  let raf;
  const passo = () => {
    const t = performance.now() - t0; let vivo = false;
    els.forEach(el => { const a = +(el.dataset.ini || ini || 0), d = +(el.dataset.dur || 900), u = Math.max(0, Math.min(1, (t - a) / d)); escreve(el, u); if (u < 1) vivo = true; });
    if (vivo && !ctl.fechado) raf = requestAnimationFrame(passo);
  };
  passo();
  ctl.aoPular.push(() => { cancelAnimationFrame(raf); els.forEach(el => escreve(el, 1)); });
  ctl.aoFechar.push(() => cancelAnimationFrame(raf));
}

// ───────── 1. abertura do dia: o farol acende (uma vez por dia, no Início ou no Hoje) ─────────
function aberturaDoDia() {
  if (typeof avaliarSemaforo !== 'function' || !DATA) return;
  const hoje = isoLocal(); if (pLer('p_abertura', '') === hoje) return;
  const rota = (location.hash || '#home').slice(1); if (!['home', 'hoje', ''].includes(rota)) return;
  const s = avaliarSemaforo(); if (!['pode', 'ajustar', 'segurar'].includes(s.estado)) return;
  pGravar('p_abertura', hoje);
  const d = DATA.dias.find(x => x.data === hojeDDMM()), tipo = d && typeof tipoProgramado === 'function' ? tipoProgramado(d) : null;
  const titulo = d ? partirFoco((d.treino && d.treino.foco) || 'Dia livre').titulo : 'Dia sem plano publicado';
  const motivo = s.estado === 'pode' ? 'O relógio deixou: o plano inteiro.' : (s.motivos || []).join('; ').replace(/^./, c => c.toUpperCase()) + '.';
  const extra = { pode: ['forca', 'corrida'].includes(tipo) ? 'Rodada bônus liberada depois da sessão.' : 'Dia leve: aproveite.',
    ajustar: 'Todas as séries, sem subir carga. Sem rodada bônus hoje.', segurar: 'Pesagem e caminhada. O treino espera o corpo voltar.' }[s.estado];
  const nome = { pode: 'Pode', ajustar: 'Ajustar', segurar: 'Segurar' }[s.estado];
  const dia = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][new Date().getDay()] + ' · ' + hojeDDMM();
  const estrelas = [[8, 10], [80, 7], [64, 21], [23, 34], [87, 38], [45, 15], [12, 52], [70, 48]].map(([x, y], k) => `<span class="estrela" style="left:${x}%;top:${y}%;animation-delay:${k * 0.4}s"></span>`).join('');
  palco('pa ' + s.estado, ctl => {
    ctl.el.setAttribute('aria-label', 'Abertura do dia: ' + nome);
    ctl.el.innerHTML = `<div class="p-in">${estrelas}<div class="facho"></div>
      <div class="conteudo"><div style="font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.85">${esc(dia)} · bom dia</div>
        <div class="estado">${nome}</div>
        <div style="font-family:var(--display);font-weight:800;font-size:26px;line-height:1.1">${esc(titulo)}</div>
        <div style="font-size:16px;line-height:1.45;opacity:.9">${esc(motivo)}</div>
        <div style="font-size:15px;line-height:1.45;font-weight:700;color:var(--sol)">${esc(extra)}</div></div>
      <svg class="torre" width="50" height="210" viewBox="0 0 50 210" aria-hidden="true"><path d="M14 0h22l9 210H5z" fill="#F1F6F8"/><path d="M11 56h28M9 112h32M7 168h36" stroke="#0B5E7C" stroke-width="12"/><path d="M6 0h38" stroke="#F1F6F8" stroke-width="5"/></svg>
      <div class="lampada"></div><div class="mar">${P_ONDA('#0B5E7C', 150)}</div>
      <button type="button" class="p-bt" data-p="ver">Ver o dia</button></div>`;
    ctl.el.querySelector('.mar svg').style.cssText = 'width:100%;height:100%;display:block';
    ctl.acoes.ver = () => { ctl.fechar(); if ((location.hash || '#home') !== '#hoje') location.hash = '#hoje'; };
    pVibrar([20, 80, 20]);
  });
}

// ───────── 2. recorde: a onda quebra ─────────
// Compara com todas as sessões ANTERIORES a hoje do mesmo exercício (o que foi de fato feito). Sem histórico, sem recorde.
function recordeDe(id, kg, reps, seg, iso, minReps) {
  if (typeof historicoDeCargas !== 'function') return null;
  const h = historicoDeCargas()[id]; if (!h || !h.todas) return null;
  const sets = h.todas.filter(x => x.data < iso).flatMap(x => (x.s || []).map(s => ({ kg: +s[0] || 0, r: +s[1] || 0 })));
  if (!sets.length) return null;
  const kgTxt = v => fNum(v, v % 1 ? 1 : 0) + ' kg';
  if (seg != null) { const m = Math.max(...sets.map(s => s.kg)); return seg > m ? { antes: m + ' s', agora: seg + ' s', legenda: `+${seg - m} s no seu melhor tempo` } : null; }
  const k = +kg || 0, r = +reps || 0, maxKg = Math.max(...sets.map(s => s.kg));
  if (k > maxKg && r >= (minReps || 1)) return { antes: kgTxt(maxKg), agora: kgTxt(k), legenda: `+${kgTxt(Math.round((k - maxKg) * 10) / 10)} na maior carga que você já fez` };
  if (k === maxKg) {
    const melhor = Math.max(...sets.filter(s => s.kg === maxKg).map(s => s.r));
    if (r > melhor) return { antes: melhor + ' reps', agora: r + ' reps', legenda: `+${r - melhor} ${r - melhor === 1 ? 'repetição' : 'repetições'} com ${k ? kgTxt(k) : 'o peso do corpo'}` };
  }
  return null;
}
function palcoRecorde(nome, rec) {
  palco('pr', ctl => {
    const gotas = Array.from({ length: 20 }, (_, k) => `<span class="gota" style="--dx:${Math.round(Math.sin(k * 2.3) * 170)}px;--dy:${-Math.round(150 + (k * 37) % 260)}px;animation-delay:${700 + (k * 23) % 160}ms;width:${6 + (k * 7) % 9}px;height:${6 + (k * 7) % 9}px"></span>`).join('');
    ctl.el.setAttribute('aria-label', `Recorde em ${nome}: ${rec.agora}`);
    ctl.el.innerHTML = `<div class="p-in"><span class="mancha"></span>
      <svg class="onda-q" viewBox="0 0 300 844" preserveAspectRatio="none" aria-hidden="true"><path d="M120 0C40 120 10 220 60 300c40 60 120 40 110-30-8-50-70-40-60 10 8 40 70 60 60 150C160 560 30 700 90 844H300V0z" fill="#0B5E7C"/><path d="M150 0C80 140 60 230 100 300" fill="none" stroke="#F1F6F8" stroke-width="6" stroke-linecap="round"/></svg>
      ${gotas}<div class="ex">${esc(nome)}</div><div class="palavra">Recorde</div>
      <div class="odo"><span>${esc(rec.antes)}<br>${esc(rec.agora)}</span></div><div class="legenda">${esc(rec.legenda)}</div></div>`;
    pVibrar([60, 40, 120]); pSom(523, 220); setTimeout(() => pSom(784, 380), 170);
    ctl.depois(3000, ctl.fechar);
  });
}

// ───────── 3 e 4. a Campanha: estilha (bênção) e Cinza (maldição ou percalço) ─────────
// Mostra só o que é novo neste aparelho (localStorage); na primeira vez, o passado vira linha de base, sem palco.
let P_CAMP_FEITO = false;
function palcosDaCampanha() {
  const H = typeof HISTORIA !== 'undefined' && HISTORIA;
  if (P_CAMP_FEITO || !H || !H.diario || typeof DATA === 'undefined' || !DATA) return;
  if (!['', 'home', 'hoje'].includes((location.hash || '#home').slice(1))) return;   // só no Início ou no Hoje: nunca no meio do treino, da corrida ou do registro
  P_CAMP_FEITO = true;
  const evs = [];
  H.diario.forEach(d => { const c = {}; (d.eventos || []).forEach(ev => { c[ev.tipo] = (c[ev.tipo] || 0) + 1; evs.push({ id: d.data + ':' + ev.tipo + ':' + c[ev.tipo], d, ev }); }); });
  const vistos = pLer('p_campanha', null);
  if (!vistos) { pGravar('p_campanha', evs.map(x => x.id)); return; }
  const novos = evs.filter(x => !vistos.includes(x.id));
  if (!novos.length) return;
  pGravar('p_campanha', vistos.concat(novos.map(x => x.id)).slice(-300));
  const pj = H.projecao && H.projecao.depois;
  const forja = !!(pj && (pj.reliquias || []).includes('lamina_estelar') && !(H.reliquias || []).some(r => r.id === 'lamina_estelar'));
  const total = forja ? 5 : Math.min(5, pj && pj.materiais ? (pj.materiais.estilha || 0) : ((H.materiais || {}).estilha || {}).qtd || 0);
  const bencaos = novos.filter(x => x.ev.tipo === 'bencao');
  // No máximo UM palco de Campanha por dia (31/10): se vários eventos chegaram juntos, sobe o mais pesado; os outros já estão no diário de bordo e no Telegram.
  const hoje = isoLocal(); if (pLer('p_camp_dia', '') === hoje) return;
  const peso = { maldicao: 3, percalco: 2, bencao: 1 };
  const alvo = novos.filter(x => peso[x.ev.tipo]).sort((a, b) => (forja && b.ev.tipo === 'bencao' ? 9 : peso[b.ev.tipo]) - (forja && a.ev.tipo === 'bencao' ? 9 : peso[a.ev.tipo]))[0];
  if (!alvo) return;
  pGravar('p_camp_dia', hoje);
  if (alvo.ev.tipo === 'bencao') palcoEstilha(alvo.ev, Math.max(1, total - (bencaos.length - 1 - bencaos.indexOf(alvo))), forja && alvo === bencaos[bencaos.length - 1]);
  else palcoCinza(alvo.ev);
}
// dispara quando o plano e a história já chegaram (a ordem dos fetches varia); depois da abertura do dia
(function esperar(n) {
  if (typeof DATA !== 'undefined' && DATA && typeof HISTORIA !== 'undefined' && HISTORIA) { setTimeout(palcosDaCampanha, 1200); return; }
  if (n < 60) setTimeout(() => esperar(n + 1), 250);
})(0);
function palcoEstilha(ev, depois, forja) {
  palco('pe', ctl => {
    ctl.el.setAttribute('aria-label', `Bênção: uma estilha do céu. ${depois} de 5 para a Lâmina Estelar.`);
    ctl.el.innerHTML = `<div class="p-in"><canvas aria-hidden="true"></canvas>
      <div class="topo-e"><div><div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.8">Bênção · estilhas do céu</div>
        <div class="conta" style="font-family:var(--display);font-weight:800;font-size:21px">${depois - 1} de 5 para a Lâmina</div></div>
        <div class="slots">${[0, 1, 2, 3, 4].map(k => `<span class="slot${k < depois - 1 ? ' on' : ''}"></span>`).join('')}</div></div>
      <div class="cena">${esc(ev.despacho || ev.texto)}</div>
      <button type="button" class="p-bt" data-p="ok" style="animation-delay:3s">Fechar</button></div>`;
    const cv = ctl.el.querySelector('canvas'), slots = [...ctl.el.querySelectorAll('.slot')], conta = ctl.el.querySelector('.conta');
    const alvoSlot = () => { const a = slots[depois - 1].getBoundingClientRect(), b = cv.getBoundingClientRect(); return [a.left - b.left + a.width / 2, a.top - b.top + a.height / 2]; };
    const ceu = Array.from({ length: 50 }, (_, k) => ({ x: (k * 97) % 1000 / 1000, y: (k * 53) % 600 / 1000, f: k * 0.7 }));
    let t0 = performance.now(), impacto = false, chegou = false, forjou = false, rastro = [];
    const quad = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
    const pegar = () => {
      if (chegou) return; chegou = true;
      slots[depois - 1].classList.add('on', 'novo'); conta.textContent = depois + ' de 5 para a Lâmina'; pVibrar(40); pSom(1046, 300, 0.08);
    };
    const losango = (ctx, x, y, s, rot) => { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.shadowColor = '#FFD9A0'; ctx.shadowBlur = 24; ctx.fillStyle = '#FFE7B8';
      ctx.beginPath(); ctx.moveTo(0, -s * 1.6); ctx.lineTo(s, 0); ctx.lineTo(0, s * 1.6); ctx.lineTo(-s, 0); ctx.closePath(); ctx.fill(); ctx.restore(); };
    const mar = pMar(cv, { nivel: 0.17, fundo: '#071C26',
      antes: (ctx, W, H, now) => {
        ceu.forEach(s => { ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(now / 900 + s.f)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x * W, s.y * H + 70, 2, 2); });
        ctx.globalAlpha = 1;
      },
      depois: (ctx, W, H, now) => {
        const t = now - t0, ix = W * 0.38, iy = H * 0.83;
        if (t < 900) {
          const u = t / 900, e = u * u, x = W * 0.85 + (ix - W * 0.85) * e, y = -20 + (iy + 20) * e;
          for (let k = 0; k < 3; k++) rastro.push({ x: x + (Math.random() - 0.5) * 4, y: y - k * 6, a: 1, r: 3 + Math.random() * 3 });
          ctx.save(); ctx.shadowColor = '#FFD9A0'; ctx.shadowBlur = 30; ctx.fillStyle = '#FFF6E2'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        } else if (!impacto) {
          impacto = true;
          for (let k = -4; k <= 4; k++) mar.impulso(0.38 + k * 0.025, -22 + Math.abs(k) * 3);
          mar.respingo(0.38, 40, 10, ['#0E7396', '#0E7396', '#FFE7B8']); pVibrar([30, 30, 90]);
        }
        if (t >= 900 && t < 1500) {
          const u = (t - 900) / 600;
          ctx.strokeStyle = 'rgba(255,231,184,' + (1 - u) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ix, iy, 20 + u * 140, 4 + u * 16, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(255,246,226,' + (0.5 * (1 - u)) + ')'; ctx.beginPath(); ctx.arc(ix, iy, 40 + u * 80, 0, Math.PI * 2); ctx.fill();
        }
        if (t >= 1250 && t < 2350) {
          const [sx, sy] = alvoSlot(), u = (t - 1250) / 1100, e = 1 - Math.pow(1 - u, 3), x = quad(ix, W * 0.15, sx, e), y = quad(iy, H * 0.3, sy, e);
          rastro.push({ x, y, a: 0.8, r: 2 }); losango(ctx, x, y, 9 + 5 * (1 - e), now / 160);
        } else if (t >= 2350) pegar();
        if (forja && t >= 2850) {
          const u = Math.min(1, (t - 2850) / 900), e = u * u * (3 - 2 * u);
          if (u < 1) slots.forEach((s, k) => { const a = s.getBoundingClientRect(), b = cv.getBoundingClientRect(), x0 = a.left - b.left + 11, y0 = a.top - b.top + 11;
            losango(ctx, x0 + (W / 2 - x0) * e, y0 + (H * 0.36 - y0) * e, 7, now / 140 + k); });
          else {
            const v = Math.min(1, (t - 3750) / 600);
            if (v < 1) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - v) + ')'; ctx.fillRect(0, 0, W, H); }
            if (!forjou) { forjou = true; slots.forEach(s => s.classList.remove('on')); ctl.el.querySelector('.cena').insertAdjacentHTML('beforebegin', '<div class="forja">Lâmina Estelar</div>');
              conta.textContent = 'A Lâmina Estelar foi forjada'; pVibrar([80, 50, 80, 50, 200]); pSom(784, 700, 0.1); setTimeout(() => pSom(1175, 900, 0.08), 150); }
            const g = Math.min(1, v * 1.4); ctx.save(); ctx.translate(W / 2, H * 0.36); ctx.shadowColor = '#FFD9A0'; ctx.shadowBlur = 40 + 10 * Math.sin(now / 300); ctx.fillStyle = '#FFF6E2';
            ctx.beginPath(); ctx.moveTo(0, -130 * g); ctx.lineTo(14, -26 * g); ctx.lineTo(9, 96 * g); ctx.lineTo(0, 112 * g); ctx.lineTo(-9, 96 * g); ctx.lineTo(-14, -26 * g); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#FFB48F'; ctx.fillRect(-40 * g, 90 * g, 80 * g, 9); ctx.fillRect(-6, 99 * g, 12, 40 * g); ctx.restore();
          }
        }
        rastro = rastro.filter(p => (p.a -= 0.035) > 0);
        rastro.forEach(p => { ctx.fillStyle = 'rgba(255,217,160,' + p.a + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.a, 0, Math.PI * 2); ctx.fill(); });
      } });
    if (forja) { ctl.el.querySelector('.cena').style.top = '62%'; ctl.el.querySelector('.p-bt').style.animationDelay = '4.6s'; }
    ctl.aoPular.push(() => { t0 = performance.now() - (forja ? 5000 : 2400); impacto = true; pegar(); });
    ctl.aoFechar.push(() => mar.parar());
  });
}
function palcoCinza(ev) {
  palco('pc', ctl => {
    const app = document.querySelector('.app'), mald = ev.tipo === 'maldicao';
    const marco = mald ? 'Juramento quebrado. O preço vem no fechamento da parte. Uma semana sem juramento quebrado tira a Mácula.'
      : 'Percalço: o dia fechou sem nenhum item. Desgaste; com 2 na mesma parte, alguém da companhia sai ferido no fechamento.';
    ctl.el.setAttribute('aria-label', mald ? 'Juramento quebrado' : 'Percalço');
    ctl.el.innerHTML = `<div class="p-in"><canvas aria-hidden="true"></canvas>
      <div class="cartao"><svg class="veias" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true"><path d="M10 30c30-12 40 10 70 2s40-24 70-10 50 18 140 4"/><path d="M60 32c10 14 30 18 44 26"/><path d="M180 26c14-14 34-16 52-24"/></svg>
        <div style="font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--sec)">${mald ? 'Maldição' : 'Percalço'} · diário de bordo</div>
        <div style="font-family:Georgia,serif;font-style:italic;font-size:17px;line-height:1.45">${esc(ev.despacho || ev.texto)}</div>
        <div style="font-size:14px;line-height:1.45;color:var(--sec)">${esc(marco)}</div></div>
      <span class="calor"></span><button type="button" class="p-bt" data-p="ok">Entendi</button></div>`;
    if (app) app.classList.add('acinzentado');
    pVibrar(260);
    const cv = ctl.el.querySelector('canvas'), ctx = cv.getContext('2d'); let flocos = [], monte = 0, raf, nevando = true; const t0 = performance.now();
    const passo = () => {
      const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
      const now = performance.now(); ctx.clearRect(0, 0, W, H);
      if (nevando) { const n = now - t0 < 3000 ? 3 : 1; for (let k = 0; k < n; k++) flocos.push({ x: Math.random() * W, y: -10, vy: 0.5 + Math.random() * 0.9, s: 1.5 + Math.random() * 2.5, f: Math.random() * 6, a: 0.85 }); monte = Math.min(22, monte + 0.02); }
      else { monte = Math.max(0, monte - 0.6); flocos.forEach(p => { p.a -= 0.05; }); }
      flocos = flocos.filter(p => p.a > 0 && p.y < H - monte);
      flocos.forEach(p => { p.y += p.vy; p.x += Math.sin(now / 900 + p.f) * 0.5; ctx.fillStyle = 'rgba(176,184,188,' + p.a + ')'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s, p.s * 0.7, p.f, 0, Math.PI * 2); ctx.fill(); });
      if (monte > 0.5) { ctx.fillStyle = 'rgba(176,184,188,.9)'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 15) ctx.lineTo(x, H - monte - Math.sin(x * 0.07) * monte * 0.25); ctx.lineTo(W, H); ctx.fill(); }
      raf = requestAnimationFrame(passo);
    };
    passo();
    ctl.aoPular.push(() => { if (app) { app.style.transition = 'none'; app.offsetWidth; app.style.transition = ''; } });
    ctl.acoes.ok = () => {
      nevando = false; ctl.el.classList.add('volta'); if (app) app.classList.remove('acinzentado'); pVibrar([30, 40, 30]);
      ctl.depois(1000, ctl.fechar);
    };
    ctl.aoFechar.push(() => { cancelAnimationFrame(raf); if (app) app.classList.remove('acinzentado'); });
  });
}

// ───────── 5. fim do treino ou da corrida: maré cheia ─────────
// o: { titulo, stats: [{ n, rot, dec?, cor? }], xp, xpRot }
function palcoFim(o) {
  palco('pf', ctl => {
    const P = typeof JORNADA !== 'undefined' && JORNADA && JORNADA.personagem;
    const de = P ? Math.min(1, P.xp_no_nivel / P.xp_para_proximo) : 0.5, ate = P ? Math.min(1, (P.xp_no_nivel + o.xp) / P.xp_para_proximo) : de;
    ctl.el.setAttribute('aria-label', `${o.titulo}: ${o.stats.map(s => s.n + ' ' + s.rot).join(', ')}, mais ${o.xp} XP`);
    ctl.el.innerHTML = `<div class="p-in"><span class="cheia">${P_ONDA('#0B5E7C', 18)}</span>
      <span class="it" style="top:calc(7% + env(safe-area-inset-top));animation-delay:.7s"><span class="rot" style="display:block">Maré cheia</span><span style="display:block;font-family:var(--display);font-weight:800;font-size:38px;line-height:1.05">${esc(o.titulo)}</span></span>
      ${o.stats.map((s, k) => `<span class="it" style="top:22%;left:${26 + k * 118}px;animation-delay:${0.85 + k * 0.1}s"><span class="num" data-n="${s.n}" data-dec="${s.dec || 0}" data-ini="${850 + k * 100}"${s.cor ? ` style="color:${s.cor}"` : ''}>0</span><span class="rot">${esc(s.rot)}</span></span>`).join('')}
      <span class="it" style="top:calc(22% + 120px);animation-delay:1.4s"><span class="num" data-n="${o.xp}" data-mais data-ini="1500" data-dur="1300" style="font-size:78px">+0</span><span class="rot">XP ${esc(o.xpRot || '')}${P ? ' · nível ' + P.nivel + ', ' + esc(P.titulo) : ''}</span></span>
      <span class="trilho" style="--de:${(de * 100).toFixed(1)}%;--ate:${(ate * 100).toFixed(1)}%"><i></i><b>${P_BOIA}</b></span>
      <span class="carta"><span class="miolo"><span class="face costas">${P_ESTRELA}</span>
        <span class="face frente"><span style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--campo)">Diário de bordo</span>
        <span style="font-family:var(--display);font-weight:800;font-size:19px;line-height:1.1">O dia entra na Campanha</span>
        <span style="font-size:13px;line-height:1.4">Se o dia fechar uma carta, o despacho chega pelo Telegram em até 15 min.</span></span></span></span>
      <button type="button" class="p-bt escuro" data-p="ok">Fechar</button></div>`;
    ctl.el.querySelector('.cheia svg').style.cssText = 'display:block';
    pContar(ctl, 850);
    pVibrar([40, 60, 40, 60, 160]); pSom(523, 200); setTimeout(() => pSom(659, 220), 140); setTimeout(() => pSom(784, 500), 280);
  });
}

// ───────── 6. celebração dos cachorros (pixel art 16-bit) ─────────
// o: { titulo, sub, img, xp }
function palcoCaes(o) {
  palco('pcaes', ctl => {
    const P = typeof JORNADA !== 'undefined' && JORNADA && JORNADA.personagem;
    const imgUrl = o.img || 'art/caes_comemoracao.jpg';
    ctl.el.setAttribute('aria-label', `${o.titulo}: ${o.sub}`);
    ctl.el.innerHTML = `<div class="p-in" style="background:#070b14;color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:24px 20px 96px;text-align:center">
      <div style="font-size:11.5px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:var(--sol);margin-bottom:8px">🐾 Companheiros Caninos · 16-Bit</div>
      <h2 style="font-family:var(--display);font-size:26px;line-height:1.15;margin:0 0 6px">${esc(o.titulo)}</h2>
      <div style="font-size:14px;opacity:0.85;margin-bottom:14px;max-width:320px">${esc(o.sub)}</div>
      <div style="border-radius:10px;overflow:hidden;border:2px solid rgba(255,180,143,0.45);max-width:440px;width:100%;box-shadow:0 12px 30px rgba(0,0,0,0.7);background:#000">
        <img src="${imgUrl}" alt="${esc(o.titulo)}" style="width:100%;aspect-ratio:16/9;display:block;object-fit:cover;image-rendering:pixelated">
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:16px">
        <span style="font-family:var(--display);font-weight:800;font-size:32px;color:var(--sol)">+${o.xp || 15} XP</span>
        <span style="font-size:13px;opacity:0.8">${P ? 'Nível ' + P.nivel : ''}</span>
      </div>
      <button type="button" class="p-bt escuro" data-p="ok" style="background:var(--sol);color:var(--tinta);font-weight:800;border-color:var(--sol)">Continuar</button>
    </div>`;
    pVibrar([40, 60, 40, 60, 160]);
    pSom(523, 180); setTimeout(() => pSom(659, 200), 120); setTimeout(() => pSom(784, 400), 240);
  });
}
