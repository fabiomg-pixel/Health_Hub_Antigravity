#!/bin/zsh
# Atualiza os DADOS do painel (fatos + evolução) e publica. Não toca no plano da semana.
#
#   ./publicar_dados.sh
#
# Existe porque a aba 📈 Evolução só é útil se andar todo dia, e o brief da manhã
# até hoje rodava os pulls sem publicar nada.
set -u
cd "$(dirname "$0")"
python3 garmin_pull.py --days 7 > garmin_out.json 2>/dev/null
python3 renpho_pull.py --days 30 > renpho_out.json 2>/dev/null
python3 synthesize.py > /dev/null 2>&1
python3 fatos.py > fatos.json 2>/dev/null
python3 dashboard.py
cd painel
# A primeira chamada às vezes só gera preview; a segunda garante o alias de produção.
npx vercel deploy --prod --yes > /dev/null 2>&1
npx vercel deploy --prod --yes 2>&1 | grep -i aliased || echo "⚠️ deploy sem alias — confira à mão"
