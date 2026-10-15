#!/bin/bash
# Digita uma rotina diária DENTRO da sessão do bot (screen "saude"), como se fosse um prompt.
# Uso: disparar_rotina.sh brief|avaliacao [--forcar|--simular]
# Instalado em ~/.claude/channels/telegram-saude/ (fora de ~/Documents: o launchd não acessa Documents sem
# permissão especial). Chamado pelos LaunchAgents br.fabiogomes.saude.brief (8h03) e .avaliacao (22h33): o
# launchd roda a tarefa perdida quando o Mac acorda. Não envia nada ao Fabio: quem envia é o bot, no roteiro.
R="$1"; OPC="$2"
BASE="$HOME/.claude/channels/telegram-saude"; LOG="$BASE/disparos.log"
case "$R" in
  brief)     ARQ="rotinas/brief_matinal.md" ;;
  avaliacao) ARQ="rotinas/avaliacao_noite.md" ;;
  *) echo "uso: $0 brief|avaliacao [--forcar|--simular]"; exit 2 ;;
esac
export SCREENDIR="${SCREENDIR:-$(ls -d /var/folders/*/*/T/.screen 2>/dev/null | head -1)}"
HOJE=$(date +%F); AGORA=$(date '+%F %T')
if [ "$OPC" != "--forcar" ] && [ "$OPC" != "--simular" ] && grep -q "^$HOJE $R " "$LOG" 2>/dev/null; then
  echo "$AGORA $R ignorado: ja disparado hoje" >> "$LOG"; exit 0
fi
if ! /usr/bin/screen -ls 2>/dev/null | grep -q '\.saude'; then
  echo "$AGORA $R FALHA: sessao screen 'saude' nao esta de pe" >> "$LOG"; echo "FALHA: sessao saude ausente"; exit 1
fi
# ATENCAO: sem "-p 0" o screen nao entrega a digitacao a sessao (testado em 15/10).
# O screen do macOS descarta, sem avisar, "stuff" acima de ~250 caracteres: o gatilho tem de ser curto.
# O roteiro em si explica o resto (quem roda, o que fazer).
MSG="ROTINA DIARIA do agendador (nao veio do Fabio): execute em silencio o roteiro $ARQ"
if [ "$OPC" = "--simular" ]; then echo "SIMULACAO (nada digitado): $MSG"; exit 0; fi
/usr/bin/screen -S saude -p 0 -X stuff "$MSG"
sleep 2
/usr/bin/screen -S saude -p 0 -X stuff $'\r'
echo "$HOJE $R $(date +%T) disparado" >> "$LOG"
echo "disparado: $R"
