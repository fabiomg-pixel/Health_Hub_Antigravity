#!/bin/zsh
# GET autenticado no painel, para as rotinas do bot (31/10/2026). Uso: ./painel_get.sh /api/registros?paginas=3
# Lê PAINEL_KEY do .env e a entrega ao curl por um descritor temporário (nunca na linha de comando).
cd "$(dirname "$0")"
KEY=$(grep '^PAINEL_KEY=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"' ')
[ -z "$KEY" ] && KEY="${PAINEL_KEY:-}"   # na nuvem não há .env: o código vem da variável de ambiente PAINEL_KEY
if [ -n "$KEY" ]; then
  exec curl -s -m 40 -K <(printf 'header = "x-painel-key: %s"\n' "$KEY") "https://painel-xi-three.vercel.app$1"
else
  exec curl -s -m 40 "https://painel-xi-three.vercel.app$1"
fi
