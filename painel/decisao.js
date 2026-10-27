// Apoio à decisão (11/10/2026): o painel diz "pode, ajustar ou segurar" sozinho, mostra a proteína que
// de fato foi registrada, a janela de cada dia com a previsão e o que comer agora. Tudo derivado de dados
// que já existem (fatos.json, semana.json, registros). Quando falta dado, diz que falta: nunca palpite.
//
// Regras (NÍVEL DE BASE SUBIDO pelo Fabio em 27/10/2026; antes, cortes da fase do resfriado, de 11/10):
//   SEGURAR : 3 ou mais dias seguidos em banda vermelha, OU prontidão do Garmin < 30, OU noite < 5,5 h com
//             VFC < 30 ou FC de repouso >= 58. Volume 30% menor e nada intenso.
//   AJUSTAR : prontidão do Garmin 30-44, OU noite < 5,5 h, OU índice próprio vermelho. Faz o treino do plano,
//             com todas as séries, sem a parte intensa e sem recorde de carga (tirar 1 série é só sugestão,
//             se ele não estiver bem; nunca o padrão, Fabio 27/10).
//   PODE    : o resto (índice amarelo e prontidão de 45 para cima são dias normais de treino). Com prontidão
//             >= 60 e FC de repouso média < 57, a carga pode subir (progressão dupla).
// O índice próprio é cerca de 30 pontos mais duro que o Garmin por desenho: sozinho, amarelo não corta nada.
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
  if (pront != null && pront < 30) segurar.push('prontidão do Garmin em ' + pront + ' (abaixo de 30)');
  if (sono != null && sono < 5.5 && ((hrv != null && hrv < 30) || (fc != null && fc >= 58)))
    segurar.push('noite de ' + fNum(sono, 1) + ' h com ' + (hrv != null && hrv < 30 ? 'VFC ' + hrv + ' ms' : 'FC de repouso ' + fc + ' bpm'));
  if (pront != null && pront >= 30 && pront < 45) ajustar.push('prontidão do Garmin em ' + pront + ' (30 a 44)');
  if (sono != null && sono < 5.5) ajustar.push('noite curta: ' + fNum(sono, 1) + ' h de sono');
  if (confiavel && rc.banda_hoje === 'r') ajustar.push('o índice próprio de hoje (' + fNum(idx, 0) + ') está vermelho');
  const medios = [h7 != null && h7 < 35, f7 != null && f7 >= 57, s7 != null && s7 < 6].filter(Boolean).length;
  const resumo7 = 'sono ' + fNum(s7, 1) + ' h, VFC ' + fNum(h7, 0) + ' ms, FC de repouso ' + fNum(f7, 0) + ' bpm';
  let estado = 'pode', motivos = [];
  if (dadosDe && dadosDe !== hoje) { estado = 'sem_dado'; motivos = ['A última leitura do relógio é de ' + isoDDMM(dadosDe) + ': ainda não há a de hoje. Treine o plano e ajuste pelo que sentir.']; }
  else if (segurar.length) { estado = 'segurar'; motivos = segurar; }
  else if (ajustar.length) { estado = 'ajustar'; motivos = ajustar; }
  else if (!confiavel && pront == null) { estado = 'sem_dado'; motivos = ['O relógio ainda não mandou o sono e a VFC de hoje: treine o plano pela média de 7 dias (' + resumo7 + ') e pelo que sentir.']; }
  else motivos = ['Dia normal de treino' + (pront != null ? ' (prontidão do Garmin ' + pront + ')' : '') + '.'];
  const moderar = estado === 'pode' && medios >= 2;
  if (moderar) motivos.push('duas ou mais médias de 7 dias baixas: sem recorde de carga esta semana');
  const liberaCarga = estado === 'pode' && !moderar && (pront == null || pront >= 60) && !(f7 != null && f7 >= 57);
  return { estado, moderar, liberaCarga, motivos, medios, resumo7, dadosEm: f.gerado_em || '' };
}
const SEM_TXT = {
  pode: ['Pode', 'Siga o plano. Bateu o topo das repetições com 2 de sobra em todas as séries? Na próxima, suba a carga.'],
  moderar: ['Pode, sem recorde', 'Siga o plano inteiro, com 2 repetições de sobra e sem subir carga hoje.'],
  ajustar: ['Ajustar', 'Faça o treino do plano inteiro, todas as séries, sem subir carga hoje; na corrida, tudo em zona 2. Se não estiver se sentindo bem, tirar 1 série de cada exercício é uma opção, não a regra.'],
  segurar: ['Segurar', 'Volume 30% menor e nada intenso: tire 1 série de cada exercício; corrida vira 20 a 30 min bem fácil.'],
  sem_dado: ['Sem leitura', 'Sem dado de hoje não há decisão: use a média de 7 dias e o que você sente.']
};
function blocoSemaforo() {
  const s = avaliarSemaforo(), t = SEM_TXT[s.estado === 'pode' && s.moderar ? 'moderar' : s.estado];
  const atencao = s.estado === 'pode' && s.medios >= 2 ? `<div class="par" style="color:var(--sec)">A semana está em faixa média (${esc(s.resumo7)}): por isso a carga não sobe sozinha.</div>` : '';
  return `<section class="bloco"><div class="cab"><h2>Pode treinar hoje?</h2><small>${s.dadosEm ? 'dados de ' + esc(isoDDMM(s.dadosEm.slice(0, 10)) + ' às ' + s.dadosEm.slice(11, 16)) : ''}</small></div>
    <div class="linha" style="align-items:flex-start;border-bottom:0"><span class="sem sem-${s.estado}" role="img" aria-label="${esc(t[0])}">${esc(t[0])}</span>
      <span class="corpo" style="font-weight:500">${esc(t[1])}<small>${s.motivos.map(esc).join(' · ')}</small></span></div>${atencao}
    <details><summary>Como eu decido</summary><div class="miolo">
      <div class="par"><b>Segurar:</b> 3 ou mais dias seguidos em banda vermelha, prontidão do Garmin abaixo de 30, ou noite abaixo de 5,5 h com VFC abaixo de 30 ou FC de repouso a partir de 58.</div>
      <div class="par"><b>Ajustar:</b> prontidão do Garmin de 30 a 44, noite abaixo de 5,5 h, ou índice próprio vermelho.</div>
      <div class="par"><b>Pode, sem recorde:</b> duas ou mais médias de 7 dias baixas (VFC abaixo de 35, FC de repouso a partir de 57, sono abaixo de 6 h).</div>
      <div class="par"><b>Pode:</b> o resto. Índice amarelo e prontidão de 45 para cima são dias normais de treino. Nível de base subido por você em 27/10: os cortes antigos eram da fase do resfriado.</div></details></section>`;
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
  return 'Hoje o relógio pede para ajustar (' + s.motivos.join('; ') + '). Faça todas as séries, sem subir carga. Se não estiver se sentindo bem, pode tirar 1 série de cada exercício.';
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
    <div style="font-size:13.5px;color:var(--sec)">${planoG > 0 ? 'O plano do dia soma ' + planoG + ' g. ' : ''}${p.registradas ? (p.semNumero ? p.semNumero + ' refeição(ões) sem número entram só quando você informar a proteína ou fotografar o rótulo. ' : '') + (falta ? 'Faltam pelo menos ' + fNum(falta, 0) + ' g para o piso.' : 'O piso foi atingido com o que tem número.') : 'Anote a proteína ao registrar para a barra andar.'}</div>${dica}</div>`;
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
