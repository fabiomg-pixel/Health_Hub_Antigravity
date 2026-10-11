// Apoio à decisão (11/10/2026): o painel diz "pode, ajustar ou segurar" sozinho, mostra a proteína que
// de fato foi registrada, a janela de cada dia com a previsão e o que comer agora. Tudo derivado de dados
// que já existem (fatos.json, semana.json, registros). Quando falta dado, diz que falta: nunca palpite.
//
// Regras (propostas pela carga e pela nutrição, aceitas pelo Fabio em 11/10; cortes do PROJETO_CHAT §20d):
//   SEGURAR : 3 ou mais dias seguidos em banda vermelha, OU sono < 6 h E (VFC < 32 OU FC de repouso >= 56).
//   AJUSTAR : dia fora da banda verde, OU prontidão Garmin < 50, OU média de 7 dias baixa (sono < 6 h,
//             VFC < 32, FC de repouso >= 56).
//   PODE    : o resto. Com 2 ou mais médias de 7 dias em faixa média, "pode, sem pressa para subir carga".
// Usa os helpers do index.html: esc, fNum, isoLocal, isoDDMM, FATOS, REGISTROS, DATA, DASH.

// ───────── semáforo ─────────
function avaliarSemaforo() {
  const f = FATOS || {}, rc = f.recuperacao;
  const hoje = isoLocal(), dadosDe = f.janela && f.janela.hoje;
  if (!rc) return { estado: 'sem_dado', motivos: ['O painel ainda não recebeu os dados do relógio.'], medios: 0 };
  const idx = rc.indice_hoje, confiavel = idx != null && rc.indice_hoje_confiavel !== false;
  const sono = rc.sono_ultima_noite_h, hrv = rc.hrv_ultima_noite, fc = rc.fc_repouso_hoje, pront = rc.prontidao_garmin_hoje;
  const s7 = rc.sono_medio_7d, h7 = rc.hrv_medio_7d, f7 = rc.fc_repouso_7d;
  const segurar = [], ajustar = [];
  if ((rc.dias_vermelhos_seguidos || 0) >= 3) segurar.push(rc.dias_vermelhos_seguidos + ' dias seguidos em banda vermelha');
  // PROJETO_CHAT §7: prontidão do Garmin em 50-74 mas índice próprio vermelho e sono < 6 h: trata como vermelho
  if (pront != null && pront >= 50 && pront < 75 && confiavel && rc.banda_hoje === 'r' && sono != null && sono < 6) segurar.push('prontidão ' + pront + ' com índice próprio vermelho e sono de ' + fNum(sono, 1) + ' h');
  if (sono != null && sono < 6 && ((hrv != null && hrv < 32) || (fc != null && fc >= 56)))
    segurar.push('noite de ' + fNum(sono, 1) + ' h com ' + (hrv != null && hrv < 32 ? 'VFC ' + hrv + ' ms' : 'FC de repouso ' + fc + ' bpm'));
  if (confiavel && rc.banda_hoje && rc.banda_hoje !== 'g') ajustar.push('o índice de hoje (' + fNum(idx, 0) + ') não está na faixa alta');
  if (pront != null && pront < 50) ajustar.push('prontidão do Garmin em ' + pront + ' (abaixo de 50: recuperar)');
  if (sono != null && sono < 5.5) ajustar.push('noite curta: ' + fNum(sono, 1) + ' h de sono');
  if (s7 != null && s7 < 6) ajustar.push('sono médio de 7 dias em ' + fNum(s7, 1) + ' h (abaixo de 6)');
  if (h7 != null && h7 < 32) ajustar.push('VFC média de 7 dias em ' + fNum(h7, 0) + ' ms (abaixo de 32)');
  if (f7 != null && f7 >= 56) ajustar.push('FC de repouso média de 7 dias em ' + fNum(f7, 0) + ' bpm (56 ou mais)');
  const medios = [h7 != null && h7 < 38, f7 != null && f7 > 52, s7 != null && s7 < 7].filter(Boolean).length;
  const resumo7 = 'sono ' + fNum(s7, 1) + ' h, VFC ' + fNum(h7, 0) + ' ms, FC de repouso ' + fNum(f7, 0) + ' bpm';
  let estado = 'pode', motivos = [];
  if (dadosDe && dadosDe !== hoje) { estado = 'sem_dado'; motivos = ['A última leitura do relógio é de ' + isoDDMM(dadosDe) + ': ainda não há a de hoje.']; }
  else if (segurar.length) { estado = 'segurar'; motivos = segurar; }
  else if (ajustar.length) { estado = 'ajustar'; motivos = ajustar; }
  else if (!confiavel) { estado = 'sem_dado'; motivos = ['O relógio ainda não mandou o sono e a VFC de hoje: decida pela média de 7 dias (' + resumo7 + ') e pelo que você sente.']; }
  else motivos = ['O dia está na faixa alta (índice ' + fNum(idx, 0) + ').'];
  // §7: prontidão 50-74 = moderar (teto RPE 8). Também modera a semana com 2 ou mais médias de 7 dias em faixa média.
  const moderar = estado === 'pode' && ((pront != null && pront >= 50 && pront < 75) || medios >= 2);
  if (moderar && pront != null && pront >= 50 && pront < 75) motivos.push('prontidão do Garmin em ' + pront + ' (50 a 74: moderar)');
  const liberaCarga = estado === 'pode' && !moderar && medios <= 1 && !(h7 != null && h7 < 35) && !(f7 != null && f7 >= 55);
  return { estado, moderar, liberaCarga, motivos, medios, resumo7, dadosEm: f.gerado_em || '' };
}
const SEM_TXT = {
  pode: ['Pode', 'Siga o plano.'],
  moderar: ['Pode, moderando', 'Siga o plano com teto de esforço 8 de 10 (deixe 2 ou mais repetições de sobra) e sem subir carga hoje.'],
  ajustar: ['Ajustar', 'Mantenha as cargas e tire 1 série de cada exercício. Sem subir carga e sem intensidade extra.'],
  segurar: ['Segurar', 'Só volume reduzido: cargas 10% menores, 3 ou mais repetições de sobra. Se for corrida, caminhada leve. No Lower A: 3 séries por exercício, sem o búlgaro.'],
  sem_dado: ['Sem leitura', 'Sem dado de hoje não há decisão: use a média de 7 dias e o que você sente.']
};
function blocoSemaforo() {
  const s = avaliarSemaforo(), t = SEM_TXT[s.estado === 'pode' && s.moderar ? 'moderar' : s.estado];
  const atencao = s.estado === 'pode' && s.medios >= 2 ? `<div class="par" style="color:var(--sec)">A semana está em faixa média (${esc(s.resumo7)}): por isso a carga não sobe sozinha.</div>` : '';
  return `<section class="bloco"><div class="cab"><h2>Pode treinar hoje?</h2><small>${s.dadosEm ? 'dados de ' + esc(isoDDMM(s.dadosEm.slice(0, 10)) + ' às ' + s.dadosEm.slice(11, 16)) : ''}</small></div>
    <div class="linha" style="align-items:flex-start;border-bottom:0"><span class="sem sem-${s.estado}" role="img" aria-label="${esc(t[0])}">${esc(t[0])}</span>
      <span class="corpo" style="font-weight:500">${esc(t[1])}<small>${s.motivos.map(esc).join(' · ')}</small></span></div>${atencao}
    <details><summary>Como eu decido</summary><div class="miolo">
      <div class="par"><b>Segurar:</b> 3 ou mais dias seguidos em banda vermelha, sono abaixo de 6 h com VFC abaixo de 32 ou FC de repouso a partir de 56, ou prontidão 50 a 74 com índice próprio vermelho e sono abaixo de 6 h.</div>
      <div class="par"><b>Ajustar:</b> dia fora da faixa alta, prontidão do Garmin abaixo de 50, noite abaixo de 5,5 h, ou média de 7 dias baixa (sono abaixo de 6 h, VFC abaixo de 32, FC de repouso a partir de 56).</div>
      <div class="par"><b>Pode, moderando:</b> prontidão de 50 a 74 (faixa do projeto: moderar, teto de esforço 8) ou 2 ou mais médias de 7 dias em faixa média. A carga só sobe com a semana fora dessa faixa.</div>
      <div class="par"><b>Pode:</b> o resto. Os cortes de VFC 32 e FC 56 foram definidos pela carga (a fisiologista do copiloto) e você delegou essa decisão aos especialistas em 11/10.</div></div></details></section>`;
}
// A sessão do dia é pesada? (força de verdade, não o treino leve nem a corrida fácil)
function sessaoPesada(sessao) { return !!sessao && sessao.pesada !== false && /lower|upper|for[çc]a|costas|peito|ombro/i.test(sessao.titulo + ' ' + (sessao.regra || '')); }
function avisoDaSessao(sessao) {
  const s = avaliarSemaforo();
  if (s.estado === 'pode' && s.moderar && sessaoPesada(sessao)) return 'Hoje o painel manda moderar (' + s.motivos.join('; ') + '): teto de esforço 8 de 10, 2 ou mais repetições de sobra e sem subir carga.';
  if (s.estado === 'pode' || s.estado === 'sem_dado' && !sessaoPesada(sessao)) return null;
  if (s.estado === 'sem_dado') return 'Sem a leitura de hoje: decida pela média de 7 dias (' + s.resumo7 + ') e pelo que sente.';
  const bulg = (sessao.exercicios || []).some(e => /bulgaro/.test(e.id));
  if (s.estado === 'segurar') return 'Hoje o relógio pede para segurar (' + s.motivos.join('; ') + '). Faça a versão reduzida: 3 séries por exercício' + (bulg ? ', sem o búlgaro' : '') + ', cargas 10% menores e 3 ou mais repetições de sobra.';
  return 'Hoje o relógio pede para ajustar (' + s.motivos.join('; ') + '). Mantenha as cargas e tire 1 série de cada exercício.';
}

// ───────── proteína registrada ─────────
function proteinaDoTexto(texto) {
  const t = String(texto || '');
  // 1) o campo do formulário ("Proteína informada: 35 g.") manda e ignora qualquer outro número do texto
  const campo = t.match(/Prote[ií]na informada:\s*(\d+(?:[.,]\d+)?)\s*g/i);
  if (campo) return parseFloat(campo[1].replace(',', '.'));
  // 2) número escrito à mão: ignora faixa ("15 a 20", "entre 15 e 20"), "por 100 g" e repetição do mesmo valor
  const vistos = new Set(); let soma = 0, achou = false;
  const re = [/(\d+(?:[.,]\d+)?)\s*g\s*(?:de\s*)?prote[ií]nas?/gi, /prote[ií]nas?\s*[:=]\s*(\d+(?:[.,]\d+)?)\s*g/gi];
  re.forEach(r => { let m; while ((m = r.exec(t))) {
    const antes = t.slice(Math.max(0, m.index - 12), m.index), depois = t.slice(m.index + m[0].length, m.index + m[0].length + 14);
    if (/(\d\s*(a|e|-|–)\s*|entre\s+)$/i.test(antes) || /^\s*(por|\/)\s*100/i.test(depois) || /^\s*\(?\s*estimativa/i.test(depois)) continue;
    const v = parseFloat(m[1].replace(',', '.')); if (vistos.has(v)) continue; vistos.add(v); soma += v; achou = true; } });
  return achou ? soma : null;
}
function proteinaDoDia(iso) {
  const regs = (typeof REGISTROS !== 'undefined' ? REGISTROS : []).filter(r => r.tipo === 'Refeição' && r.data === iso);
  let g = 0, comNumero = 0;
  regs.forEach(r => { const p = proteinaDoTexto(r.texto); if (p != null) { g += p; comNumero++; } });
  return { g, registradas: regs.length, comNumero, semNumero: regs.length - comNumero };
}
function blocoProteina(iso, planoG, ehHoje) {
  const alvo = DATA.dieta.proteina_alvo || 160, piso = DATA.dieta.proteina_piso || 140, p = proteinaDoDia(iso);
  const falta = Math.max(0, piso - p.g), hora = new Date().getHours();
  const dica = ehHoje && p.registradas && hora >= 13 && p.g < 60 ? '<div class="par"><b>Para a próxima refeição:</b> proteína primeiro no prato.</div>' : '';
  return `<div style="padding-top:16px;display:flex;flex-direction:column;gap:8px">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px">
      <div style="font-size:14px;color:var(--sec);font-weight:500">Registrado com número · ${p.registradas ? p.comNumero + ' de ' + p.registradas + ' refeições' : 'nada registrado'}</div>
      <div class="medio">${fNum(p.g, 0)}<small style="color:var(--sec)"> g</small></div></div>
    <div class="barra" role="img" aria-label="${fNum(p.g, 0)} g registrados de ${alvo}, piso ${piso}"><i style="width:${Math.min(100, p.g / alvo * 100)}%"></i><b style="left:${piso / alvo * 100}%"></b></div>
    <div class="legenda" style="color:var(--sec);font-weight:600"><span>0</span><span>piso ${piso} g</span><span>alvo ${alvo} g</span></div>
    <div style="font-size:13.5px;color:var(--sec)">O plano do dia soma ${planoG} g. ${p.registradas ? (p.semNumero ? p.semNumero + ' refeição(ões) sem número entram só quando você informar a proteína ou fotografar o rótulo. ' : '') + (falta ? 'Faltam pelo menos ' + fNum(falta, 0) + ' g para o piso.' : 'O piso foi atingido com o que tem número.') : 'Anote a proteína ao registrar para a barra andar.'}</div>${dica}</div>`;
}

// ───────── previsão e janela do dia ─────────
let PREV = null;
function carregarPrevisao() {
  try { const c = JSON.parse(sessionStorage.getItem('previsao') || 'null'); if (c && c.dias && Date.now() - c.t < 60 * 60 * 1000) { PREV = c; return; } } catch (e) {}
  fetch('https://api.open-meteo.com/v1/forecast?latitude=-22.86&longitude=-43.23&daily=apparent_temperature_max,precipitation_probability_max,sunset,uv_index_max&timezone=America%2FSao_Paulo&forecast_days=8')
    .then(r => r.ok ? r.json() : null).then(j => {
      if (!j || !j.daily) return; const d = j.daily, dias = {};
      d.time.forEach((t, i) => { dias[t] = { sens: d.apparent_temperature_max[i], chuva: d.precipitation_probability_max[i], por_do_sol: (d.sunset[i] || '').slice(11, 16), uv: d.uv_index_max[i] }; });
      PREV = { t: Date.now(), dias };
      try { sessionStorage.setItem('previsao', JSON.stringify(PREV)); } catch (e) {}
      if (/^#(hoje|home|[a-z]{3}|)$/.test(location.hash || '') && typeof route === 'function') route();
    }).catch(() => {});
}
function climaDoDia(isoDia) {
  const p = PREV && PREV.dias && PREV.dias[isoDia]; if (!p) return '';
  const hora = new Date(PREV.t).toTimeString().slice(0, 5), longe = (new Date(isoDia) - new Date(isoLocal())) / 864e5 > 2;
  const avisos = [];
  if (p.sens >= 30) avisos.push('calor: corrida só cedo ou na esteira');
  if (p.chuva >= 50) avisos.push('chuva provável: esteira ou casa como plano B');
  return `<div class="par">Clima: sensação máxima ${fNum(p.sens, 0)} °C · chuva ${fNum(p.chuva, 0)}% · pôr do sol ${esc(p.por_do_sol)}${p.uv != null ? ' · UV ' + fNum(p.uv, 0) : ''}${avisos.length ? '<br><b>' + esc(avisos.join('; ')) + '.</b>' : ''}
    <small style="display:block;color:var(--sec)">Previsão de ${esc(hora)}${longe ? '. Depois de 2 dias vale como tendência, não como plano.' : '.'}</small></div>`;
}
function isoDoDia(ddmm) {   // 'DD/MM' -> ISO do ano mais próximo de hoje (certo na virada do ano)
  const h = new Date(), m = +ddmm.slice(3, 5) - 1, dia = +ddmm.slice(0, 2); let melhor = null;
  [h.getFullYear() - 1, h.getFullYear(), h.getFullYear() + 1].forEach(a => { const t = new Date(a, m, dia); if (!melhor || Math.abs(t - h) < Math.abs(melhor - h)) melhor = t; });
  return isoLocal(melhor);
}
function blocoJanela(d) {
  const j = d && d.janela, iso = isoDoDia(d.data);
  const clima = climaDoDia(iso);
  if (!j && !clima) return '';
  return `<section class="bloco"><div class="cab"><h2>Janela do dia</h2><small>quando, onde e plano B</small></div>
    ${j ? `<div class="par"><b>Quando e onde:</b> ${esc(j.quando)}</div><div class="par"><b>Plano B:</b> ${esc(j.plano_b)}</div>` : ''}${clima}</section>`;
}

// ───────── o que como agora ─────────
function blocoComer() {
  const iso = isoLocal(), p = proteinaDoDia(iso), piso = DATA.dieta.proteina_piso || 140;
  return `<section class="bloco"><div class="cab"><h2>O que como agora</h2><small>por situação</small></div>
    <div class="linha" style="align-items:flex-start"><span class="corpo"><b>Marmita</b><small>só com 35 g de proteína ou mais no rótulo e vegetal visível no prato.</small></span></div>
    <div class="linha" style="align-items:flex-start"><span class="corpo"><b>Delivery ou restaurante</b><small>proteína grelhada, sem fritura, um vegetal. Arroz depois, em meia porção.</small></span></div>
    <div class="linha" style="align-items:flex-start"><span class="corpo"><b>Cozinhando</b><small>proteína (uma janta de peixe na semana), 2 legumes de famílias diferentes e meia porção de arroz integral.</small></span></div>
    <div class="linha" style="align-items:flex-start"><span class="corpo"><b>Fome entre as refeições</b><small>17h: iogurte, whey, granola e fruta, antes de qualquer doce.</small></span></div>
    ${p.registradas ? `<div class="aviso">Hoje: ${fNum(p.g, 0)} g registrados com número${p.g < piso ? ', faltam pelo menos ' + fNum(piso - p.g, 0) + ' g para o piso de ' + piso + ' g' : ', piso atingido'}.</div>` : ''}</section>`;
}

// ───────── evolução: porteira da fase 2 e volume por grupo ─────────
function blocoPorteira() {
  if (typeof DASH === 'undefined' || !DASH) return '';
  const R = DASH.recuperacao || {}, fc = (R.fc_repouso || []).slice(-3), hv = (R.hrv || []).slice(-1)[0];
  const fcOk = fc.length === 3 && fc.every(x => x.valor <= 52), hvOk = hv && hv.valor >= 38;
  const sem = (DASH.frequencia || []).slice(-3, -1);   // as duas semanas fechadas mais recentes
  const corridas = null;   // contagem de corridas por semana ainda não vem do relógio: só os 7 dias recentes
  const linha = (ok, nome, det) => `<div class="linha" style="align-items:flex-start"><span class="corpo">${esc(nome)}<small>${esc(det)}</small></span><span class="st ${ok === true ? 'ok' : ok === false ? 'nao' : 'par'}">${ok === true ? '● ok' : ok === false ? '○ ainda não' : '◐ sem dado'}</span></div>`;
  return `<section class="bloco"><div class="cab"><h2>Porteira da fase 2</h2><small>corrida com qualidade</small></div>
    ${linha(fcOk, 'FC de repouso até 52 bpm por 3 dias seguidos', fc.length ? 'últimos 3 dias: ' + fc.map(x => fNum(x.valor, 0)).join(', ') + ' bpm' : 'sem dado')}
    ${linha(hvOk, 'VFC de 38 ms ou mais', hv ? 'última leitura: ' + fNum(hv.valor, 0) + ' ms' : 'sem dado')}
    ${linha(corridas, 'Duas semanas com 5 corridas ou mais', 'o relógio ainda não conta corridas por semana; hoje só vemos os últimos 7 dias')}
    <div class="aviso">Só abre a fase 2 (um dia de qualidade por semana) com os três (PROJETO_CHAT §15). Sem os três, ficar na fase 1 não é atraso: é o que faz a fase seguinte render.</div></section>`;
}
function blocoVolume() {
  const regs = (typeof REGISTROS !== 'undefined' ? REGISTROS : []).filter(r => r.tipo === 'Treino'); if (!regs.length) return '';
  const grupos = (TREINOS && TREINOS.biblioteca && TREINOS.biblioteca.grupos) || {}, corte = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const nomes = { peito_empurrar: 'Peito', ombro_empurrar: 'Ombro (empurrar)', costas: 'Costas', biceps: 'Bíceps', triceps: 'Tríceps', ombro_lateral: 'Ombro lateral', core_tempo: 'Core', core_dinamico: 'Core', quadriceps_composto: 'Pernas (quadríceps)', extensao: 'Pernas (quadríceps)', posterior: 'Posterior de coxa', unilateral: 'Pernas (unilateral)', panturrilha: 'Panturrilha' };
  const contagem = {}; let n = 0;
  regs.filter(r => r.data >= corte).forEach(r => { const m = String(r.texto).match(/#sets (\{.*\})\s*$/); if (!m) return;
    try { (JSON.parse(m[1]).ex || []).forEach(e => { const id = e.o || e.i; const g = Object.keys(grupos).find(k => grupos[k].opcoes.some(o => o.id === id) || grupos[k].chaves.some(c => id.indexOf(c) >= 0));
      const nome = nomes[g] || 'Outros'; contagem[nome] = (contagem[nome] || 0) + (e.s || []).length; n += (e.s || []).length; }); } catch (x) {} });
  if (!n) return '';
  const itens = Object.entries(contagem).sort((a, b) => b[1] - a[1]), mx = Math.max(...itens.map(i => i[1]));
  return `<section class="bloco"><div class="cab"><h2>Séries por grupo</h2><small>últimos 7 dias · treinos do painel</small></div>
    ${typeof hbarras === 'function' ? hbarras(itens.map(([nome, v]) => ({ nome, v })), i => i.v, i => i.nome, mx) : ''}
    <div class="alim-leitura">Conta as séries feitas, pelo exercício do plano. Só entram treinos registrados no painel.</div></section>`;
}
