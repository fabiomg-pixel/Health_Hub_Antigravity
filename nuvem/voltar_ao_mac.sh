#!/usr/bin/env bash
# Desfaz o corte: o Telegram volta a entregar ao bot do Mac (getUpdates) e a sessão do Mac sobe com o canal.
set -euo pipefail
B="$HOME/.claude/channels/telegram-saude"
TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$B/.env" | head -1 | cut -d= -f2- | tr -d "\"' ")
printf 'url = "https://api.telegram.org/bot%s/deleteWebhook"\n' "$TOKEN" | curl -s -m 20 -K - | python3 -c "import json,sys;d=json.load(sys.stdin);print('webhook removido:', d.get('ok'))"
rm -f "$B/SEM_CANAL"
/usr/bin/screen -S saude -X quit 2>/dev/null || true
echo "Feito. Em 30 s o bot do Mac volta a ouvir o Telegram."
