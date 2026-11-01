#!/usr/bin/env bash
# Modo Nuvem, passo final (você roda, quando o teste der certo): a conversa passa para a nuvem.
# 1) a sessão do Mac sobe SEM o canal do Telegram (continua rodando brief, avaliação, conselho e capítulo);
# 2) o Telegram passa a entregar as mensagens na Vercel (setWebhook com o segredo), que acorda a rotina da nuvem.
# Para voltar: nuvem/voltar_ao_mac.sh. Nenhum valor aparece na tela.
set -euo pipefail
B="$HOME/.claude/channels/telegram-saude"
TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$B/.env" | head -1 | cut -d= -f2- | tr -d "\"' ")
SEGREDO=$(cat "$B/webhook_secret")
touch "$B/SEM_CANAL"
/usr/bin/screen -S saude -X quit 2>/dev/null || true   # o laço religa a sessão em 30 s, já sem o canal
printf 'url = "https://api.telegram.org/bot%s/setWebhook"\n' "$TOKEN" | curl -s -m 20 -K - \
  --data-urlencode "url=https://painel-xi-three.vercel.app/api/telegram" --data-urlencode "secret_token=$SEGREDO" \
  --data-urlencode 'allowed_updates=["message","edited_message"]' | python3 -c "import json,sys;d=json.load(sys.stdin);print('webhook:', 'ok' if d.get('ok') else d.get('description'))"
echo "Feito. Mande uma mensagem ao bot: a resposta vem da nuvem (um a dois minutos)."
