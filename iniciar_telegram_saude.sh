#!/bin/zsh
# Sessão dedicada do copiloto de saúde (health-hub), com BOT PRÓPRIO no Telegram.
# Estado e token do bot: ~/.claude/channels/telegram-saude (token em .env, chmod 600).
# Mantida ligada pelo launchd (~/Library/LaunchAgents/com.fabiogomes.telegram-saude.plist),
# dentro de um screen: ver com `screen -r saude`; sair sem fechar com Ctrl-A depois D.
cd "$(dirname "$0")"
export TELEGRAM_STATE_DIR="$HOME/.claude/channels/telegram-saude"
# Claude Code embutido no app (a pasta já mudou de formato entre versões); a instalação via npm é a reserva.
BASE="$HOME/Library/Application Support/Claude/claude-code"
setopt null_glob
CANDIDATOS=("$BASE"/*/claude.app/Contents/MacOS/claude "$BASE"/*/*/claude.app/Contents/MacOS/claude)
unsetopt null_glob
CLAUDE=""
(( ${#CANDIDATOS} )) && CLAUDE=$(print -l $CANDIDATOS | sort -V | tail -1)
[ -f "$CLAUDE" ] && [ -x "$CLAUDE" ] || CLAUDE=$(command -v claude)
# Arquivo de apoio: o essencial da conversa anterior (gerado de madrugada por secretario/apoio.py).
APOIO="$TELEGRAM_STATE_DIR/apoio.md"
if [ -s "$APOIO" ]; then
  exec "$CLAUDE" --model sonnet --append-system-prompt-file "$APOIO" --channels plugin:telegram@claude-plugins-official "$@"
fi
exec "$CLAUDE" --model sonnet --channels plugin:telegram@claude-plugins-official "$@"
