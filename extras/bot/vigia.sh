#!/bin/bash
# Vigia (31/10/2026): roda a cada 10 min pelo launchd, FORA de ~/Documents (o launchd não lê Documents). Confere:
# o screen do bot e do laço de despachos, o sinal de vida do laço (heartbeat) e se o brief da manhã foi enviado.
# Avisa por notificação do macOS e pelo Telegram (no máximo 1 aviso do mesmo problema a cada 6 h) e tenta religar.
# Instalado em ~/.claude/channels/telegram-saude/vigia.sh (cópia em extras/bot/ no repositório).
BASE="$HOME/.claude/channels/telegram-saude"; ESTADO="$BASE/vigia_estado"; touch "$ESTADO"
export SCREENDIR="${SCREENDIR:-$(ls -d /var/folders/*/*/T/.screen 2>/dev/null | head -1)}"
AGORA=$(date +%s); HORA=$(date +%H); HOJE=$(date +%F)
TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$BASE/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"' ')
CHAT=$(/usr/bin/python3 -c "import json,sys;print((json.load(open('$BASE/access.json')).get('allowFrom') or [''])[0])" 2>/dev/null)
avisa() {   # $1 = chave do problema, $2 = texto
  [ -n "$VIGIA_SECO" ] && { echo "[seco] $1: $2"; return; }   # VIGIA_SECO=1 ./vigia.sh: só mostra, não avisa nem religa
  local ult; ult=$(grep "^$1 " "$ESTADO" | tail -1 | cut -d' ' -f2); [ -n "$ult" ] && [ $((AGORA - ult)) -lt 21600 ] && return
  grep -v "^$1 " "$ESTADO" > "$ESTADO.n"; echo "$1 $AGORA" >> "$ESTADO.n"; mv "$ESTADO.n" "$ESTADO"
  /usr/bin/osascript -e "display notification \"$2\" with title \"Saúde: vigia\"" > /dev/null 2>&1
  if [ -n "$TOKEN" ] && [ -n "$CHAT" ]; then
    printf 'url = "https://api.telegram.org/bot%s/sendMessage"\n' "$TOKEN" | /usr/bin/curl -s -m 20 -K - --data-urlencode "chat_id=$CHAT" --data-urlencode "text=Aviso do vigia: $2" > /dev/null 2>&1
  fi
}
religa() { [ -n "$VIGIA_SECO" ] && return; /usr/bin/open -g -a Terminal "$BASE/iniciar_saude.command" > /dev/null 2>&1; }
SCR=$(/usr/bin/screen -ls 2>/dev/null)
if ! echo "$SCR" | grep -q '\.saude[[:space:]]'; then avisa saude "o bot (screen saude) está fora do ar; tentei religar. Brief e avaliação não rodam sem ele."; religa; fi
# Se o Mac dormiu (a última execução do vigia foi há mais de 25 min), o laço também dormiu: não é falha, é noite. Só alerta de sinal de vida parado
# quando o próprio vigia rodou direto até agora (a máquina estava acordada).
ULT=$(cat "$BASE/vigia_ultima" 2>/dev/null || echo 0); echo "$AGORA" > "$BASE/vigia_ultima"
DORMIU=0; [ $((AGORA - ULT)) -gt 1500 ] && DORMIU=1
HB=$(cat "$BASE/heartbeat_despachos" 2>/dev/null || echo 0)
if ! echo "$SCR" | grep -q '\.despachos[[:space:]]' || { [ $((AGORA - HB)) -gt 2400 ] && [ "$DORMIU" = 0 ]; }; then
  [ "$HORA" -ge 7 ] && [ "$HORA" -lt 23 ] && { avisa despachos "o laço dos despachos da Campanha parou (sem sinal há mais de 40 min); tentei religar. Cartas e marcos esperam."; religa; }
fi
if [ "$HORA" -ge 10 ] && [ "$HORA" -lt 22 ]; then
  # só confere depois que o primeiro carimbo existir (o carimbo é novo, de 31/10; antes dele não há como saber)
  [ -f "$BASE/envio_brief.stamp" ] && { [ "$(date -r "$(stat -f %m "$BASE/envio_brief.stamp")" +%F)" = "$HOJE" ] || avisa brief "o brief da manhã de hoje não foi enviado (sem carimbo de envio). Veja o bot ou me chame."; }
fi
exit 0
