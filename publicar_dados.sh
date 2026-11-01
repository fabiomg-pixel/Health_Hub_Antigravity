#!/bin/zsh
# Atualiza os DADOS do painel (fatos + evolução) e publica. Não toca no plano da semana.
#
#   ./publicar_dados.sh
#
# Existe porque a aba 📈 Evolução só é útil se andar todo dia, e o brief da manhã
# até hoje rodava os pulls sem publicar nada.
set -u
cd "$(dirname "$0")"
./atualizar_dados.sh 7 || echo "⚠️ publicando com os dados antigos da fonte que falhou (veja acima)"
python3 dashboard.py
python3 jornada.py || echo "⚠️ jornada.py falhou: a Campanha fica com o cálculo anterior"
python3 historia.py || echo "⚠️ historia.py falhou: a aventura fica como estava"
python3 jornada.py > /dev/null   # segunda passada: o livro passa a incluir os capítulos que o historia.py acabou de escrever
cd painel
# A primeira chamada às vezes só gera preview; a segunda garante o alias de produção.
npx vercel deploy --prod --yes > /dev/null 2>&1
npx vercel deploy --prod --yes 2>&1 | grep -i aliased || { echo "⚠️ deploy sem alias — confira à mão"; date '+%F %T deploy sem alias' > ../.ultima_falha_deploy; }
