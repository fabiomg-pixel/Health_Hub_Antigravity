// Função serverless: recebe um registro CRU de alimentação, treino ou observação
// (texto/foto) e grava na caixa "🍽️ Diário (bruto)" do Notion. SEM análise — só captura.
//
// Env vars necessárias (Vercel):
//   NOTION_TOKEN   — token de integração interna do Notion (secret_...)
//   DIARIO_DB_ID   — id da database Diário (bruto): 053f6cb9703b49fa87cfd6e6187f7b97
//   BLOB_READ_WRITE_TOKEN — injetado automaticamente ao conectar um Vercel Blob store
//   LOG_KEY (opcional) — chave simples anti-spam; se setada, o request precisa mandá-la

import { put } from '@vercel/blob';
import { autorizado } from './_auth.js';

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!autorizado(req)) return res.status(401).json({ erro: 'acesso' });

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DB = process.env.DIARIO_DB_ID;
  if (!NOTION_TOKEN || !DB) return res.status(500).json({ error: 'Config faltando (NOTION_TOKEN/DIARIO_DB_ID).' });

  if (process.env.LOG_KEY && req.headers['x-log-key'] !== process.env.LOG_KEY)
    return res.status(401).json({ error: 'unauthorized' });

  try {
    const { texto = '', refeicao = 'Outro', tipo = 'refeicao', data, hora, photoBase64, photos, fileName } = req.body || {};
    const dia = (data || new Date().toISOString().slice(0, 10)).slice(0, 10);
    // Horário opcional (pedido do Fabio, 19/10): vai junto na Data do Notion, no fuso do Rio. Quem lê pela
    // /api/registros continua recebendo `data` só com o dia, e o horário à parte em `hora`.
    const temHora = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(hora || ''));
    const isTreino = tipo === 'treino';
    const isObs = tipo === 'observacao';
    const tipoLabel = isTreino ? 'Treino' : isObs ? 'Observação' : 'Refeição';

    // Até 3 fotos por registro (pedido do Fabio, 19/10). `photoBase64` sozinho continua valendo.
    const lista = (Array.isArray(photos) ? photos : []).concat(photoBase64 ? [photoBase64] : []).filter(Boolean).slice(0, 3);
    let fotoProp;
    if (lista.length) {
      const files = [];
      for (let i = 0; i < lista.length; i++) {
        const buf = Buffer.from(String(lista[i]).split(',').pop(), 'base64');
        const blob = await put(`diario/${dia}-${Date.now()}-${i + 1}.jpg`, buf, { access: 'public', contentType: 'image/jpeg' });
        files.push({ type: 'external', name: lista.length > 1 ? `foto-${i + 1}.jpg` : (fileName || 'foto.jpg'), external: { url: blob.url } });
      }
      fotoProp = { files };
    }

    const props = {
      'Entrada': { title: [{ text: { content: isTreino ? `Treino ${dia}` : isObs ? `Observação ${dia}` : `${refeicao} ${dia}` } }] },
      'Data': { date: { start: temHora ? `${dia}T${hora}:00.000-03:00` : dia } },
      'Tipo': { select: { name: tipoLabel } },
      'Texto': { rich_text: texto ? [{ text: { content: String(texto).slice(0, 1900) } }] : [] },
      'Processado': { checkbox: false },
    };
    if (!isTreino && !isObs) props['Refeição'] = { select: { name: refeicao } };
    if (fotoProp) props['Foto'] = fotoProp;

    const r = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ parent: { database_id: DB }, properties: props }),
    });

    if (!r.ok) return res.status(502).json({ error: 'notion', detail: await r.text() });
    return res.status(200).json({ ok: true, dia, tipo: isTreino ? 'treino' : isObs ? 'observacao' : 'refeicao', refeicao: (isTreino || isObs) ? null : refeicao, hora: temHora ? hora : null, foto: !!fotoProp, fotos: lista.length });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
