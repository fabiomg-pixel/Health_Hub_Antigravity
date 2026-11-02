// A Campanha dos 85 (gamificação em RPG). Lê data/jornada.json, gerado por jornada.py a partir dos dados
// reais. Regras: XP só por comportamento, nunca diminui, o peso não dá XP, sem dado não pune.
// Desenho: propostas/gamificacao_rpg.md. Usa os helpers do index.html: esc, fNum, isoLocal, REGISTROS, ONDA.

let JORNADA = null;
fetch('data/jornada.json').then(r => r.ok ? r.json() : null).then(j => {
  if (!j) return; JORNADA = j;
  const id = (location.hash || '#home').slice(1);
  if (typeof DATA === 'undefined' || !DATA) return;   // o plano ainda não chegou: a renderização dele já vai incluir a campanha
  if (['home', 'hoje', 'campanha', ''].includes(id) || /^(seg|ter|qua|qui|sex|sab|dom)$/.test(id)) route();
}).catch(() => {});

let HISTORIA = null;
fetch('data/historia.json').then(r => r.ok ? r.json() : null).then(j => {
  if (!j) return; HISTORIA = j;
  const id = (location.hash || '#home').slice(1);
  if (typeof DATA === 'undefined' || !DATA) return;
  if (['home', 'campanha', ''].includes(id)) route();
}).catch(() => {});

(function estilos() {
  const css = `
  .cp-escuro { background: var(--tinta); color: var(--branco); }
  .cp-escuro .bloco { background: transparent; }
  .cp-escuro .bloco .cab { border-color: var(--branco); }
  .cp-escuro .bloco .cab h2, .cp-escuro .bloco .cab small { color: var(--branco); }
  .cp-escuro .bloco .cab small { opacity: 0.75; }
  .cp-ficha { display: flex; gap: 16px; align-items: center; margin-top: 6px; }
  .cp-ficha svg { flex: none; width: 74px; height: 86px; }
  .cp-nome { font-family: var(--display); font-weight: 800; font-size: 26px; line-height: 1.05; }
  .cp-titulo { font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--sol); margin-top: 4px; }
  .cp-classe { font-size: 13px; opacity: 0.8; margin-top: 2px; }
  .cp-xp { margin-top: 16px; }
  .cp-xp .tr { height: 10px; background: rgba(255,255,255,0.16); }
  .cp-xp .tr i { display: block; height: 100%; background: var(--sol); transition: width 1s var(--curva); }
  .cp-xp .lg { display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 600; margin-top: 6px; opacity: 0.85; }
  .cp-chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; }
  .cp-chip { border: 2px solid rgba(255,255,255,0.35); padding: 10px 10px 9px; min-width: 0; }
  .cp-chip b { display: block; font-family: var(--display); font-weight: 800; font-size: 20px; line-height: 1; }
  .cp-chip span { display: block; font-size: 11px; font-weight: 600; margin-top: 5px; opacity: 0.8; line-height: 1.25; }
  .cp-chip.ferido { border-color: #FF6B5E; } .cp-chip.ferido b { color: #FF6B5E; }
  .cp-mapa { width: 100%; height: auto; display: block; margin: 6px 0 2px; }
  .cp-hp { margin-top: 10px; }
  .cp-hp .tr { height: 12px; background: rgba(255,255,255,0.14); border: 2px solid var(--branco); }
  .cp-hp .tr i { display: block; height: 100%; background: #FF6B5E; transition: width 1.2s var(--curva); }
  .cp-hp .lg { font-size: 12.5px; margin-top: 6px; opacity: 0.85; line-height: 1.4; }
  .cp-m { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--fraca); }
  .cp-escuro .cp-m { border-color: rgba(255,255,255,0.18); }
  .cp-m .nm { font-weight: 600; font-size: 15px; } .cp-m .nm small { display: block; font-weight: 500; font-size: 12.5px; color: var(--sec); margin-top: 2px; }
  .cp-escuro .cp-m .nm small { color: rgba(255,255,255,0.7); }
  .cp-m .ct { font-family: var(--display); font-weight: 800; font-size: 18px; white-space: nowrap; }
  .cp-m .mb { grid-column: 1 / -1; height: 6px; background: var(--fraca); }
  .cp-escuro .cp-m .mb { background: rgba(255,255,255,0.15); }
  .cp-m .mb i { display: block; height: 100%; background: var(--campo); }
  .cp-escuro .cp-m .mb i { background: var(--sol); }
  .cp-m.ok .ct { color: var(--campo); } .cp-escuro .cp-m.ok .ct { color: var(--sol); }
  .cp-atr { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .cp-atr div { border-top: 3px solid var(--sol); padding-top: 8px; min-width: 0; }
  .cp-atr b { display: block; font-family: var(--display); font-weight: 800; font-size: 24px; line-height: 1.05; }
  .cp-atr small { display: block; font-size: 11.5px; font-weight: 600; opacity: 0.8; margin-top: 3px; line-height: 1.3; }
  .cp-atr .ro { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; }
  .cp-rel { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  @media (min-width: 720px) { .cp-rel { grid-template-columns: repeat(3, 1fr); } }
  .cp-rel div { display: flex; gap: 10px; align-items: flex-start; padding: 10px; border: 2px solid var(--sol); min-width: 0; }
  .cp-rel div.tr { border-color: rgba(255,255,255,0.22); opacity: 0.6; }
  .cp-rel svg { flex: none; width: 30px; height: 30px; }
  .cp-rel b { display: block; font-size: 13.5px; line-height: 1.2; } .cp-rel small { display: block; font-size: 11.5px; opacity: 0.8; margin-top: 3px; line-height: 1.3; }
  .cp-livro details { border-bottom: 1px solid rgba(255,255,255,0.18); }
  .cp-livro summary { padding: 14px 0; font-family: var(--display); font-weight: 700; font-size: 17px; cursor: pointer; list-style: none; }
  .cp-livro summary::after { content: "+"; float: right; font-weight: 800; } .cp-livro details[open] summary::after { content: "–"; }
  .cp-livro p { font-size: 15.5px; line-height: 1.62; margin: 0 0 14px; opacity: 0.92; font-family: Georgia, 'Times New Roman', serif; }
  .cp-regras .par { font-size: 14px; }
  .cp-mh { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--fraca); }
  .cp-mh .bx { flex: none; width: 22px; height: 22px; border: 2px solid var(--tinta); display: flex; align-items: center; justify-content: center; }
  .cp-mh.ok .bx { background: var(--campo); border-color: var(--campo); }
  .cp-mh.nd .bx { border-style: dashed; border-color: var(--sec); }
  .cp-mh .tx { flex: 1; min-width: 0; font-size: 14.5px; font-weight: 600; } .cp-mh .tx small { display: block; font-weight: 500; font-size: 12px; color: var(--sec); }
  .cp-mh .xp { font-family: var(--display); font-weight: 800; font-size: 14px; color: var(--campo); white-space: nowrap; }
  .cp-mh.ok .tx { text-decoration: line-through; text-decoration-thickness: 1.5px; color: var(--sec); }
  .cp-aventura { margin-top: 4px; }
  .cp-semana { border: 2px solid rgba(255,255,255,0.35); padding: 16px 16px 14px; margin-bottom: 14px; }
  .cp-semana .abre { font-family: Georgia, 'Times New Roman', serif; font-size: 15.5px; line-height: 1.62; margin: 10px 0 12px; opacity: 0.95; }
  .cp-semana .jogo { font-size: 13.5px; font-weight: 700; color: var(--sol); }
  .cp-semana .cons { font-size: 12.5px; line-height: 1.5; opacity: 0.78; margin-top: 10px; }
  .cp-crise { border: 2px solid #FF6B5E; padding: 14px 16px; margin-bottom: 14px; background: rgba(255,107,94,0.10); }
  .cp-crise b.t { font-family: var(--display); font-size: 17px; color: #FF9A90; }
  .cp-trilha { display: grid; gap: 0; margin-top: 4px; }
  .cp-et { display: flex; align-items: center; gap: 12px; padding: 7px 0; font-size: 14.5px; border-bottom: 1px solid rgba(255,255,255,0.10); }
  .cp-et i { flex: none; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.5); border-radius: 50%; box-sizing: border-box; }
  .cp-et.feita { opacity: 0.55; } .cp-et.feita i { background: var(--sol); border-color: var(--sol); }
  .cp-et.atual { font-weight: 800; } .cp-et.atual i { background: #fff; border-color: #fff; box-shadow: 0 0 0 4px rgba(255,255,255,0.2); }
  .cp-et.chefe { font-family: var(--display); }
  .cp-comp { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .cp-pers { border: 2px solid rgba(255,255,255,0.35); padding: 10px 10px 9px; min-width: 0; }
  .cp-pers b { display: block; font-family: var(--display); font-size: 16px; }
  .cp-pers span { display: block; font-size: 12px; opacity: 0.75; margin-top: 1px; }
  .cp-pers em { display: inline-block; font-style: normal; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; margin-top: 8px; padding: 2px 6px; border: 1.5px solid currentColor; }
  .cp-pers.ativa em { color: #5FD3C4; } .cp-pers.ferida em { color: #FFD166; } .cp-pers.capturada, .cp-pers.perdida { opacity: 0.7; border-color: #FF6B5E; } .cp-pers.capturada em, .cp-pers.perdida em { color: #FF9A90; }
  .cp-bag { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .cp-slot { border: 2px dashed rgba(255,255,255,0.3); padding: 10px; min-height: 64px; font-size: 13px; }
  .cp-slot.cheio { border-style: solid; border-color: var(--sol); } .cp-slot b { display: block; font-family: var(--display); font-size: 14.5px; }
  .cp-slot span { display: block; font-size: 12px; opacity: 0.75; margin-top: 2px; }
  .cp-pixel { width: 100%; display: block; image-rendering: pixelated; image-rendering: crisp-edges; border: 2px solid rgba(255,255,255,0.35); background: #0B1530; aspect-ratio: 16 / 9; }
  .cp-cena { margin-bottom: 14px; }
  .cp-cena h3 { font-family: var(--display); font-size: 21px; margin: 12px 0 0; }
  .cp-cena .tx { font-family: Georgia, 'Times New Roman', serif; font-size: 15.5px; line-height: 1.62; margin: 8px 0 0; opacity: 0.95; }
  .cp-cena .ef { font-size: 13px; line-height: 1.55; margin-top: 8px; color: var(--sol); font-weight: 600; }
  .cp-tiers { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .cp-tiers button { background: transparent; color: #fff; border: 2px solid rgba(255,255,255,0.4); padding: 7px 10px; min-height: 44px; font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer; min-height: 36px; }
  .cp-tiers button.on { background: var(--sol); color: var(--tinta); border-color: var(--sol); }
  .cp-mini { width: 32px; height: 36px; image-rendering: pixelated; display: block; margin-bottom: 6px; }
  .cp-leitura { position: relative; }
  .cp-leitura p { font-family: Georgia, 'Times New Roman', serif; font-size: 16.5px; line-height: 1.72; margin: 0 0 15px; opacity: 0.96; }
  .cp-leitura h4 { font-family: var(--display); font-size: 18px; letter-spacing: 0.01em; margin: 26px 0 10px; color: var(--sol); }
  .cp-leitura ul { margin: 0 0 15px; padding-left: 20px; } .cp-leitura li { font-family: Georgia, serif; font-size: 16px; line-height: 1.6; margin-bottom: 8px; }
  .cp-leitura.fechada { max-height: 340px; overflow: hidden; }
  .cp-leitura.fechada::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 120px; background: linear-gradient(rgba(11,27,38,0), var(--tinta)); }
  .cp-parte { border-top: 2px solid rgba(127,127,127,0.35); padding: 4px 0 12px; }
  .cp-parte > summary { cursor: pointer; min-height: 52px; display: flex; flex-direction: column; justify-content: center; gap: 2px; list-style: none; }
  .cp-parte > summary b { font-family: var(--display); font-size: 19px; }
  .cp-parte > summary small { font-size: 13px; opacity: 0.75; }
  .cp-parte h4 { font-family: var(--display); font-size: 16px; margin: 16px 0 6px; }
  .cp-ler { margin-top: 12px; background: transparent; color: #fff; border: 2px solid var(--sol); padding: 10px 14px; font: inherit; font-weight: 700; cursor: pointer; min-height: 44px; }
  .cp-selo { display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 7px; border: 1.5px solid var(--sol); color: var(--sol); margin-right: 8px; }
  .cp-nota { font-size: 12.5px; opacity: 0.72; line-height: 1.5; margin-top: 8px; }
  .cp-conseq { border-left: 3px solid var(--sol); padding: 8px 0 8px 12px; margin: 14px 0 4px; font-size: 13.5px; line-height: 1.55; }
  .cp-conseq li { margin-bottom: 4px; }
  .cp-dia { padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.12); }
  .cp-dia > b { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.7; }
  .cp-ev { display: grid; grid-template-columns: 20px 1fr; gap: 8px; margin-top: 7px; font-size: 14px; line-height: 1.5; }
  .cp-cinematica { position: relative; margin: 16px 0 12px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.22); background: #070a12; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
  .cp-cinematica-video { width: 100%; aspect-ratio: 16/9; display: block; object-fit: cover; background: #080b12; }
  .cp-cinematica-tabs { display: flex; overflow-x: auto; gap: 6px; padding: 8px 10px; background: rgba(10,14,24,0.95); border-top: 1px solid rgba(255,255,255,0.12); scrollbar-width: none; }
  .cp-cinematica-tabs::-webkit-scrollbar { display: none; }
  .cp-cinematica-btn { flex: 1; min-width: 90px; padding: 7px 10px; font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.7); background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
  .cp-cinematica-btn.on, .cp-cinematica-btn:hover { color: #fff; background: rgba(255,255,255,0.14); border-color: var(--sol); }
  .cp-cinematica-caption { padding: 10px 14px 12px; font-size: 13px; line-height: 1.45; color: rgba(255,255,255,0.9); background: rgba(10,14,24,0.95); }
  .cp-cinematica-caption b { color: var(--sol); font-weight: 700; }
  .cp-boss-art { position: relative; margin-top: 10px; border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,107,94,0.35); }
  .cp-boss-art video, .cp-boss-art img { width: 100%; aspect-ratio: 16/9; display: block; object-fit: cover; }
  .cp-ev i { font-style: normal; text-align: center; font-weight: 800; }
  .cp-ev small { display: block; font-size: 12px; color: var(--sol); opacity: 0.9; margin-top: 2px; }
  .cp-ev.maldicao, .cp-ev.percalco, .cp-ev.juramento_quebrado { color: #FFC9C3; }
  .cp-lista { display: grid; gap: 8px; } .cp-lista > div { border: 2px solid rgba(255,255,255,0.25); padding: 10px 12px; font-size: 13.5px; line-height: 1.5; }
  .cp-lista > div b { display: block; font-family: var(--display); font-size: 15px; margin-bottom: 2px; }
  .cp-lista > div.mal { border-color: #FF6B5E; } .cp-lista > div.usada { opacity: 0.5; }
  .cp-mundo details { border-bottom: 1px solid rgba(255,255,255,0.18); }
  .cp-mundo summary { padding: 13px 0; font-family: var(--display); font-weight: 700; font-size: 16px; cursor: pointer; list-style: none; }
  .cp-mundo summary::after { content: "+"; float: right; } .cp-mundo details[open] summary::after { content: "–"; }
  @keyframes cp-boia { 0%, 100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-3px) rotate(5deg); } }
  .cp-marca { animation: cp-boia 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: 50% 100%; }
  `;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
})();

const CP_STATUS = { concluido: 'concluído', em_andamento: 'em andamento', nao_concluido: 'não concluído', resgatado: 'resgatado', resgate_possivel: 'pode ser resgatado' };
const cpDDMM = iso => iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '';
function cpTituloCapitulo() {
  const H = typeof HISTORIA !== 'undefined' ? HISTORIA : null;
  if (H && H.semana && H.semana.titulo) return `Parte ${H.semana.parte}: ${H.semana.titulo}`;
  const j = JORNADA, n = j.capitulo.numero;
  const c = (j.livro || []).find(l => new RegExp('^Cap[ií]tulo ' + n + '\\b').test(l.titulo));
  return c ? c.titulo.replace(/\s*\(.*\)\s*$/, '') : 'Capítulo ' + n;
}
function cpBarraXP() {
  const p = JORNADA.personagem, f = Math.max(0, Math.min(1, p.xp_no_nivel / p.xp_para_proximo));
  return `<div class="cp-xp"><div class="tr" role="img" aria-label="${p.xp_no_nivel} de ${p.xp_para_proximo} XP para o nível ${p.nivel + 1}"><i style="width:${(f * 100).toFixed(1)}%"></i></div>
    <div class="lg"><span>${fNum(p.xp_no_nivel, 0)} de ${fNum(p.xp_para_proximo, 0)} XP para o nível ${p.nivel + 1}</span><span>${fNum(p.xp_total, 0)} no total</span></div></div>`;
}
function cpMissoes(ms) {
  return ms.map(m => { const f = Math.max(0, Math.min(1, m.meta ? m.feito / m.meta : 0));
    return `<div class="cp-m ${m.cumprida ? 'ok' : ''}"><span class="nm">${esc(m.nome)}</span><span class="ct">${m.feito} de ${m.meta}</span>
      <span class="mb"><i style="width:${(f * 100).toFixed(0)}%"></i></span></div>`; }).join('');
}
function cpResgate() {
  const r = (JORNADA.semanas || []).find(s => s.status === 'resgate_possivel');
  return r ? `<div class="par" style="padding-top:12px">O capítulo de ${cpDDMM(r.segunda)} pode ser <b>resgatado</b>: conclua este capítulo, com 3 dias ativos em 4 dias corridos, e a saga continua.</div>` : '';
}

// ── Início: a parte da semana
function cpAmeacaCurta() {
  const H = typeof HISTORIA !== 'undefined' ? HISTORIA : null; if (!H || !H.semana) return '';
  const rec = cpUltimoDesfecho(), hoje = isoLocal();
  if (rec && rec.fim && (new Date(hoje) - new Date(rec.fim)) / 86400000 <= 3)
    return `<div class="par" style="padding:10px 0 4px"><b>O desfecho da semana saiu:</b> ${esc(rec.titulo)}. <a href="#campanha" style="text-decoration:underline">Ver a cena</a></div>` + cpAmeacaBase(H);
  return cpAmeacaBase(H);
}
function cpAmeacaBase(H) {
  const p = H.premissa_proxima, e = H.encerramento;
  const novo = (e ? `<div class="par" style="padding:10px 0 2px"><b>Parte ${e.parte || e.n}${e.simulacao ? ' (simulação)' : ''}:</b> ${esc(e.titulo)}, ≈ ${e.minutos} min. ` : '<div class="par" style="padding:10px 0 2px">') +
    (p ? `<b>Parte ${p.parte || p.n}:</b> ${esc(p.titulo)}, ≈ ${p.minutos} min. ` : '') + ((e || p) ? `<a href="#campanha" style="text-decoration:underline">Ler na Campanha</a></div>` : '</div>');
  if (e || p) return novo;
  const aviso = H.crise ? `<b>Crise:</b> ${esc(H.crise.companheiro)} está pres${H.crise.g} (${H.crise.prazo} ${H.crise.prazo === 1 ? 'semana' : 'semanas'}). ` : '';
  return `<div class="par" style="padding:10px 0 4px">${aviso}<b>${esc(H.semana.titulo)}.</b> Em jogo: ${esc(H.semana.em_jogo)}</div>`;
}
function blocoCapitulo() {
  if (!JORNADA) return '';
  const j = JORNADA, p = j.personagem, c = j.capitulo;
  return `<section class="bloco"><div class="cab"><h2>${esc(cpTituloCapitulo())}</h2><small>nível ${p.nivel} · ${esc(p.titulo)}</small></div>
    ${cpBarraXP()}
    ${cpAmeacaCurta()}
    ${cpMissoes(c.missoes)}
    <div class="par" style="padding-top:12px">Saga: <b>${j.saga.atual} ${j.saga.atual === 1 ? 'capítulo' : 'capítulos'}</b> seguidos · maior: ${j.saga.maior}. ${c.status === 'concluido' ? 'Este capítulo já está concluído.' : 'Capítulo concluído = todas as missões, ou todas menos uma.'}</div>
    ${cpResgate()}
    <a class="botao claro" href="#campanha" style="margin-top:14px">Abrir a Campanha</a></section>`;
}

// ── Hoje: as missões de hoje, só o que está programado; o registro do dia marca na hora
function cpFeitoAoVivo(m) {
  const iso = isoLocal(), R = (typeof REGISTROS !== 'undefined' ? REGISTROS : []).filter(x => x.data === iso && ((x.texto || '').trim() || x.foto));
  const t = x => (x.texto || '');
  if (/^Registrar o almoço/.test(m.nome)) return R.some(x => x.tipo === 'Refeição' && x.refeicao === 'Almoço') || m.feito;
  if (/^Registrar o lanche/.test(m.nome)) return R.some(x => x.tipo === 'Refeição' && x.refeicao === 'Lanche') || m.feito;
  if (/^Sessão de força/.test(m.nome)) return R.some(x => x.tipo === 'Treino' && /lower|upper|for[çc]a|muscula|academia|leg press|supino|full body/i.test(t(x))) || m.feito;
  if (/^Corrida/.test(m.nome)) return R.some(x => (x.tipo === 'Treino' && /corrida|esteira/i.test(t(x))) || (x.tipo === 'Observação' && /corrida guiada/i.test(t(x)) && /complet/i.test(t(x)) && !/incomplet/i.test(t(x)))) || m.feito;
  if (/futebol|jogo|campeonato/i.test(m.nome)) return R.some(x => x.tipo === 'Treino' && /futebol|jogo|campeonato/i.test(t(x))) || m.feito;
  return m.feito;
}
function blocoMissoesHoje() {
  if (!JORNADA || JORNADA.hoje.data !== isoLocal() || !(JORNADA.hoje.missoes || []).length) return '';
  const ms = JORNADA.hoje.missoes.map(m => ({ ...m, ok: cpFeitoAoVivo(m) === true }));
  const xp = Math.min(250, ms.reduce((a, m) => a + (m.ok ? m.xp : 0), 0));
  return `<section class="bloco"><div class="cab"><h2>Missões de hoje</h2><small>+${xp} XP até agora</small></div>` +
    ms.map(m => `<div class="cp-mh ${m.ok ? 'ok' : (m.sem_dado ? 'nd' : '')}"><span class="bx">${m.ok ? ico('visto', 13, 3.5).replace('currentColor', '#fff') : ''}</span>
      <span class="tx">${esc(m.nome)}${m.sem_dado ? '<small>o relógio ainda não mandou o dado de hoje</small>' : (m.estalagem ? '<small>o treinador propõe pelo Telegram; só conta depois do seu sim</small>' : '')}</span>
      <span class="xp">${m.xp ? '+' + m.xp : ''}</span></div>`).join('') +
    `<div class="par" style="color:var(--sec);padding-top:10px">XP só por comportamento: o peso nunca dá nem tira XP.</div></section>`;
}

// ── Evolução: a porta da Campanha
function linkCampanha() {
  if (!JORNADA) return '';
  const p = JORNADA.personagem;
  return `<section class="bloco" style="padding-bottom:0"><a class="linha" href="#campanha"><span class="corpo">A Campanha<small>nível ${p.nivel} · ${esc(p.titulo)} · ${esc(cpTituloCapitulo())}</small></span><span class="num">abrir</span></a></section>`;
}

// ── a tela da Campanha
const CP_CHEFE = {
  'I': '<path d="M12 2l8 3v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5z"/>',
  'II': '<path d="M3 20h18M4 20V8h16v12M4 12h16M4 16h16M9 8v4M15 8v4M7 12v4M12 12v4M17 12v4M9 16v4M15 16v4"/>',
  'III': '<path d="M2 20l7-12 4 6 3-4 6 10z"/><path d="M8 10l1.5 2 1.5-2"/>',
  'IV': '<path d="M3 14c3-1 5-4 6-8 1 3 3 5 6 5 2 0 4-1 6-3-1 5-4 9-9 10-4 .5-7-1-9-4z"/><circle cx="15" cy="12" r="1"/>'
};
function cpMapa() {
  const j = JORNADA, arcos = [['I', 'O Muro de Brasa', 'O Colosso'], ['II', 'A Planície de Sal', 'A Muralha Viva'], ['III', 'As Terras Altas', 'O Vigia'], ['IV', 'O Monte Vhar', 'Vharunax']];
  const pts = [[24, 196], [96, 150], [176, 172], [250, 104], [312, 40]];   // 95, 92,5, 90, 87,5, 85
  const atual = j.arco ? j.arco.num : 'I';
  const d = 'M24 196 C 56 196, 70 150, 96 150 S 150 176, 176 172 S 226 112, 250 104 S 300 60, 312 40';
  const ilha = (i) => { const [x, y] = pts[i + 1], a = arcos[i], on = a[0] === atual, feito = ['I', 'II', 'III', 'IV'].indexOf(atual) > i;
    return `<g opacity="${on || feito ? 1 : 0.5}"><circle cx="${x}" cy="${y}" r="17" fill="${on ? 'var(--sol)' : 'none'}" stroke="${on ? 'var(--sol)' : '#fff'}" stroke-width="2"/>
      <g transform="translate(${x - 10} ${y - 10}) scale(0.83)" fill="none" stroke="${on ? 'var(--tinta)' : '#fff'}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${CP_CHEFE[a[0]]}</g>
      <text x="${x}" y="${y + 31}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff" letter-spacing="0.06em">ARCO ${a[0]}</text>
      <text x="${x}" y="${y + 42}" text-anchor="middle" font-size="9" fill="#fff" opacity="0.8">${a[1]}</text></g>`; };
  return `<svg class="cp-mapa" viewBox="0 0 340 240" role="img" aria-label="Mapa da campanha: quatro arcos de 95 a 85 kg; você está no arco ${atual}">
    <path id="cp-rota" d="${d}" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>
    <text x="24" y="226" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff">95 kg</text>
    <circle cx="24" cy="196" r="5" fill="#fff"/>
    ${[0, 1, 2, 3].map(ilha).join('')}
    <text x="312" y="16" text-anchor="middle" font-size="9.5" font-weight="700" fill="var(--sol)">85 kg</text>
    <g id="cp-marca"><g class="cp-marca"><path d="M-5 0C-7-6-6-11 0-12c6 1 7 6 5 12z" fill="var(--sol)" stroke="#fff" stroke-width="1.4"/><rect x="-6" y="-5" width="12" height="2.4" fill="#fff"/></g></g>
  </svg>`;
}
function cpPosicionarMarca() {
  const p = document.getElementById('cp-rota'), m = document.getElementById('cp-marca');
  if (!p || !m || JORNADA.media_28d == null) return;
  const f = Math.max(0, Math.min(1, (95 - JORNADA.media_28d) / 10)), L = p.getTotalLength(), pt = p.getPointAtLength(L * f);
  m.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${(pt.y - 2).toFixed(1)})`);
}
const CP_REL = '<path d="M12 2l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 15.6 6.6 18.5l1.2-6L3.3 8.3l6.1-.7z"/>';
const CP_TRANCA = '<rect x="5" y="11" width="14" height="10"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>';

// ── A aventura: o mundo muda pelo desempenho da semana (historia.py). Não recita o dia: mostra a estrada, a companhia e o que está em jogo.
const CP_ESTADO = { ativa: 'de pé', ferida: 'ferida', capturada: 'capturada', perdida: 'perdida' };
function cpEstadoDe(c) { const m = c.g === 'o'; return { ativa: 'de pé', ferida: m ? 'ferido' : 'ferida', capturada: m ? 'capturado' : 'capturada', perdida: m ? 'perdido' : 'perdida' }[c.estado] || c.estado; }

// ── A cena em pixel art do desfecho da semana (pixel.js)
const CP_TIERS = [
  ['atual', 'Desta semana'], ['triunfo', 'Triunfo'], ['avanco', 'Avanço'], ['sustenta', 'Impasse'], ['reves', 'Revés'], ['crise', 'Crise'],
];
const CP_TIER_TXT = {
  triunfo: 'Triunfo: todas as missões. A companhia avança 2 etapas, ganha 2 runas e quem estava ferido ou perdido volta.',
  avanco: 'Avanço: parte concluída (todas as missões menos uma). A companhia avança 1 etapa e ganha 1 runa.',
  sustenta: 'Impasse: metade das missões ou mais. A companhia segura o terreno e se recupera, sem avançar.',
  reves: 'Revés: semana fraca. Um companheiro sai ferido do trecho.',
  crise: 'Crise: semana vazia, ou duas fracas seguidas. A companhia recua uma etapa e um companheiro é capturado; há 3 semanas para o resgate.',
  sem_dado: 'Sem leitura do relógio: nada foi decidido nesse dia.',
};
function cpUltimoDesfecho() { const cs = ((HISTORIA || {}).capitulos || []).filter(c => c.concluido && c.cena); return cs[cs.length - 1] || null; }
function cpParamsPreview(tier) {
  const H = HISTORIA, amb = (H.semana && H.semana.ambiente) || {}, comp = {};
  H.companhia.forEach(c => { comp[c.id] = c.estado === 'ativa' || c.estado === 'ferida' ? c.estado : 'ativa'; });
  const e = H.etapa, cap = H.etapas.length - 2;
  const depois = { triunfo: Math.min(e + 2, cap), avanco: Math.min(e + 1, cap), crise: Math.max(e - 1, 0) }[tier];
  return { tier, etapa_antes: e, etapa_depois: depois == null ? e : depois, arco: H.arco.id, clima: amb.clima, lua: amb.lua, companhia: comp,
    afetado: ['reves', 'crise'].includes(tier) ? 'brisa' : null, retorna: null, itens: ['forcas', 'ativos'].slice(0, tier === 'triunfo' ? 2 : (tier === 'avanco' ? 1 : 0)), talisma: tier === 'sustenta' };
}
function cpDesfecho() {
  const H = HISTORIA; if (!H) return '';
  const u = cpUltimoDesfecho();
  return `<section class="bloco cp-cena"><div class="cab"><h2>O desfecho</h2><small>${u ? 'capítulo ' + u.n + ' · ' + esc(u.periodo) : 'pré-visualização'}</small></div>
    <canvas id="cp-pixel" class="cp-pixel" role="img" aria-label="Cena em pixel art do desfecho da semana"></canvas>
    <div class="cp-tiers" id="cp-tiers">${CP_TIERS.filter(t => t[0] !== 'atual' || u).map(t => `<button data-t="${t[0]}">${t[1]}</button>`).join('')}</div>
    <div id="cp-cena-txt"></div></section>`;
}
function cpLigarPixel() {
  const H = HISTORIA, cv = document.getElementById('cp-pixel'); if (!H || !cv || typeof PIXEL === 'undefined') return;
  const proj = H.encerramento && H.projecao && H.encerramento.simulacao ? { cena: H.projecao.cena, titulo: H.encerramento.titulo, desfecho: '', efeitos: [], ok: H.projecao.ok, total: H.projecao.n } : null;
  const u = proj || cpUltimoDesfecho(), tx = document.getElementById('cp-cena-txt');
  const mostrar = (t) => {
    document.querySelectorAll('#cp-tiers button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    if (t === 'atual' && u && proj) { PIXEL.iniciar(cv, u.cena); tx.innerHTML = ''; return; }
    if (t === 'atual' && u) {
      PIXEL.iniciar(cv, u.cena);
      tx.innerHTML = `<h3>${esc(u.titulo)}</h3><p class="tx">${esc(u.desfecho)}</p>${(u.efeitos || []).length ? `<div class="ef">${u.efeitos.map(esc).join(' ')}</div>` : ''}<div class="cons" style="font-size:12.5px;opacity:.75;margin-top:8px">${u.ok} de ${u.total} missões nesta semana.</div>`;
    } else {
      PIXEL.iniciar(cv, cpParamsPreview(t));
      tx.innerHTML = `<div class="cons" style="font-size:13.5px;line-height:1.55;margin-top:12px"><b>Pré-visualização.</b> ${esc(CP_TIER_TXT[t] || '')}</div>`;
    }
  };
  document.querySelectorAll('#cp-tiers button').forEach(b => b.addEventListener('click', () => mostrar(b.dataset.t)));
  mostrar(u ? 'atual' : 'avanco');
  cpLigarLeituras();
  document.querySelectorAll('canvas.cp-mini').forEach(m => PIXEL.miniatura(m, m.dataset.id, m.dataset.estado));
}

// ── Leitura longa: o capítulo que fecha, a aventura que abre, o diário de bordo e o Livro do Mundo
function cpMd(txt) {
  const linha = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  return (txt || '').split(/\n\s*\n/).map(bl => {
    bl = bl.trim(); if (!bl) return '';
    if (bl.startsWith('## ')) return `<h4>${linha(bl.slice(3))}</h4>`;
    if (/^- /.test(bl)) return '<ul>' + bl.split(/\n(?=- )/).map(li => `<li>${linha(li.replace(/^- /, ''))}</li>`).join('') + '</ul>';
    return `<p>${linha(bl).replace(/\n/g, '<br>')}</p>`;
  }).join('');
}
function cpLeitura(id, txt, minutos, rotulo) {
  return `<div class="cp-leitura fechada" id="${id}">${cpMd(txt)}</div>
    <button class="cp-ler" data-alvo="${id}">${rotulo} (≈ ${minutos} min de leitura)</button>`;
}
function cpLigarLeituras() {
  document.querySelectorAll('.cp-ler[data-alvo]').forEach(b => b.addEventListener('click', () => {
    const el = document.getElementById(b.dataset.alvo); if (!el) return; const fechada = el.classList.toggle('fechada');
    b.textContent = fechada ? b.textContent.replace(/^Recolher/, 'Ler') : 'Recolher'; if (fechada) el.scrollIntoView({ block: 'start' });
  }));
}
const CP_ICO = { missao: '★', bencao: '✦', achado: '+', quieto: '·', percalco: '−', maldicao: '!', conquista: '+', presente: '✦', neutro: '·', juramento_quebrado: '!' };
function cpPrologo() {
  const p = (HISTORIA || {}).prologo; if (!p) return '';
  return `<section class="bloco"><div class="cab"><h2>Prólogo</h2><small>o mundo e a companhia</small></div>
    <div style="border-radius:6px;overflow:hidden;margin:10px 0 14px;border:1px solid rgba(255,255,255,0.2)">
      <img src="art/baluarte_do_vento.jpg" alt="O Baluarte do Vento" style="width:100%;aspect-ratio:16/9;display:block;object-fit:cover;">
    </div>
    <h3 style="font-family:var(--display);font-size:24px;margin:2px 0 0">${esc(p.subtitulo || p.titulo)}</h3>
    <div style="margin-top:14px">${cpLeitura('cp-prol', p.texto, p.minutos, 'Ler o prólogo inteiro')}</div></section>`;
}
function cpEncerramento() {
  const H = HISTORIA, e = H && H.encerramento; if (!e) return '';
  const pj = H.projecao, aberta = pj && e.simulacao;
  const ef = (pj && pj.efeitos) || [];
  return `<section class="bloco cp-cena"><div class="cab"><h2>Parte ${esc(e.parte || String(e.n))}</h2><small>${e.simulacao ? '<span class="cp-selo">simulação</span>' : ''}${aberta ? 'o desfecho desta semana' : 'a última parte fechada'}</small></div>
    <h3 style="font-family:var(--display);font-size:24px;margin:2px 0 0">${esc(e.titulo)}</h3>${e.subtitulo ? `<div style="font-family:Georgia,serif;font-style:italic;opacity:.8;margin-top:2px">${esc(e.subtitulo)}</div>` : ''}
    ${e.nota ? `<div class="cp-nota">${esc(e.nota)}</div>` : ''}
    <canvas id="cp-pixel" class="cp-pixel" style="margin-top:14px" role="img" aria-label="Cena em pixel art do desfecho"></canvas>
    ${aberta && pj.falta_para_avanco > 0 ? `<div class="cp-conseq"><b>O desfecho ainda pode mudar.</b> Até agora, ${pj.ok} de ${pj.n} missões da semana: a parte termina em <b>${{ triunfo: 'triunfo', avanco: 'avanço', sustenta: 'impasse', reves: 'revés', crise: 'crise' }[pj.tier] || pj.tier}</b>. Mais ${pj.falta_para_avanco} ${pj.falta_para_avanco === 1 ? 'missão' : 'missões'} até o fechamento e ela vira <b>avanço</b>: o final do texto muda.</div>` : ''}
    ${ef.length ? `<div class="cp-conseq"><b>Consequências${aberta ? ' (se fechasse agora)' : ''}:</b><ul style="margin:6px 0 0;padding-left:18px">${ef.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    <div style="margin-top:16px">${cpLeitura('cp-enc', e.texto, e.minutos, 'Ler o capítulo inteiro')}</div>
    ${cpMarcos(e.marcos)}
    <div class="cp-tiers" id="cp-tiers" style="margin-top:18px">${CP_TIERS.map(t => `<button data-t="${t[0]}">${t[0] === 'atual' ? 'Esta cena' : t[1]}</button>`).join('')}</div>
    <div id="cp-cena-txt"></div></section>`;
}
// Os despachos que chegaram pelo Telegram durante a semana e onde cada um entrou na história (pedido do Fabio, 29/10).
function cpMarcos(m) {
  if (!m || !m.length) return '';
  return `<details class="cp-marcos" style="margin-top:16px"><summary><b>Os marcos desta parte</b> · ${m.length} despachos e onde entraram na história</summary>` +
    m.map(x => `<div class="cp-ev ${esc(x.tipo || '')}"><i>${CP_ICO[x.tipo] || '·'}</i><span><b>${esc(x.dia || '')}</b> ${esc(x.carta || '')}<small>${esc(x.marco || '')}</small>` +
      `<span style="display:block;margin-top:4px;font-family:Georgia,serif">${x.secao ? `<b>${esc(x.secao)}.</b> ` : ''}${esc(x.como || '')}</span></span></div>`).join('') + `</details>`;
}
function cpPremissa() {
  const H = HISTORIA; if (!H) return '';
  const p = H.premissa_proxima || H.premissa_atual; if (!p) return '';
  const proxima = p === H.premissa_proxima;
  return `<section class="bloco"><div class="cab"><h2>Parte ${esc(p.parte || String(p.n))}</h2><small>${p.simulacao ? '<span class="cp-selo">simulação</span>' : ''}${proxima ? 'a próxima aventura' : 'a aventura desta semana'}</small></div>
    <h3 style="font-family:var(--display);font-size:24px;margin:2px 0 0">${esc(p.titulo)}</h3>${p.nota ? `<div class="cp-nota">${esc(p.nota)}</div>` : ''}
    <div style="margin-top:14px">${cpLeitura('cp-prem', p.texto, p.minutos, 'Ler a premissa inteira')}</div></section>`;
}
function cpDiario() {
  const H = HISTORIA, d = H && H.diario; if (!d || !d.length) return '';
  return `<section class="bloco"><div class="cab"><h2>Diário de bordo</h2><small>o que acontece ao longo da parte; o preço e o prêmio chegam no fechamento</small></div>` +
    d.map(x => `<div class="cp-dia"><b>${esc(x.dia)}</b>${x.eventos.map(ev => `<div class="cp-ev ${ev.tipo}"><i>${CP_ICO[ev.tipo] || '·'}</i><span>${esc(ev.despacho || ev.texto)}${ev.marcas.length ? `<small>${ev.marcas.map(esc).join(' · ')}</small>` : ''}</span></div>`).join('')}</div>`).join('') + `</section>`;
}
function cpTesouro() {
  const H = HISTORIA; if (!H) return '';
  const rel = H.reliquias || [], mal = H.maldicoes || [], mat = H.materiais || {}, pj = H.projecao;
  const proj = pj && pj.depois ? `<div class="cp-nota" style="margin-top:10px">Se a semana fechasse agora: ${pj.depois.reliquias.length} relíquias, ${pj.depois.maldicoes.length ? 'maldição: ' + pj.depois.maldicoes.map(m => m === 'macula_de_cinza' ? 'Mácula de Cinza' : 'Sussurro da Rainha').join(', ') : 'nenhuma maldição'}, ${pj.depois.mochila.length} de 3 runas, ${pj.depois.materiais.estilha || 0} de 5 estilhas para a Lâmina Estelar, ${pj.depois.materiais.pista || 0} pistas do Códice.</div>` : '';
  return `<section class="bloco"><div class="cab"><h2>Relíquias e maldições</h2><small>o que fica de uma semana para outra</small></div><div class="cp-lista">` +
    (rel.length ? rel.map(r => `<div class="${r.usada ? 'usada' : ''}"><b>${esc(r.nome)}${r.usada ? ' (usada)' : ''}</b>${esc(r.texto)}</div>`).join('') : '<div>Nenhuma relíquia ainda. Elas chegam no fechamento das partes.</div>') +
    mal.map(m => `<div class="mal"><b>${esc(m.nome)}${m.alvo ? ' · ' + esc(m.alvo) : ''}</b>${esc(m.texto)}</div>`).join('') +
    `<div><b>Materiais</b>${Object.values(mat).map(x => `${x.qtd} ${esc(x.nome)}${x.forja ? ' (de ' + x.forja + ' para a Lâmina Estelar)' : ''}`).join(' · ')}</div></div>${proj}</section>`;
}
function cpFios() {
  const f = (HISTORIA || {}).fios || []; if (!f.length) return '';
  return `<section class="bloco"><div class="cab"><h2>Fios em aberto</h2><small>o que vai voltar mais à frente</small></div><div class="cp-lista">` +
    f.map(x => `<div><b>${esc(x.titulo)}</b>${esc(x.estado)}<span style="display:block;opacity:.75;margin-top:4px">A seguir: ${esc(x.proximo)}</span></div>`).join('') + `</div></section>`;
}
function cpLivroMundo() {
  const b = (HISTORIA || {}).biblia || []; if (!b.length) return '';
  return `<section class="bloco cp-mundo"><div class="cab"><h2>O Livro do Mundo</h2><small>lugares, gente e forças das Marcas do Sal</small></div>` +
    b.map(x => `<details><summary>${esc(x.titulo)}</summary><div class="cp-leitura">${cpMd(x.texto)}</div></details>`).join('') + `</section>`;
}
// ───────── a história inteira (Fabio, 02/11) ─────────
// Desfechos lidos neste aparelho. Na primeira vez, só o desfecho mais recente fica por ler: os anteriores ele já viu.
function cpLidos() {
  const L = (HISTORIA && HISTORIA.livro_inteiro) || [], fechadas = L.filter(p => p.fechada && p.desfecho).map(p => p.semana);
  try { const v = localStorage.getItem('cp_desfechos_lidos'); if (v) return JSON.parse(v); } catch (e) {}
  const base = fechadas.slice(0, -1); try { localStorage.setItem('cp_desfechos_lidos', JSON.stringify(base)); } catch (e) {}
  return base;
}
function cpMarcarLido(sem) { const l = cpLidos(); if (!l.includes(sem)) l.push(sem); try { localStorage.setItem('cp_desfechos_lidos', JSON.stringify(l)); } catch (e) {} }
function cpDesfechoPendente() {
  const L = (HISTORIA && HISTORIA.livro_inteiro) || [], fechadas = L.filter(p => p.fechada && p.desfecho), ult = fechadas[fechadas.length - 1];
  return ult && !cpLidos().includes(ult.semana) ? ult : null;
}
function cpLivroInteiro(pend) {
  const L = (HISTORIA && HISTORIA.livro_inteiro) || [], pr = HISTORIA && HISTORIA.prologo; if (!L.length) return '';
  return `<section class="bloco" id="cp-livro-inteiro"><div class="cab"><h2>A história inteira</h2><small>do prólogo até hoje, em ordem</small></div>` +
    (pr ? `<details class="cp-parte"><summary><b>Prólogo</b><small>${esc(pr.subtitulo || '')}</small></summary>${cpLeitura('li-prol', pr.texto, pr.minutos, 'Ler o prólogo')}</details>` : '') +
    L.filter(p => !pend || p.semana <= pend.semana).map(p => {   // a parte seguinte continua o desfecho: só aparece depois dele
      const id = 'li-' + p.semana, trava = pend && pend.semana === p.semana;
      return `<details class="cp-parte" ${trava ? 'open' : ''}><summary><b>Parte ${esc(p.parte)}: ${esc(p.titulo)}</b><small>${esc(p.periodo)}${p.fechada ? '' : ' · em andamento'}</small></summary>
        ${p.premissa ? `<h4>Como a parte começou</h4>${cpLeitura(id + '-pr', p.premissa.texto, p.premissa.minutos, 'Ler a abertura')}` : ''}
        ${p.cenas.length ? `<h4>As cenas da semana</h4>` + p.cenas.map(c => `<div class="cp-ev ${esc(c.tipo)}"><i>${CP_ICO[c.tipo] || '·'}</i><span><b>${esc(c.dia)}.</b> ${esc(c.texto)}</span></div>`).join('') : ''}
        ${p.onde_paramos ? `<h4>Onde paramos</h4>${cpLeitura(id + '-op', p.onde_paramos.texto, p.onde_paramos.minutos, 'Ler o resumo')}` : ''}
        ${p.desfecho ? `<h4>Desfecho</h4>` + (trava ? `<button type="button" class="cp-ler" data-desfecho="${esc(p.semana)}">Ler o desfecho da Parte ${esc(p.parte)} (≈ ${p.desfecho.minutos} min)</button>`
          : cpLeitura(id + '-de', p.desfecho.texto, p.desfecho.minutos, 'Ler o desfecho')) : ''}</details>`;
    }).join('') + `</section>`;
}
function cpTituloMundo() {
  const H = typeof HISTORIA !== 'undefined' ? HISTORIA : null;
  return (H && H.titulo) || 'Os Faróis de Nácar';
}
// Página sem spoiler: enquanto o desfecho mais recente não foi aberto neste aparelho, a Campanha mostra só o resumo de onde
// a história parou e o livro; estrada, companhia, runas e relíquias já refletem o desfecho e ficam para depois.
function cpPaginaAntesDoDesfecho(p) {
  $('view').innerHTML = `<div class="cp-escuro"><div class="campo tinta"><div class="dentro" style="padding-bottom:26px">
      <div class="topo"><div class="rot">${esc(cpTituloMundo())}</div></div>
      <h1 class="titulo longo">A Parte ${esc(p.parte)} fechou</h1>
      <div class="sub">${esc(p.titulo)}. Antes do desfecho, relembre onde a história parou.</div></div></div>
    <div class="cp-aventura">
    ${p.onde_paramos ? `<section class="bloco"><div class="cab"><h2>Onde paramos</h2><small>≈ ${p.onde_paramos.minutos} min, sem o desfecho</small></div><div class="cp-leitura">${cpMd(p.onde_paramos.texto)}</div></section>` : ''}
    <section class="bloco"><div class="cab"><h2>O desfecho</h2><small>Parte ${esc(p.parte)}</small></div>
      <button type="button" class="cp-ler" data-desfecho="${esc(p.semana)}">Ler o desfecho da Parte ${esc(p.parte)} (≈ ${p.desfecho.minutos} min)</button></section>
    ${cpLivroInteiro(p)}</div></div>`;
  cpLigarLeituras();
}
document.addEventListener('click', ev => {
  const b = ev.target.closest && ev.target.closest('[data-desfecho]'); if (!b) return;
  cpMarcarLido(b.dataset.desfecho); location.hash = '#campanha'; route(); window.scrollTo(0, 0);
  setTimeout(() => { const el = document.getElementById('cp-enc'); if (el && el.classList.contains('fechada')) { el.classList.remove('fechada'); const bt = document.querySelector('[data-alvo="cp-enc"]'); if (bt) bt.textContent = 'Recolher'; } }, 60);
});

// "Como estou indo?" logo no topo (31/10): as missões da semana e o desfecho se a parte fechasse agora.
function cpResumoSemana() {
  const j = JORNADA, H = HISTORIA; if (!j || !j.capitulo || !(j.capitulo.missoes || []).length) return '';
  const ms = j.capitulo.missoes, ok = ms.filter(m => m.cumprida).length;
  const nome = { triunfo: 'triunfo', avanco: 'avanço', sustenta: 'impasse', reves: 'revés', crise: 'crise' };
  const pj = H && H.projecao;
  return `<section class="bloco"><div class="cab"><h2>Esta semana</h2><small>${ok} de ${ms.length} missões</small></div>
    <div class="cp-lista">${ms.map(m => `<div class="${m.cumprida ? '' : 'tr'}"><b>${m.cumprida ? 'Feita' : 'Falta'} · ${esc(m.nome)}</b>${m.feito} de ${m.meta}</div>`).join('')}</div>
    ${(j.capitulo.paralelas || []).length ? `<div class="par" style="padding-top:12px"><b>Missões paralelas</b> (opcionais, só pontos): ${j.capitulo.paralelas.map(p => `${esc(p.nome)} ${p.feito} de ${p.meta}${p.cumprida ? ' (cumprida)' : ''}`).join(' · ')}</div>` : ''}
    ${pj ? `<div class="par" style="padding-top:12px">Se a parte fechasse agora: <b>${esc(nome[pj.tier] || pj.tier)}</b>.${(pj.efeitos || []).length ? ' ' + esc(pj.efeitos[0]) : ''}</div>` : ''}</section>`;
}
function cpAventura() {
  const H = HISTORIA; if (!H) return '';
  let h = '<div class="cp-aventura">' + cpResumoSemana() + cpLivroInteiro(null) + cpPrologo() + (H.encerramento ? cpEncerramento() : cpDesfecho()) + cpPremissa() + cpDiario();
  if (H.crise) {
    const g = H.crise.g, ela = g === 'o' ? 'ele' : 'ela', a = g === 'o' ? 'o' : 'a';
    h += `<div class="cp-crise"><b class="t">Crise aberta: ${esc(H.crise.companheiro)}</b><div class="par" style="margin-top:6px">${esc(H.crise.companheiro)} está pres${g} em ${esc(H.crise.onde)}. Uma semana boa (capítulo concluído) ${a} traz de volta. Prazo: <b>${H.crise.prazo} ${H.crise.prazo === 1 ? 'semana' : 'semanas'}</b>; se acabar, ${ela} se perde, e só uma grande vitória ${a} resgata depois.</div></div>`;
  }
  const s = H.semana;
  if (s && !H.encerramento && !H.premissa_atual) {
    const falta = Math.max(0, (s.total - 1) - s.ok);
    h += `<div class="cp-semana"><div class="rot" style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75">Esta semana · capítulo ${s.n} · ${esc(s.periodo)}</div>
      <h3 style="font-family:var(--display);font-size:22px;margin:4px 0 0">${esc(s.titulo)}</h3>
      <p class="abre">${esc(s.abertura)}</p><div class="jogo">Em jogo: ${esc(s.em_jogo)}</div>
      <div class="cons" style="opacity:1;margin-top:12px"><b>${s.ok} de ${s.total}</b> missões cumpridas. ${s.ok >= s.total - 1 ? 'O capítulo já se conclui: a companhia avança.' : `Mais ${falta} ${falta === 1 ? 'missão' : 'missões'} para concluir.`}</div>
      <div class="cons">Como a semana termina: <b>todas as missões</b> = grande avanço, 2 etapas e 2 talismãs. <b>Capítulo concluído</b> = 1 etapa e 1 talismã. <b>Metade</b> = a companhia se mantém. <b>Semana fraca</b> = um companheiro ferido. <b>Duas seguidas, ou uma vazia</b> = crise: recuo e um companheiro capturado. Um talismã absorve uma derrota. Doença e descanso confirmado protegem. O XP nunca diminui.</div></div>`;
  }
  h += `<section class="bloco"><div class="cab"><h2>A estrada</h2><small>Arco ${esc(H.arco.id)}: ${esc(H.arco.nome)}</small></div><div class="cp-trilha">` +
    H.etapas.map((e, i) => `<div class="cp-et ${e.estado} ${i === H.etapas.length - 1 ? 'chefe' : ''}"><i></i><span>${esc(e.nome)}${i === H.etapas.length - 1 ? ' · só cai pela balança (média de 28 dias)' : ''}</span></div>`).join('') + `</div></section>`;
  h += `<section class="bloco"><div class="cab"><h2>A companhia</h2><small>${esc(H.guia.nome)}, ${esc(H.guia.papel)}, guia o grupo</small></div>
    <div style="border-radius:6px;overflow:hidden;margin:10px 0 14px;border:1px solid rgba(255,255,255,0.2)">
      <img src="art/tripulacao.jpg" alt="A Tripulação do Baluarte do Vento" style="width:100%;aspect-ratio:16/9;display:block;object-fit:cover;">
    </div>
    <div class="cp-comp">` +
    H.companhia.map(c => `<div class="cp-pers ${c.estado}"><canvas class="cp-mini" data-id="${c.id}" data-estado="${c.estado}"></canvas><b>${esc(c.nome)}</b><span>${esc(c.papel)}</span><em>${esc(cpEstadoDe(c))}</em></div>`).join('') + `</div></section>`;
  h += `<section class="bloco"><div class="cab"><h2>Os Sigilos de Nácar</h2><small>${H.mochila.length} de 3</small></div><div class="cp-bag">` +
    [0, 1, 2].map(i => H.mochila[i] ? `<div class="cp-slot cheio"><b>${esc(H.mochila[i].nome)}</b><span>${esc(H.mochila[i].texto)}</span></div>` : `<div class="cp-slot">vazio</div>`).join('') +
    `</div><div class="par" style="padding-top:10px">${esc(H.regra_item)} Parte concluída rende sigilo novo.</div></section>` + cpTesouro() + cpFios() + cpLivroMundo() + `</div>`;
  return h;
}
const CP_VISUAIS = [
  {
    id: 'nau',
    titulo: 'A Nau das Brumas',
    video: 'art/baluarte_cinematico.mp4',
    poster: 'art/baluarte_do_vento.jpg',
    desc: 'O <b>Baluarte do Vento</b> singrando as Brumas Silenciosas sob os anéis astrais de <em>Thalassa-Aethel</em>.'
  },
  {
    id: 'tripulacao',
    titulo: 'A Tripulação',
    video: 'art/tripulacao_cinematico.mp4',
    poster: 'art/tripulacao.jpg',
    desc: '<b>Fábio, Sora, Valen, Miriam, Mestre Orfeu</b> e os mastins sentinelas vigiando a amurada da expedição.'
  },
  {
    id: 'farol',
    titulo: 'O Primeiro Farol',
    video: 'art/farol_cinematico.mp4',
    poster: 'art/farol_de_nacar.jpg',
    desc: 'A <b>Torre de Aethel-Prime</b> em nácar esculpido e glifos rúnicos, projetando a chama dourada contra o esquecimento.'
  },
  {
    id: 'chefe',
    titulo: 'O Guardião do Arco I',
    video: 'art/colosso_cinematico.mp4',
    poster: 'art/colosso_basalto.jpg',
    desc: '<b>O Colosso da Fenda de Basalto</b> erguendo-se nas marés profundas do Estreito dos Dentes de Pedra.'
  }
];

function cpVisualStage() {
  const v = CP_VISUAIS[0];
  return `<section class="bloco" style="padding-bottom:12px">
    <div class="cab"><h2>Crônicas Visuais</h2><small>ilustrações & cinematografia do Gemini</small></div>
    <div class="cp-cinematica">
      <video id="cp-video-stage" class="cp-cinematica-video" autoplay loop muted playsinline poster="${v.poster}">
        <source src="${v.video}" type="video/mp4">
        <img src="${v.poster}" alt="${esc(v.titulo)}" style="width:100%;display:block">
      </video>
      <div class="cp-cinematica-tabs" id="cp-vis-tabs">
        ${CP_VISUAIS.map((item, idx) => `<button class="cp-cinematica-btn ${idx === 0 ? 'on' : ''}" data-idx="${idx}">${esc(item.titulo)}</button>`).join('')}
      </div>
      <div class="cp-cinematica-caption" id="cp-vis-desc">${v.desc}</div>
    </div>
  </section>`;
}

function cpLigarVisualStage() {
  const tabs = document.querySelectorAll('#cp-vis-tabs button');
  const vid = document.getElementById('cp-video-stage');
  const desc = document.getElementById('cp-vis-desc');
  if (!tabs.length || !vid || !desc) return;
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const item = CP_VISUAIS[parseInt(btn.dataset.idx, 10)];
      if (item) {
        vid.poster = item.poster;
        vid.src = item.video;
        vid.play().catch(() => {});
        desc.innerHTML = item.desc;
      }
    });
  });
}

function renderCampanha() {
  if (!JORNADA) {
    $('view').innerHTML = `<div class="campo tinta"><div class="dentro" style="padding-bottom:22px"><div class="rot">${esc(cpTituloMundo())}</div><h1 class="titulo longo">Abrindo o livro.</h1></div></div><section class="bloco"><div class="par" id="cp-espera">Carregando os dados da Campanha…</div></section>`;
    setTimeout(() => { const el = document.getElementById('cp-espera'); if (el && !JORNADA) el.innerHTML = 'Não consegui abrir a Campanha agora (sem sinal ou o arquivo não chegou). <a href="#campanha" onclick="location.reload()">Tentar de novo</a>.'; }, 6000);
    return;
  }
  const pend = typeof HISTORIA !== 'undefined' && HISTORIA ? cpDesfechoPendente() : null;
  if (pend) { cpPaginaAntesDoDesfecho(pend); return; }
  const j = JORNADA, p = j.personagem, v = j.vitalidade, a = j.arco || {}, pr = j.paralela;
  const vit = v.indice == null ? ['—', 'Vitalidade: sem dado'] : [fNum(v.indice, 0), v.estado === 'ferido' ? 'Vitalidade: ferido' : 'Vitalidade: de pé'];
  let h = `<div class="cp-escuro"><div class="campo tinta"><div class="dentro" style="padding-bottom:26px">
    <div class="topo"><div class="rot">${esc(cpTituloMundo())}</div><div class="selo">${esc(cpTituloCapitulo())}</div></div>
    <div class="cp-ficha"><svg viewBox="0 0 74 86" role="img" aria-label="Nível ${p.nivel}">
      <path d="M37 3l32 11v24c0 21-14 37-32 45C19 75 5 59 5 38V14z" fill="none" stroke="var(--sol)" stroke-width="3"/>
      <path d="M37 11l24 8v19c0 16-10 29-24 36-14-7-24-20-24-36V19z" fill="var(--sol)" opacity="0.14"/>
      <text x="37" y="50" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="30" fill="#fff">${p.nivel}</text>
      <text x="37" y="64" text-anchor="middle" font-size="8.5" font-weight="700" letter-spacing="0.12em" fill="var(--sol)">NÍVEL</text></svg>
      <div><div class="cp-nome">${esc(p.nome)}</div><div class="cp-titulo">${esc(p.titulo)}</div><div class="cp-classe">${esc(p.classe)}</div></div></div>
    ${cpBarraXP()}
    <div class="cp-chips">
      <div class="cp-chip ${v.estado === 'ferido' ? 'ferido' : ''}"><b>${vit[0]}</b><span>${vit[1]}</span></div>
      <div class="cp-chip"><b>${j.saga.atual}</b><span>saga de capítulos · maior ${j.saga.maior}</span></div>
      <div class="cp-chip"><b>+${fNum(j.hoje.xp || 0, 0)}</b><span>XP de hoje até a última leitura</span></div></div>
  </div></div>`;

  h += cpVisualStage();
  h += cpAventura();
  h += `<section class="bloco"><div class="cab"><h2>O mapa</h2><small>de 95 a 85 kg, pela média de 28 dias</small></div>${cpMapa()}
    ${a.chefe ? `<div class="cp-hp"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><b style="font-family:var(--display);font-size:19px">${esc(a.chefe)}</b><span style="font-weight:700">${Math.round((a.hp || 0) * 100)}%</span></div>
      <div class="cp-boss-art">
        <video class="cp-cinematica-video" autoplay loop muted playsinline poster="art/colosso_basalto.jpg">
          <source src="art/colosso_cinematico.mp4" type="video/mp4">
          <img src="art/colosso_basalto.jpg" alt="${esc(a.chefe)}" style="width:100%;display:block">
        </video>
      </div>
      <div class="tr" role="img" aria-label="Vida do chefe: ${Math.round((a.hp || 0) * 100)} por cento" style="margin-top:10px"><i style="width:${((a.hp || 0) * 100).toFixed(1)}%"></i></div>
      <div class="lg">Arco ${esc(a.num)}: ${esc(a.nome)}. A vida do chefe é o que falta no degrau de ${fNum(a.de, 1)} a ${fNum(a.ate, 1)} kg, pela média de 28 dias das leituras neutras (hoje ${fNum(j.media_28d, 2)} kg). Atualiza uma vez por semana; pesagem isolada, e a de depois de jogo, não fere chefe nenhum. O chefe não dá XP.</div></div>` : ''}
    <div class="cp-hp" style="margin-top:18px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><b style="font-family:var(--display);font-size:16px">Missão paralela: ${esc(pr.nome)}</b><span style="font-weight:700">${pr.valor != null ? fNum(pr.valor, 1) : '—'} de ${fNum(pr.ate, 0)}</span></div>
      <div class="tr" style="border-color:rgba(255,255,255,0.6)"><i style="width:${(pr.progresso * 100).toFixed(1)}%;background:var(--sol)"></i></div><div class="lg">VO₂ máx: ${esc(pr.nota)}.</div></div></section>`;

  h += `<section class="bloco"><div class="cab"><h2>${esc(cpTituloCapitulo())}</h2><small>${esc(CP_STATUS[j.capitulo.status] || '')} · +${j.capitulo.xp_semana} XP da semana</small></div>
    ${cpMissoes(j.capitulo.missoes)}${cpResgate()}</section>`;

  h += `<section class="bloco"><div class="cab"><h2>Atributos</h2><small>só leitura dos dados</small></div><div class="cp-atr">` +
    j.atributos.map(t => `<div><span class="ro">${esc(t.nome)}</span><b>${t.valor != null ? fNum(t.valor, t.nome === 'Fôlego' ? 1 : 0) : '—'}</b><small>${esc(t.unidade)}</small><small style="opacity:0.65">${esc(t.nota)}</small></div>`).join('') + `</div></section>`;

  const ganhas = j.reliquias.filter(r => r.em).length;
  h += `<section class="bloco"><div class="cab"><h2>Relíquias</h2><small>${ganhas} de ${j.reliquias.length}</small></div><div class="cp-rel">` +
    j.reliquias.map(r => `<div class="${r.em ? '' : 'tr'}"><svg viewBox="0 0 24 24" fill="${r.em ? 'var(--sol)' : 'none'}" stroke="${r.em ? 'var(--sol)' : '#fff'}" stroke-width="1.8" stroke-linejoin="round">${r.em ? CP_REL : CP_TRANCA}</svg>
      <span><b>${esc(r.nome)}</b><small>${esc(r.texto)}${r.em ? ' · ' + cpDDMM(r.em) : ''}</small></span></div>`).join('') + `</div></section>`;

  // "O livro" (só os desfechos) saiu em 02/11: "A história inteira", no topo da aventura, tem tudo em ordem

  h += `<section class="bloco cp-regras"><details><summary style="padding:14px 0;font-weight:700;cursor:pointer">Como a Campanha funciona</summary>
    <div class="par">XP só por comportamento, uma vez por dia por tipo, com teto de 250 por dia: sessão de força 100, corrida 80, dia ativo 30, descanso confirmado na estalagem 50, pesagem 20, almoço registrado 20, lanche da tarde registrado 20; a rodada bônus (força curta no dia de corrida, corrida leve no dia de força) vale 50 e não conta como item do dia. Missões paralelas, todo dia e opcionais: passeio com os cachorros e rotina de casa (alongamento, flexão e prancha), 15 cada; 5 dias na semana rendem mais 30 cada. Não contam como treino, dia ativo nem item do dia. Cada missão da semana cumprida vale 50, e o capítulo concluído, 150.</div>
    <div class="par">O XP nunca diminui. O peso não dá nem tira XP: ele só mexe na vida do chefe do arco, pela média de 28 dias. O futebol conta como dia ativo, sem bônus.</div>
    <div class="par">Capítulo é a semana, de segunda a domingo. Concluído = todas as missões, ou todas menos uma. A meta de dias ativos segue a sua fase: média das últimas 4 semanas mais 1, entre 3 e 5; depois de 2 capítulos sem conclusão, cai para 3 e começa um arco de retorno.</div>
    <div class="par">Saga é a sequência de capítulos concluídos. Um capítulo perdido pode ser resgatado na semana seguinte (3 dias ativos em 4 dias corridos e o capítulo seguinte concluído), uma vez a cada 4 semanas. Dia de descanso confirmado conta como cumprido.</div>
    <div class="par">A história é autônoma: nada nela corresponde aos seus dias. A única ligação são as métricas. As cartas saem na hora e chegam como despacho no Telegram: 2 itens no dia tiram um achado (pista do Códice); 4 itens, também uma bênção (estilha do céu); cada missão da semana cumprida tira uma cena; dia fechado com 1 item é dia quieto; dia fechado sem nenhum item, com o relógio registrando, é percalço. Descanso confirmado na estalagem conta como item. Juramento quebrado (treinar com febre, falta de ar, aperto no peito ou dor articular acima de 3/10, só pelo seu relato; ou fritura além do teto da semana) tira uma carta de maldição: a 1ª da parte parte uma runa, a 2ª lança a Mácula de Cinza; com a mácula ativa, um novo juramento quebrado entrega a pessoa marcada à Cinza. Parte sem juramento quebrado tira a mácula e dá uma relíquia. No fechamento, as missões da semana decidem o nível: triunfo, avanço, impasse, revés ou crise. Semana de abrigo (descanso confirmado ou 3 manhãs vermelhas) protege de revés e crise. As perdas são da história, nunca do XP.</div>
    <div class="par">Sem dado, sem XP e sem punição. Tudo é recalculado do zero a partir dos seus registros, do relógio e da balança.</div></details></section></div>`;
  $('view').innerHTML = h;
  cpPosicionarMarca();
  cpLigarPixel();
  cpLigarVisualStage();
}
