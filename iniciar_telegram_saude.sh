#!/bin/zsh
# Sessão dedicada do copiloto de saúde (health-hub), com BOT PRÓPRIO no Telegram.
# Estado e token do bot: ~/.claude/channels/telegram-saude (token em .env, chmod 600).
# Mantida ligada pelo launchd (~/Library/LaunchAgents/com.fabiogomes.telegram-saude.plist),
# dentro de um screen: ver com `screen -r saude`; sair sem fechar com Ctrl-A depois D.
cd "$(dirname "$0")"
export TELEGRAM_STATE_DIR="$HOME/.claude/channels/telegram-saude"
# Token de longa duração (1 ano), gerado pelo Fabio com `claude setup-token` em 26/10/2026 e salvo por ele em
# oauth_token (chmod 600). Se existir, a sessão do bot não depende do login que expira. Nunca imprimir o conteúdo.
if [ -s "$TELEGRAM_STATE_DIR/oauth_token" ]; then
  export CLAUDE_CODE_OAUTH_TOKEN="$(tr -d '[:space:]' < "$TELEGRAM_STATE_DIR/oauth_token")"
fi
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
# Modo Nuvem (01/11): com o arquivo SEM_CANAL, quem conversa é a nuvem (webhook). A sessão do Mac sobe sem o canal do
# Telegram e só executa as rotinas digitadas pelo launchd (brief, avaliação, conselho, capítulo), que enviam pela API.
CANAL=(--channels plugin:telegram@claude-plugins-official)
[ -f "$TELEGRAM_STATE_DIR/SEM_CANAL" ] && CANAL=()
if [ -s "$APOIO" ]; then
  exec "$CLAUDE" --model sonnet --append-system-prompt-file "$APOIO" "${CANAL[@]}" "$@"
fi
exec "$CLAUDE" --model sonnet "${CANAL[@]}" "$@"
