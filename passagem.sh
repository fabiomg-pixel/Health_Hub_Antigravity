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
# mtime em segundos: GNU (Linux, nuvem) primeiro, BSD (macOS) como reserva
mtime() { stat -c %Y "$1" 2>/dev/null || stat -f %m "$1"; }
DI=diario_execucao.json
if [ -f "$DI" ]; then
  H=$(( ( $(date +%s) - $(mtime "$DI") ) / 3600 ))
  [ "$H" -ge 36 ] && echo "!!! ALERTA: a análise automática diária parece parada: o diario_execucao.json não é atualizado há ${H} h (última vez: $(stat -f '%Sm' -t '%d/%m %H:%M' "$DI")). Registros feitos desde então podem não ter sido lidos por ninguém. Diga isso ao Fabio."
fi
# O que o bot enviou por último (brief das 8h, avaliação da noite): o Fabio responde A ISSO pelo Telegram.
UE=ultimo_envio.md
if [ -f "$UE" ]; then
  HE=$(( ( $(date +%s) - $(mtime "$UE") ) / 3600 ))
  if [ "$HE" -lt 48 ]; then
    echo "--- Última mensagem que o bot enviou ao Fabio (há ${HE} h). Se ele responder pelo Telegram, é sobre isto:"
    head -16 "$UE" | cut -c1-220
  fi
fi
# Último despacho da Campanha (despachos.py): se ele responder a uma cena, é a isto.
UD=ultimo_despacho.md
if [ -f "$UD" ] && [ $(( ( $(date +%s) - $(mtime "$UD") ) / 3600 )) -lt 12 ]; then
  echo "--- Último despacho da Campanha que o bot enviou (pode ser a isto que ele responde):"
  head -12 "$UD" | cut -c1-220
fi
# Entrevista do conselho de domingo em andamento (rotinas/conselho_entrevista.md): a resposta dele é para ela.
EC=$(ls -d conselho/20*/ 2>/dev/null | sort | tail -1)
if [ -n "$EC" ] && [ -f "${EC}estado.json" ]; then
  python3 - "${EC}" <<'PY' 2>/dev/null
import json, sys
d = sys.argv[1]; e = json.load(open(d + 'estado.json'))
if e.get('fase') != 'publicado':
    print('!!! ENTREVISTA DO CONSELHO EM ANDAMENTO (%s): especialista atual %s, fase %s, rodada %s; concluídos: %s.'
          % (d, e.get('atual'), e.get('fase'), e.get('rodada'), ', '.join(e.get('concluidos') or []) or 'nenhum'))
    if e.get('fase') == 'aguardando':
        print('!!! A próxima mensagem do Fabio provavelmente RESPONDE às perguntas abertas em %s%s.md. Siga rotinas/conselho_entrevista.md, passo 2.' % (d, e.get('atual')))
PY
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
