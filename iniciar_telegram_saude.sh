#!/bin/zsh
# Sessão dedicada do copiloto de saúde (health-hub), com BOT PRÓPRIO no Telegram.
# Estado e token do bot: ~/.claude/channels/telegram-saude (token em .env, chmod 600).
# Mantida ligada pelo launchd (~/Library/LaunchAgents/com.fabiogomes.telegram-saude.plist),
# dentro de um screen: ver com `screen -r saude`; sair sem fechar com Ctrl-A depois D.
cd "$(dirname "$0")"
export TELEGRAM_STATE_DIR="$HOME/.claude/channels/telegram-saude"
CLAUDE=$(ls -d "$HOME/Library/Application Support/Claude/claude-code/"*/claude.app/Contents/MacOS/claude 2>/dev/null | sort -V | tail -1)
[ -x "$CLAUDE" ] || CLAUDE=$(command -v claude)
exec "$CLAUDE" --model sonnet --channels plugin:telegram@claude-plugins-official "$@"
