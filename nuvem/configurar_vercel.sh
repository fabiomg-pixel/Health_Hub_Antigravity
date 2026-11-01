#!/usr/bin/env bash
# Modo Nuvem, passo 1 (você roda, uma vez): grava na Vercel os segredos da porta do Telegram e publica o painel.
# Nenhum valor aparece na tela. O token do bot e o chat vêm dos arquivos do bot no Mac; o token do GitHub você cola
# (fica oculto). O segredo do webhook é gerado aqui e guardado em ~/.claude/channels/telegram-saude/webhook_secret.
set -euo pipefail
cd "$(dirname "$0")/../painel"
B="$HOME/.claude/channels/telegram-saude"
TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$B/.env" | head -1 | cut -d= -f2- | tr -d "\"' ")
CHAT=$(python3 -c "import json;print(json.load(open('$B/access.json'))['allowFrom'][0])")
[ -n "$TOKEN" ] && [ -n "$CHAT" ] || { echo "Não achei o token do bot ou o chat em $B"; exit 1; }
if [ ! -s "$B/webhook_secret" ]; then (umask 077; openssl rand -hex 24 > "$B/webhook_secret"); fi
SEGREDO=$(cat "$B/webhook_secret")
echo "Cole o token fino do GitHub (só o repositório health-hub, Issues: leitura e escrita) e tecle Enter:"
read -rs GH; echo
[ -n "$GH" ] || { echo "Token vazio; nada gravado."; exit 1; }
for par in "TELEGRAM_BOT_TOKEN:$TOKEN" "TELEGRAM_CHAT_ID:$CHAT" "TELEGRAM_WEBHOOK_SECRET:$SEGREDO" "GITHUB_TOKEN:$GH"; do
  nome=${par%%:*}; valor=${par#*:}
  printf '%s' "$valor" | npx vercel env add "$nome" production --force > /dev/null 2>&1 && echo "gravado na Vercel: $nome" || { echo "falhou: $nome"; exit 1; }
done
npx vercel deploy --prod --yes > /dev/null 2>&1
npx vercel deploy --prod --yes 2>&1 | grep -i aliased || echo "deploy sem alias: confira à mão"
echo "Pronto. Próximo: os dois segredos na rotina da nuvem (TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID) e o teste."
