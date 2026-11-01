#!/bin/bash
# Digita uma rotina diária DENTRO da sessão do bot (screen "saude"), como se fosse um prompt.
# Uso: disparar_rotina.sh brief|avaliacao|conselho|conselho_fechar|capitulo [--forcar|--simular|--verificar]
# conselho (dom 10h03) e conselho_fechar (dom 21h03): a entrevista do conselho de domingo (PROJETO_CHAT §28).
# Instalado em ~/.claude/channels/telegram-saude/ (fora de ~/Documents: o launchd não acessa Documents sem
# permissão especial). Chamado pelos LaunchAgents br.fabiogomes.saude.brief (8h03) e .avaliacao (22h33): o
# launchd roda a tarefa perdida quando o Mac acorda. Não envia nada ao Fabio: quem envia é o bot, no roteiro.
R="$1"; OPC="$2"
BASE="$HOME/.claude/channels/telegram-saude"; LOG="$BASE/disparos.log"
case "$R" in
  brief)     ARQ="rotinas/brief_matinal.md" ;;
  avaliacao) ARQ="rotinas/avaliacao_noite.md" ;;
  conselho)  ARQ="rotinas/conselho_entrevista.md (abrir, passo 0)" ;;
  conselho_fechar) ARQ="rotinas/conselho_entrevista.md (fechar, passo 5)" ;;
  capitulo)  ARQ="rotinas/capitulo_semana.md" ;;
  *) echo "uso: $0 brief|avaliacao|conselho|conselho_fechar|capitulo [--forcar|--simular|--verificar]"; exit 2 ;;
esac
export SCREENDIR="${SCREENDIR:-$(ls -d /var/folders/*/*/T/.screen 2>/dev/null | head -1)}"
HOJE=$(date +%F); AGORA=$(date '+%F %T')
# --verificar: roda ~45 min depois do disparo. Se a rotina não enviou nada (ex.: o Mac sem rede, como em
# 15 e 16/10), digita de novo, UMA vez, e só até 4 h depois do disparo (para não mandar brief de manhã à noite).
if [ "$OPC" = "--verificar" ]; then
  UE="$BASE/envio_${R%_fechar}.stamp"   # carimbo escrito pelo enviar_telegram_saude.py, fora de ~/Documents (o launchd não lê Documents)
  DISP=$(grep "^$HOJE $R .* disparado" "$LOG" 2>/dev/null | tail -1 | awk '{print $3}')
  if [ -z "$DISP" ]; then OPC=""   # nada disparado hoje (Mac acordou agora): faz o disparo normal
  else
    T_DISP=$(date -j -f "%Y-%m-%d %H:%M:%S" "$HOJE $DISP" +%s)
    T_ENV=$(stat -f %m "$UE" 2>/dev/null || echo 0)
    if [ "$T_ENV" -gt "$T_DISP" ]; then echo "$AGORA $R confirmado: enviado" >> "$LOG"; exit 0; fi
    if grep -q "^$HOJE $R .* reenviado" "$LOG"; then echo "$AGORA $R sem envio mesmo depois de reenviar" >> "$LOG"; exit 0; fi
    if [ $(( $(date +%s) - T_DISP )) -gt 14400 ]; then echo "$AGORA $R perdido: passou da janela de 4 h" >> "$LOG"; exit 0; fi
    OPC="--reenvio"
  fi
fi
if [ "$OPC" != "--forcar" ] && [ "$OPC" != "--simular" ] && [ "$OPC" != "--reenvio" ] && grep -q "^$HOJE $R " "$LOG" 2>/dev/null; then
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
[ "$OPC" = "--reenvio" ] && echo "$HOJE $R $(date +%T) reenviado" >> "$LOG" || echo "$HOJE $R $(date +%T) disparado" >> "$LOG"
echo "disparado: $R"
