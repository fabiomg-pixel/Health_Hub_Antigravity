#!/bin/bash
# Passagem entre sessões do health-hub. Roda como gancho UserPromptSubmit (.claude/settings.json):
# o que sair daqui entra no contexto de TODA sessão deste projeto (app, bot do Telegram, tarefas agendadas).
# Só lê (git log/status, decisoes.md); nunca grava nem publica nada.
cd "$(dirname "$0")" || exit 0
export GIT_OPTIONAL_LOCKS=0
IN=""; [ -t 0 ] || IN=$(cat 2>/dev/null)
L=decisoes.md
echo "=== PASSAGEM ENTRE SESSÕES (health-hub): leia antes de recomendar, decidir ou comprar ==="
echo "Agora: $(date '+%d/%m %H:%M'). Este resumo é do disco, não da sua memória: se divergir do que você lembra, vale o disco."
case "$IN" in *plugin:telegram*)
  echo "!!! ESTA MENSAGEM VEIO DO TELEGRAM. O Fabio SÓ recebe o que você enviar pela ferramenta mcp__plugin_telegram_telegram__reply (chat_id da tag <channel>)."
  echo "!!! Texto escrito no terminal NUNCA chega a ele. Se a ferramenta não estiver na sua lista, carregue-a ANTES de responder:"
  echo "!!! ToolSearch com query: select:mcp__plugin_telegram_telegram__reply,mcp__plugin_telegram_telegram__react,mcp__plugin_telegram_telegram__edit_message,mcp__plugin_telegram_telegram__download_attachment"
  echo "!!! (O fim do seu turno é bloqueado se não houver um reply depois desta mensagem.)";;
esac
# Alarme de análise automática parada: a avaliação de fim de dia escreve o diario_execucao.json todo dia.
# Se ele não muda há 36 h ou mais, a análise diária (brief das 8h, avaliação da noite) provavelmente parou.
DI=diario_execucao.json
if [ -f "$DI" ]; then
  H=$(( ( $(date +%s) - $(stat -f %m "$DI") ) / 3600 ))
  [ "$H" -ge 36 ] && echo "!!! ALERTA: a análise automática diária parece parada: o diario_execucao.json não é atualizado há ${H} h (última vez: $(stat -f '%Sm' -t '%d/%m %H:%M' "$DI")). Registros feitos desde então podem não ter sido lidos por ninguém. Diga isso ao Fabio."
fi
# O que o bot enviou por último (brief das 8h, avaliação da noite): o Fabio responde A ISSO pelo Telegram.
UE=ultimo_envio.md
if [ -f "$UE" ]; then
  HE=$(( ( $(date +%s) - $(stat -f %m "$UE") ) / 3600 ))
  if [ "$HE" -lt 48 ]; then
    echo "--- Última mensagem que o bot enviou ao Fabio (há ${HE} h). Se ele responder pelo Telegram, é sobre isto:"
    head -16 "$UE" | cut -c1-220
  fi
fi
echo "--- Regras vigentes (decisoes.md)"
[ -f "$L" ] && awk '/^## Regras vigentes/{f=1;next} /^## /{f=0} f&&NF' "$L" || echo "(decisoes.md não encontrado)"
echo "--- Últimas decisões registradas"
[ -f "$L" ] && awk '/^## Registro/{f=1;next} /^## /{f=0} f&&NF' "$L" | tail -6
echo "--- Commits das últimas 36 h (inclui as outras sessões)"
git log --since="36 hours ago" --format='%h %ad %s' --date=format:'%d/%m %H:%M' 2>/dev/null | cut -c1-130 | head -10
D=$(git status --short 2>/dev/null | head -6)
[ -n "$D" ] && { echo "--- Alterações ainda não commitadas (outra sessão pode estar no meio)"; echo "$D"; }
echo "--- Ao decidir ou ouvir uma decisão: ./registrar_decisao.sh <origem> \"<decisão>\" \"<onde vive>\" e commite junto."
