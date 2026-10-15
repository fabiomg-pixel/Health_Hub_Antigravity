#!/bin/zsh
# Recalcula só a Campanha (jornada.py) e publica o painel. Use depois de confirmar uma estalagem ou de
# escrever uma crônica no livro (historia/livro/). Não faz os pulls do relógio e da balança.
set -u
cd "$(dirname "$0")"
python3 jornada.py
cd painel
npx vercel deploy --prod --yes > /dev/null 2>&1
npx vercel deploy --prod --yes 2>&1 | grep -i aliased || echo "⚠️ deploy sem alias — confira à mão"
