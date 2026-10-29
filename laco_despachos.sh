#!/bin/zsh
# Laço dos despachos da Campanha (despachos.py), a cada 15 min. Roda num screen próprio ("despachos"), ligado pelo
# iniciar_saude.command junto com o bot: precisa do Terminal, que tem acesso a ~/Documents (o launchd não tem).
# Ver: screen -r despachos (sair sem fechar: Ctrl-A, depois D). Log: despachos.log (fora do git).
cd "$(dirname "$0")"
while true; do
  { date '+%F %T'; python3 despachos.py 2>&1; } >> despachos.log
  tail -n 400 despachos.log > despachos.log.tmp && mv despachos.log.tmp despachos.log
  sleep 900
done
