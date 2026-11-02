// Barreira de acesso (31/10/2026, avaliação profunda): /api/* e /data/* só respondem com o código de acesso do Fabio
// (cabeçalho x-painel-key). O código fica em PAINEL_KEY na Vercel e no .env local; o app o guarda no aparelho.
// Sem PAINEL_KEY configurada a barreira fica desligada; ./ativar_acesso.sh gera o código e liga a barreira.
export const config = { matcher: ['/api/:path*', '/data/:path*'] };

// Estas duas portas são chamadas pelo Telegram e pelo GitHub (modo Nuvem, 01/11), que não têm o código do Fabio.
// Cada uma confere o próprio segredo (secret_token do Telegram; assinatura HMAC do GitHub) e recusa o resto.
const PORTAS_COM_SEGREDO_PROPRIO = ['/api/telegram', '/api/github'];

function igual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export default function middleware(request) {
  const chave = process.env.PAINEL_KEY;
  if (!chave) return;   // barreira desligada: segue para a página ou a função
  const caminho = new URL(request.url).pathname.replace(/\/$/, '');
  if (PORTAS_COM_SEGREDO_PROPRIO.includes(caminho)) return;
  const dado = request.headers.get('x-painel-key') || '';
  if (igual(dado, chave)) return;
  return new Response(JSON.stringify({ erro: 'acesso' }), {
    status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
