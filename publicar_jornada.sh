#!/bin/zsh
# Recalcula só a Campanha (jornada.py) e publica o painel. Use depois de confirmar uma estalagem ou de
# escrever uma crônica no livro (historia/livro/). Não faz os pulls do relógio e da balança.
set -u
cd "$(dirname "$0")"
python3 jornada.py
python3 historia.py || echo "⚠️ historia.py falhou: a aventura fica como estava"
python3 jornada.py > /dev/null   # segunda passada: o livro passa a incluir os capítulos que o historia.py acabou de escrever
cd painel
npx vercel deploy --prod --yes > /dev/null 2>&1
npx vercel deploy --prod --yes 2>&1 | grep -i aliased || echo "⚠️ deploy sem alias — confira à mão"
