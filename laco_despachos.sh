#!/bin/zsh
# Laço dos despachos da Campanha (despachos.py), a cada 15 min. Roda num screen próprio ("despachos"), ligado pelo
# iniciar_saude.command junto com o bot: precisa do Terminal, que tem acesso a ~/Documents (o launchd não tem).
# Ver: screen -r despachos (sair sem fechar: Ctrl-A, depois D). Log: despachos.log (fora do git).
# 31/10/2026: além dos despachos, o laço (a) escreve um sinal de vida para o vigia do launchd, (b) mantém o Mac acordado
# das 7h às 23h, (c) reanima o bot (screen "saude") se ele caiu e avisa, (d) faz o backup diário.
cd "$(dirname "$0")"
BASE="$HOME/.claude/channels/telegram-saude"
avisar() { printf '%s' "$1" | ./enviar_telegram_saude.py aviso > /dev/null 2>&1; }
while true; do
  date +%s > "$BASE/heartbeat_despachos" 2>/dev/null
  H=$(date +%H)
  # Acordado das 7h à 1h (02/11: no domingo o Mac dormiu às 23h32, no meio do capítulo das 23h05, e o conselho e a Parte II
  # só fecharam na segunda às 9h). A avaliação (22h33) e o capítulo (23h05) passam de meia-noite. Tampa fechada ainda dorme.
  if [ "$H" -ge 7 ] || [ "$H" -lt 1 ]; then /usr/bin/caffeinate -i -t 960 > /dev/null 2>&1 & fi
  { date '+%F %T'; python3 despachos.py 2>&1; } >> despachos.log
  if ! /usr/bin/screen -ls 2>/dev/null | grep -q '\.saude[[:space:]]'; then
    /usr/bin/screen -dmS saude zsh -c "cd '$PWD' && while true; do ./iniciar_telegram_saude.sh; sleep 30; done"
    echo "$(date '+%F %T') bot (screen saude) estava fora do ar; religado pelo laço" >> despachos.log
    avisar "Aviso do vigia: o bot estava fora do ar e eu o religuei às $(date +%H:%M). Se alguma rotina de hoje não chegou, ela roda de novo sozinha ou me chame."
  fi
  ./backup.sh >> despachos.log 2>&1
  /bin/bash nuvem/sincronizar.sh laco --publicar   # modo Nuvem: traz o que a nuvem gravou e publica o painel se mudou
  tail -n 400 despachos.log > despachos.log.tmp && mv despachos.log.tmp despachos.log
  sleep 900
done
