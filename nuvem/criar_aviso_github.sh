#!/usr/bin/env bash
# Cria (uma vez) o aviso do GitHub para a Vercel: quando a nuvem comenta na issue, a Vercel repassa ao Telegram.
# Usa o segredo já guardado em ~/.claude/channels/telegram-saude/github_webhook_secret; nada aparece na tela.
set -euo pipefail
SEG=$(cat "$HOME/.claude/channels/telegram-saude/github_webhook_secret")
if gh api repos/fabiomg-pixel/health-hub/hooks --jq '.[].config.url' | grep -q '/api/github$'; then echo "já existia"; exit 0; fi
printf '{"name":"web","active":true,"events":["issue_comment"],"config":{"url":"https://painel-xi-three.vercel.app/api/github","content_type":"json","secret":"%s"}}' "$SEG" \
  | gh api repos/fabiomg-pixel/health-hub/hooks --input - > /dev/null && echo "aviso do GitHub para a Vercel: criado"
