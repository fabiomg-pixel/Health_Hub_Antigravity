// Função serverless: recebe um registro CRU de alimentação, treino ou observação
// (texto/foto) e grava na caixa "🍽️ Diário (bruto)" do Notion. SEM análise — só captura.
//
// Env vars necessárias (Vercel):
//   NOTION_TOKEN   — token de integração interna do Notion (secret_...)
//   DIARIO_DB_ID   — id da database Diário (bruto): 053f6cb9703b49fa87cfd6e6187f7b97
//   BLOB_READ_WRITE_TOKEN — injetado automaticamente ao conectar um Vercel Blob store
//   LOG_KEY (opcional) — chave simples anti-spam; se setada, o request precisa mandá-la

import { put } from '@vercel/blob';

export const config = { api: { bodyParser: { sizeLimit: '6mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DB = process.env.DIARIO_DB_ID;
  if (!NOTION_TOKEN || !DB) return res.status(500).json({ error: 'Config faltando (NOTION_TOKEN/DIARIO_DB_ID).' });

  if (process.env.LOG_KEY && req.headers['x-log-key'] !== process.env.LOG_KEY)
    return res.status(401).json({ error: 'unauthorized' });

  try {
    const { texto = '', refeicao = 'Outro', tipo = 'refeicao', data, photoBase64, fileName } = req.body || {};
    const dia = (data || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const isTreino = tipo === 'treino';
    const isObs = tipo === 'observacao';
    const tipoLabel = isTreino ? 'Treino' : isObs ? 'Observação' : 'Refeição';

    let fotoProp;
    if (photoBase64) {
      const buf = Buffer.from(String(photoBase64).split(',').pop(), 'base64');
      const safe = `diario/${dia}-${Date.now()}.jpg`;
      const blob = await put(safe, buf, { access: 'public', contentType: 'image/jpeg' });
      fotoProp = { files: [{ type: 'external', name: fileName || 'foto.jpg', external: { url: blob.url } }] };
    }

    const props = {
      'Entrada': { title: [{ text: { content: isTreino ? `Treino ${dia}` : isObs ? `Observação ${dia}` : `${refeicao} ${dia}` } }] },
      'Data': { date: { start: dia } },
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
    return res.status(200).json({ ok: true, dia, tipo: isTreino ? 'treino' : isObs ? 'observacao' : 'refeicao', refeicao: (isTreino || isObs) ? null : refeicao, foto: !!fotoProp });
  } catch (e) {
    return res.status(500).json({ error: String(e && e.message || e) });
  }
}
