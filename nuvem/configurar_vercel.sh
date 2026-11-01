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
if [ ! -s "$B/github_webhook_secret" ]; then (umask 077; openssl rand -hex 24 > "$B/github_webhook_secret"); fi
SEGREDO=$(cat "$B/webhook_secret"); SEG_GH=$(cat "$B/github_webhook_secret")
echo "Cole o token fino do GitHub (só o repositório health-hub, Issues: leitura e escrita) e tecle Enter:"
read -rs GH; echo
[ -n "$GH" ] || { echo "Token vazio; nada gravado."; exit 1; }
for par in "TELEGRAM_BOT_TOKEN:$TOKEN" "TELEGRAM_CHAT_ID:$CHAT" "TELEGRAM_WEBHOOK_SECRET:$SEGREDO" "GITHUB_TOKEN:$GH" "GITHUB_WEBHOOK_SECRET:$SEG_GH"; do
  nome=${par%%:*}; valor=${par#*:}
  printf '%s' "$valor" | npx vercel env add "$nome" production --force > /dev/null 2>&1 && echo "gravado na Vercel: $nome" || { echo "falhou: $nome"; exit 1; }
done
npx vercel deploy --prod --yes > /dev/null 2>&1
npx vercel deploy --prod --yes 2>&1 | grep -i aliased || echo "deploy sem alias: confira à mão"
# o GitHub avisa a Vercel quando a nuvem comenta (é a resposta voltando ao Telegram); só cria se ainda não existir
if ! gh api repos/fabiomg-pixel/health-hub/hooks --jq '.[].config.url' | grep -q '/api/github$'; then
  printf '{"name":"web","active":true,"events":["issue_comment"],"config":{"url":"https://painel-xi-three.vercel.app/api/github","content_type":"json","secret":"%s"}}' "$SEG_GH" \
    | gh api repos/fabiomg-pixel/health-hub/hooks --input - > /dev/null && echo "aviso do GitHub para a Vercel: criado"
else echo "aviso do GitHub para a Vercel: já existia"; fi
echo "Pronto. Próximo: o teste (a sessão do app abre uma issue e a resposta tem de chegar no seu Telegram)."
