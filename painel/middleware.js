// Barreira de acesso (31/10/2026, avaliação profunda): /api/* e /data/* só respondem com o código de acesso do Fabio
// (cabeçalho x-painel-key). O código fica em PAINEL_KEY na Vercel e no .env local; o app o guarda no aparelho.
// Sem PAINEL_KEY configurada a barreira fica desligada (para não travar o app na primeira publicação);
// ./ativar_acesso.sh gera o código, grava nos dois lugares e liga a barreira.
export const config = { matcher: ['/api/:path*', '/data/:path*'] };

function igual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export default function middleware(request) {
  const chave = process.env.PAINEL_KEY;
  if (!chave) return;
  // o webhook do Telegram não manda o código do painel: a função confere o próprio segredo (api/telegram.js)
  if (new URL(request.url).pathname === '/api/telegram') return;   // barreira desligada: segue para a página ou a função
  const dado = request.headers.get('x-painel-key') || '';
  if (igual(dado, chave)) return;
  return new Response(JSON.stringify({ erro: 'acesso' }), {
    status: 401, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
