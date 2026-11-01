#!/bin/zsh
# Liga o copiloto de saúde (health-hub) no Telegram, com bot próprio.
# Aberto pelo Terminal no login (LaunchAgent com.fabiogomes.telegram-saude). O Terminal é quem tem
# permissão de acesso a ~/Documents; o launchd sozinho não consegue abrir a pasta health-hub.
# A sessão fica num screen destacado: ver com `screen -r saude`; sair sem fechar com Ctrl-A depois D.
# Se o Claude cair, o laço religa em 30 s.
H="$HOME/Documents/Claude/health-hub"
# Despachos da Campanha (29/10): laço de 15 min que manda cada marco ao Telegram (screen -r despachos).
if ! screen -ls 2>/dev/null | grep -q '\.despachos[[:space:]]'; then
  screen -dmS despachos zsh -c "cd '$H' && ./laco_despachos.sh"
fi
if screen -ls 2>/dev/null | grep -q '\.saude[[:space:]]'; then
  echo "O copiloto de saúde já está rodando (screen -r saude)."; exit 0
fi
screen -dmS saude zsh -c "cd '$H' && while true; do ./iniciar_telegram_saude.sh; sleep 30; done"
echo "Copiloto de saúde ligado em segundo plano (screen -r saude). Pode fechar esta janela."
