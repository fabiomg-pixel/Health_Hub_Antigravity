// Função serverless: saída do bot de saúde no modo Nuvem (Fabio, 01/11/2026). A rotina da nuvem responde comentando
// na issue da mensagem, com a primeira linha `[[telegram]]`; o GitHub avisa aqui (webhook issue_comment) e esta função
// manda o resto do comentário para o chat do Fabio. Assim só a Vercel guarda o token do bot.
//
// Env vars necessárias (Vercel):
//   GITHUB_WEBHOOK_SECRET — o mesmo segredo do webhook do repositório (assinatura X-Hub-Signature-256)
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID — os mesmos de api/telegram.js

import crypto from 'crypto';

export const config = { api: { bodyParser: false } };   // a assinatura é sobre o corpo cru

const MARCA = '[[telegram]]';

async function cru(req) {
  const partes = [];
  for await (const p of req) partes.push(typeof p === 'string' ? Buffer.from(p) : p);
  return Buffer.concat(partes);
}

function assinaturaOk(corpo, cab) {
  const seg = process.env.GITHUB_WEBHOOK_SECRET;
  if (!seg || !cab) return false;
  const esperado = 'sha256=' + crypto.createHmac('sha256', seg).update(corpo).digest('hex');
  const a = Buffer.from(esperado), b = Buffer.from(String(cab));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// o Telegram aceita até 4096 caracteres por mensagem
function pedacos(t, n = 3900) {
  const out = []; let atual = '';
  for (const l of t.split('\n')) { if ((atual + l).length + 1 > n && atual) { out.push(atual); atual = ''; } atual += l + '\n'; }
  if (atual.trim()) out.push(atual);
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'POST only' });
  const corpo = await cru(req);
  if (!assinaturaOk(corpo, req.headers['x-hub-signature-256'])) return res.status(401).json({ erro: 'assinatura' });
  if (req.headers['x-github-event'] !== 'issue_comment') return res.status(200).json({ ok: true, ignorado: 'evento' });
  let ev; try { ev = JSON.parse(corpo.toString('utf8')); } catch (e) { return res.status(400).json({ erro: 'json' }); }
  const texto = ev.action === 'created' && ev.comment && typeof ev.comment.body === 'string' ? ev.comment.body : '';
  if (!texto.startsWith(MARCA)) return res.status(200).json({ ok: true, ignorado: 'sem marca' });
  const msg = texto.slice(MARCA.length).replace(/^\s*\n/, '').trim();
  if (!msg) return res.status(200).json({ ok: true, ignorado: 'vazio' });
  const t = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  for (const p of pedacos(msg)) {
    const r = await fetch(`https://api.telegram.org/bot${t}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: p, disable_web_page_preview: true }) });
    if (!r.ok) return res.status(502).json({ erro: 'telegram ' + r.status });   // 502: o GitHub mostra a falha no webhook
  }
  return res.status(200).json({ ok: true });
}
