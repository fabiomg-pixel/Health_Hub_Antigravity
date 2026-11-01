// Função serverless: porta de entrada do bot de saúde no modo Nuvem (Fabio, 01/11/2026). O Telegram entrega aqui
// cada mensagem (webhook); a função confere o segredo e o chat, mostra "digitando…" e abre uma issue com a etiqueta
// `telegram` no repositório privado. A issue dispara a rotina do Claude na nuvem, que lê, decide, grava e responde.
// Esta função não pensa nem responde: só encaminha. Roteiro da rotina: rotinas/telegram_nuvem.md. A resposta volta por
// api/github.js (comentário na issue → Telegram), então a nuvem não guarda segredo nenhum. Fotos vão para o Vercel Blob
// (como as do diário) e a issue leva só o endereço.
//
// Env vars necessárias (Vercel):
//   TELEGRAM_BOT_TOKEN       — token do @Silvester_TheTrainer_bot (só para "digitando…" e aviso de falha)
//   TELEGRAM_CHAT_ID         — o único chat atendido (o do Fabio); outros são ignorados em silêncio
//   TELEGRAM_WEBHOOK_SECRET  — o mesmo valor passado ao setWebhook (secret_token); sem ele, nada entra
//   GITHUB_TOKEN             — token fino só deste repositório, com permissão de escrita em issues
//   GITHUB_REPO (opcional)   — padrão fabiomg-pixel/health-hub
//   BLOB_READ_WRITE_TOKEN    — injetado pela Vercel (o mesmo store das fotos do diário)

import { put } from '@vercel/blob';

const REPO = () => process.env.GITHUB_REPO || 'fabiomg-pixel/health-hub';

function igual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function telegram(metodo, corpo) {
  const t = process.env.TELEGRAM_BOT_TOKEN; if (!t) return;
  try {
    await fetch(`https://api.telegram.org/bot${t}/${metodo}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  } catch (e) {}
}

// o que a rotina precisa de cada mensagem; arquivos vão só como file_id (a rotina baixa com telegram_baixar.py)
function resumo(m) {
  const fotos = Array.isArray(m.photo) && m.photo.length ? [m.photo[m.photo.length - 1].file_id] : [];
  return {
    message_id: m.message_id,
    data: new Date((m.date || 0) * 1000).toISOString(),
    texto: m.text || m.caption || '',
    fotos,
    documento: m.document ? { file_id: m.document.file_id, nome: m.document.file_name || '', tipo: m.document.mime_type || '' } : null,
    voz: m.voice ? { file_id: m.voice.file_id, segundos: m.voice.duration } : null,
    responde_a: m.reply_to_message ? { message_id: m.reply_to_message.message_id, texto: (m.reply_to_message.text || m.reply_to_message.caption || '').slice(0, 500) } : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'POST only' });
  if (!igual(req.headers['x-telegram-bot-api-secret-token'] || '', process.env.TELEGRAM_WEBHOOK_SECRET || '')) return res.status(401).json({ erro: 'acesso' });
  const m = req.body && (req.body.message || req.body.edited_message);
  // sempre 200 para o que não é do Fabio: o Telegram não reenvia e quem tenta não aprende nada
  if (!m || !m.chat || String(m.chat.id) !== String(process.env.TELEGRAM_CHAT_ID || '')) return res.status(200).json({ ok: true });

  await telegram('sendChatAction', { chat_id: m.chat.id, action: 'typing' });
  const r = resumo(m);
  r.fotos_url = [];
  for (const fid of r.fotos) {   // a nuvem não tem o token do bot: a foto vai para o Blob e a issue leva o endereço
    try {
      const t = process.env.TELEGRAM_BOT_TOKEN;
      const f = await (await fetch(`https://api.telegram.org/bot${t}/getFile?file_id=${encodeURIComponent(fid)}`)).json();
      const bin = Buffer.from(await (await fetch(`https://api.telegram.org/file/bot${t}/${f.result.file_path}`)).arrayBuffer());
      const b = await put(`telegram/${r.data.slice(0, 10)}-${r.message_id}.jpg`, bin, { access: 'public', contentType: 'image/jpeg' });
      r.fotos_url.push(b.url);
    } catch (e) { r.fotos_url.push(null); }
  }
  const titulo = `telegram ${r.message_id}: ${(r.texto || (r.fotos.length ? '[foto]' : r.voz ? '[áudio]' : r.documento ? '[arquivo]' : '[mensagem]')).replace(/\s+/g, ' ').slice(0, 60)}`;
  const corpo = 'Mensagem do Fabio pelo Telegram. A rotina da nuvem processa e fecha esta issue.\n\n```json\n' + JSON.stringify(r, null, 1) + '\n```\n';
  try {
    const g = await fetch(`https://api.github.com/repos/${REPO()}/issues`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'painel-saude', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titulo, body: corpo, labels: ['telegram'] }),
    });
    if (!g.ok) throw new Error('GitHub ' + g.status);
  } catch (e) {
    await telegram('sendMessage', { chat_id: m.chat.id, text: 'Não consegui encaminhar sua mensagem para o copiloto agora (' + e.message + '). Tente de novo em alguns minutos.' });
  }
  return res.status(200).json({ ok: true });
}
