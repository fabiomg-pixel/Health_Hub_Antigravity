// PATCH/DELETE /api/registro — corrige ou remove um registro já gravado no
// 🍽️ Diário (bruto). Existe porque o erro mais comum é gravar na DATA errada,
// e até então o app só sabia criar.
//
// PATCH  { id, data?, texto?, refeicao?, tipo? }  → atualiza os campos enviados
// DELETE { id }                                   → archived:true (lixeira do
//         Notion, recuperável por 30 dias — não é deleção permanente)
//
// Env vars: NOTION_TOKEN, LOG_KEY (opcional, mesma do /api/log)

import { autorizado } from './_auth.js';

const NOTION = 'https://api.notion.com/v1';
const TIPOS = new Set(['Refeição', 'Treino', 'Observação']);
const REFEICOES = new Set(['Café', 'Almoço', 'Jantar', 'Lanche', 'Outro']);

function headers(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28',
  };
}

// O título carrega tipo + data ("Almoço 2026-08-03"), então mudar qualquer um
// dos dois obriga a regerar — senão o título mente sobre o próprio registro.
function titulo(tipo, refeicao, dia) {
  if (tipo === 'Treino') return `Treino ${dia}`;
  if (tipo === 'Observação') return `Observação ${dia}`;
  return `${refeicao || 'Refeição'} ${dia}`;
}

export default async function handler(req, res) {
  if (!autorizado(req)) return res.status(401).json({ erro: 'acesso' });
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  if (!NOTION_TOKEN) return res.status(500).json({ error: 'Config faltando (NOTION_TOKEN).' });

  if (process.env.LOG_KEY && req.headers['x-log-key'] !== process.env.LOG_KEY)
    return res.status(401).json({ error: 'unauthorized' });

  if (req.method !== 'PATCH' && req.method !== 'DELETE')
    return res.status(405).json({ error: 'PATCH ou DELETE' });

  const body = req.body || {};
  const id = String(body.id || req.query?.id || '').trim();
  if (!id) return res.status(400).json({ error: 'id obrigatório' });

  try {
    if (req.method === 'DELETE') {
      const r = await fetch(`${NOTION}/pages/${id}`, {
        method: 'PATCH',
        headers: headers(NOTION_TOKEN),
        body: JSON.stringify({ archived: true }),
      });
      if (!r.ok) return res.status(502).json({ error: 'notion', detail: await r.text() });
      return res.status(200).json({ ok: true, acao: 'excluido' });
    }

    // PATCH: só mexe no que veio. Mas se data/tipo/refeição mudarem, o título
    // precisa ser recalculado — e pra isso é preciso saber os valores atuais.
    const atualRes = await fetch(`${NOTION}/pages/${id}`, { headers: headers(NOTION_TOKEN) });
    if (!atualRes.ok) return res.status(404).json({ error: 'registro não encontrado' });
    const atual = await atualRes.json();
    const pr = atual.properties || {};

    const dia = (body.data || pr.Data?.date?.start || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return res.status(400).json({ error: 'data inválida (use AAAA-MM-DD)' });

    // Horário: o que veio no pedido; senão, o que já estava gravado (corrigir a data não apaga a hora).
    const horaAtual = (pr.Data?.date?.start || '').length > 10 ? pr.Data.date.start.slice(11, 16) : '';
    const hora = body.hora !== undefined ? String(body.hora || '') : horaAtual;
    if (hora && !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return res.status(400).json({ error: 'hora inválida (use HH:MM)' });

    const tipo = body.tipo || pr.Tipo?.select?.name || 'Refeição';
    if (!TIPOS.has(tipo)) return res.status(400).json({ error: 'tipo inválido' });

    const refeicao = tipo === 'Refeição'
      ? (body.refeicao || pr['Refeição']?.select?.name || 'Outro')
      : null;
    if (refeicao && !REFEICOES.has(refeicao)) return res.status(400).json({ error: 'refeição inválida' });

    const props = {
      'Entrada': { title: [{ text: { content: titulo(tipo, refeicao, dia) } }] },
      'Data': { date: { start: hora ? `${dia}T${hora}:00.000-03:00` : dia } },
      'Tipo': { select: { name: tipo } },
    };
    if (body.texto !== undefined)
      props['Texto'] = { rich_text: body.texto ? [{ text: { content: String(body.texto).slice(0, 1900) } }] : [] };
    // Refeição só existe em registros de comida; ao virar Treino/Observação, limpa.
    props['Refeição'] = refeicao ? { select: { name: refeicao } } : { select: null };

    // Corrigir um registro o devolve pra fila: a leitura anterior estava errada.
    if (body.data || body.hora !== undefined || body.texto !== undefined || body.refeicao || body.tipo)
      props['Processado'] = { checkbox: false };

    const r = await fetch(`${NOTION}/pages/${id}`, {
      method: 'PATCH',
      headers: headers(NOTION_TOKEN),
      body: JSON.stringify({ properties: props }),
    });
    if (!r.ok) return res.status(502).json({ error: 'notion', detail: await r.text() });
    return res.status(200).json({ ok: true, acao: 'editado', dia, tipo, refeicao });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
