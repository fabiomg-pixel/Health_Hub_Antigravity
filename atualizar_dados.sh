#!/bin/zsh
# Puxa Garmin e Renpho, consolida e confere (31/10/2026). Existe porque o publicar_dados.sh jogava os erros no lixo e
# truncava o fatos.json antes de refazê-lo, e porque o fechamento de domingo usava os dados da manhã.
#   ./atualizar_dados.sh [dias]      saída 0 = tudo certo; 1 = alguma fonte falhou (diz qual); o fatos.json antigo é preservado
set -u
cd "$(dirname "$0")"
DIAS=${1:-7}; FALHAS=()
python3 garmin_pull.py --days $DIAS > garmin_out.json.novo 2> garmin_pull.err && mv garmin_out.json.novo garmin_out.json || { FALHAS+=("Garmin: $(tail -1 garmin_pull.err | cut -c1-140)"); [ -s garmin_out.json.novo ] && mv garmin_out.json.novo garmin_out.json.falhou; }
python3 renpho_pull.py --days 30 > renpho_out.json.novo 2> renpho_pull.err && mv renpho_out.json.novo renpho_out.json || { FALHAS+=("Renpho: $(tail -1 renpho_pull.err | cut -c1-140)"); [ -s renpho_out.json.novo ] && rm -f renpho_out.json.novo; }
python3 synthesize.py > /dev/null 2> synthesize.err || FALHAS+=("synthesize: $(tail -1 synthesize.err | cut -c1-140)")
python3 fatos.py > fatos.json.novo 2> fatos.err && python3 -c "import json;json.load(open('fatos.json.novo'))" 2>/dev/null && mv fatos.json.novo fatos.json || { FALHAS+=("fatos.py: $(tail -1 fatos.err | cut -c1-140)"); rm -f fatos.json.novo; }
rm -f garmin_pull.err renpho_pull.err synthesize.err fatos.err garmin_out.json.novo renpho_out.json.novo
if [ ${#FALHAS[@]} -gt 0 ]; then
  echo "⚠️ ATUALIZAÇÃO INCOMPLETA (os arquivos antigos foram mantidos):"; printf '  - %s\n' "${FALHAS[@]}"
  date '+%F %T' > .ultima_falha_dados; printf '%s\n' "${FALHAS[@]}" >> .ultima_falha_dados
  exit 1
fi
rm -f .ultima_falha_dados; echo "dados atualizados ($(date '+%d/%m %H:%M'))"
