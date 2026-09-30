// Copiloto conversacional do painel: recebe uma mensagem em linguagem natural,
// responde com o contexto real (plano da semana + fatos + registros recentes) e,
// quando o Fabio relata o que comeu ou treinou, GRAVA no Notion pela mesma porta
// que o formulário usa.
//
// Por que existe: registrar pelo formulário exige escolher tipo, refeição e data.
// Falar "almocei a N65 com 2 ovos" não exige nada — e o que não exige decisão é o
// que sobrevive à semana real dele (a lição que derrubou as 35 refeições de 14/09).
//
// Env vars (Vercel):
//   ANTHROPIC_API_KEY — obrigatória
//   BOT_MODEL         — opcional (padrão: claude-sonnet-5)
//   NOTION_TOKEN, DIARIO_DB_ID — para a ferramenta de registro
//   LOG_KEY           — opcional, mesma chave anti-spam do /api/log

const MAX_VOLTAS = 4;      // registrar + responder cabe em 2; 4 é folga
const MAX_HISTORICO = 12;  // pares de mensagem que voltam do cliente

const FERRAMENTAS = [
  {
    name: 'registrar_no_diario',
    description:
      'Grava um registro cru de refeição, treino ou observação no diário do Notion. ' +
      'Use SEMPRE que o Fabio relatar o que comeu, o que treinou ou como se sentiu — ' +
      'mesmo que ele não peça explicitamente para registrar. Um registro por refeição: ' +
      'se ele contar o almoço e a janta na mesma frase, chame a ferramenta duas vezes.',
    input_schema: {
      type: 'object',
      properties: {
        tipo: { type: 'string', enum: ['refeicao', 'treino', 'observacao'] },
        refeicao: {
          type: 'string',
          enum: ['Café', 'Almoço', 'Lanche', 'Jantar', 'Outro'],
          description: 'Só para tipo=refeicao. Na dúvida entre lanche e outro, use Lanche.',
        },
        texto: { type: 'string', description: 'O relato, com as palavras dele. Não interprete nem julgue aqui.' },
        data: { type: 'string', description: 'AAAA-MM-DD. Omita para hoje. "ontem" vira a data de ontem.' },
      },
      required: ['tipo', 'texto'],
    },
  },
];

function hoje() {
  // O painel é dele, no fuso de São Paulo; o runtime da Vercel roda em UTC.
  return new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

async function buscarJSON(url, opcoes) {
  try {
    const r = await fetch(url, opcoes);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function gravar({ tipo, refeicao, texto, data }) {
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DB = process.env.DIARIO_DB_ID;
  if (!NOTION_TOKEN || !DB) return { ok: false, erro: 'Notion não configurado nesta instalação.' };

  const dia = (data || hoje()).slice(0, 10);
  const isTreino = tipo === 'treino';
  const isObs = tipo === 'observacao';
  const rotulo = isTreino ? 'Treino' : isObs ? 'Observação' : 'Refeição';
  const ref = refeicao || 'Outro';

  const props = {
    'Entrada': { title: [{ text: { content: isTreino ? `Treino ${dia}` : isObs ? `Observação ${dia}` : `${ref} ${dia}` } }] },
    'Data': { date: { start: dia } },
    'Tipo': { select: { name: rotulo } },
    'Texto': { rich_text: [{ text: { content: String(texto).slice(0, 1900) } }] },
    'Processado': { checkbox: false },
  };
  if (!isTreino && !isObs) props['Refeição'] = { select: { name: ref } };

  const r = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({ parent: { database_id: DB }, properties: props }),
  });
  if (!r.ok) return { ok: false, erro: (await r.text()).slice(0, 300) };
  return { ok: true, dia, tipo: rotulo, refeicao: (isTreino || isObs) ? null : ref };
}

function montarContexto(semana, fatos, registros, diaISO) {
  const dia = semana?.dias?.find(d => {
    const [dd, mm] = String(d.data).split('/');
    return `${diaISO.slice(0, 4)}-${mm}-${dd}` === diaISO;
  });
  const refeicoesDeHoje = dia
    ? Object.entries(dia.refeicoes || {})
        .filter(([, m]) => m)
        .map(([k, m]) => `- ${k}: ${m.nome} (${m.kcal} kcal, ${m.prot} g)`)
        .join('\n')
    : '(o plano não tem card para hoje)';
  const recentes = (registros || [])
    .filter(x => x.data >= new Date(Date.parse(diaISO) - 2 * 864e5).toISOString().slice(0, 10))
    .map(x => `- ${x.data} · ${x.tipo}${x.refeicao ? ` (${x.refeicao})` : ''}: ${x.texto || '(só foto)'}`)
    .join('\n') || '(nada registrado nas últimas 72 h)';

  return `## HOJE É ${diaISO}

## PLANO DE HOJE (${dia ? dia.nome + ' ' + dia.data : '—'})
Treino: ${dia?.treino?.foco || '—'}
${(dia?.treino?.exercicios || []).slice(0, 8).map(e => `- ${e.nome}`).join('\n')}

Refeições planejadas:
${refeicoesDeHoje}

## REGRAS DA SEMANA
${(semana?.regra_prato?.linhas || []).map(l => `- ${l}`).join('\n')}
Meta no papel: ${semana?.dieta?.calorias} kcal · ${semana?.dieta?.proteina} g de proteína (piso real ${semana?.dieta?.proteina_piso} g).

## FATOS (única fonte de número — não invente nem recalcule)
Peso: última leitura ${fatos?.peso?.ultima?.peso_kg} kg em ${fatos?.peso?.ultima?.data}${fatos?.peso?.ultima?.pos_esforco ? ' (MANHÃ SEGUINTE A JOGO — vem ~0,26 kg abaixo do real, não é progresso)' : ''}.
Média das 7 leituras neutras: ${fatos?.peso?.media_7_neutras_de_verdade} kg · média de 28 dias neutras: ${fatos?.peso?.media_28d_neutras} kg.
Índice hoje: ${fatos?.recuperacao?.indice_hoje} (banda ${fatos?.recuperacao?.banda_hoje})${fatos?.recuperacao?.indice_hoje_confiavel === false ? ' ⚠️ CALCULADO COM COMPONENTES FALTANDO — use a média de 7 dias' : ''}; média 7d ${fatos?.recuperacao?.indice_medio_7d}.
Prontidão Garmin hoje: ${fatos?.recuperacao?.prontidao_garmin_hoje}. Dias vermelhos seguidos: ${fatos?.recuperacao?.dias_vermelhos_seguidos}.
Sono 7d: ${fatos?.recuperacao?.sono_medio_7d} h · HRV 7d ${fatos?.recuperacao?.hrv_medio_7d} (28d ${fatos?.recuperacao?.hrv_medio_28d}) · FC repouso 7d ${fatos?.recuperacao?.fc_repouso_7d} (28d ${fatos?.recuperacao?.fc_repouso_28d}).
Lacunas declaradas: ${(fatos?.lacunas || []).join(' | ') || 'nenhuma'}

## REGISTRADO NAS ÚLTIMAS 72 H
${recentes}`;
}

const PERSONA = `Você é o copiloto de saúde do Fabio, falando com ele pelo painel no celular.
Fisiologista, personal e nutricionista numa voz só, operando sobre dados reais.

COMO FALAR
- Português, direto, com o número na mão. Frases curtas. Nada de preâmbulo.
- Resposta de celular: no máximo 6 linhas, a não ser que ele peça análise longa.
- Tom de apoio, nunca de cobrança. Adesão parcial numa semana difícil é sucesso, não falha.
- Não repita de volta o que ele acabou de dizer.

O QUE FAZER
- Se ele relatar comida ou treino, REGISTRE com a ferramenta e confirme em uma linha
  ("anotado: almoço"). Registre primeiro, comente depois — e só comente se houver o que dizer.
- Se ele perguntar algo, responda com o número dos FATOS. Nunca invente ou recalcule métrica.
- Se o dado não existir, diga que não sabe. "Não tenho isso" é resposta melhor que estimativa.

REGRAS QUE NÃO SE QUEBRAM
- Pesagem na manhã seguinte a jogo ou corrida longa vem ~0,26 kg abaixo do real: é água e
  glicogênio, não progresso. O mesmo vale para o pico depois de dia de sódio alto.
- Pesagem sob anti-inflamatório não entra na série.
- Jogo de campeonato NÃO permite relógio (regra da competição). Nunca peça para ele levar e
  nunca trate a falta de dado como esquecimento — o relato dele em texto é a fonte primária.
- Nenhum termo técnico que autorize volume ("carga de carboidrato", "dia livre", "compensar").
  Ele executa a leitura mais generosa, e a culpa é da prescrição.
- Nada de conduta clínica: tornozelo, dor e remédio são do fisio e do médico. No máximo sinalize.
- Não mude o plano da semana por conta própria. Você pode ajustar o dia (trocar sessão por causa
  de chuva, calor, reunião, cansaço); mudar meta, macro ou o molde da semana é assunto do
  conselho de domingo — se ele pedir, diga que anota para domingo.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada na Vercel.' });
  if (process.env.LOG_KEY && req.headers['x-log-key'] !== process.env.LOG_KEY)
    return res.status(401).json({ error: 'unauthorized' });

  try {
    const { mensagem, historico = [] } = req.body || {};
    if (!mensagem || !String(mensagem).trim()) return res.status(400).json({ error: 'mensagem vazia' });

    const base = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
    const [semana, fatos, registros] = await Promise.all([
      buscarJSON(`${base}/data/semana.json`),
      buscarJSON(`${base}/data/fatos.json`),
      buscarJSON(`${base}/api/registros`),
    ]);
    const lista = Array.isArray(registros) ? registros : (registros && Object.values(registros)[0]) || [];
    const sistema = `${PERSONA}\n\n${montarContexto(semana, fatos, lista, hoje())}`;

    const mensagens = [
      ...historico.slice(-MAX_HISTORICO).filter(m => m && m.role && m.content),
      { role: 'user', content: String(mensagem).slice(0, 4000) },
    ];

    const gravados = [];
    let resposta = '';

    for (let volta = 0; volta < MAX_VOLTAS; volta++) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.BOT_MODEL || 'claude-sonnet-5',
          max_tokens: 1200,
          system: sistema,
          tools: FERRAMENTAS,
          messages: mensagens,
        }),
      });
      if (!r.ok) return res.status(502).json({ error: 'anthropic', detail: (await r.text()).slice(0, 400) });

      const data = await r.json();
      const blocos = data.content || [];
      resposta = blocos.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();

      const chamadas = blocos.filter(b => b.type === 'tool_use');
      if (!chamadas.length) break;

      mensagens.push({ role: 'assistant', content: blocos });
      const resultados = [];
      for (const c of chamadas) {
        const out = await gravar(c.input || {});
        if (out.ok) gravados.push({ dia: out.dia, tipo: out.tipo, refeicao: out.refeicao });
        resultados.push({ type: 'tool_result', tool_use_id: c.id, content: JSON.stringify(out) });
      }
      mensagens.push({ role: 'user', content: resultados });
    }

    return res.status(200).json({ resposta: resposta || '(sem resposta)', gravados });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
