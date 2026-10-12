#!/bin/bash
# Passagem entre sessões do health-hub. Roda como gancho UserPromptSubmit (.claude/settings.json):
# o que sair daqui entra no contexto de TODA sessão deste projeto (app, bot do Telegram, tarefas agendadas).
# Só lê (git log/status, decisoes.md); nunca grava nem publica nada.
cd "$(dirname "$0")" || exit 0
export GIT_OPTIONAL_LOCKS=0
L=decisoes.md
echo "=== PASSAGEM ENTRE SESSÕES (health-hub): leia antes de recomendar, decidir ou comprar ==="
echo "Agora: $(date '+%d/%m %H:%M'). Este resumo é do disco, não da sua memória: se divergir do que você lembra, vale o disco."
echo "--- Regras vigentes (decisoes.md)"
[ -f "$L" ] && awk '/^## Regras vigentes/{f=1;next} /^## /{f=0} f&&NF' "$L" || echo "(decisoes.md não encontrado)"
echo "--- Últimas decisões registradas"
[ -f "$L" ] && awk '/^## Registro/{f=1;next} /^## /{f=0} f&&NF' "$L" | tail -6
echo "--- Commits das últimas 36 h (inclui as outras sessões)"
git log --since="36 hours ago" --format='%h %ad %s' --date=format:'%d/%m %H:%M' 2>/dev/null | cut -c1-130 | head -10
D=$(git status --short 2>/dev/null | head -6)
[ -n "$D" ] && { echo "--- Alterações ainda não commitadas (outra sessão pode estar no meio)"; echo "$D"; }
echo "--- Ao decidir ou ouvir uma decisão: ./registrar_decisao.sh <origem> \"<decisão>\" \"<onde vive>\" e commite junto."
