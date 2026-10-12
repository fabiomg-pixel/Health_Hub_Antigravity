#!/bin/bash
# Uso: ./registrar_decisao.sh <origem: app|bot|conselho|agendada> "<decisão, com quem decidiu>" "<onde vive: arquivo/commit>"
# Acrescenta uma linha ao Registro de decisoes.md. Não commita: commite junto com a mudança que a decisão causou.
cd "$(dirname "$0")" || exit 1
[ $# -ge 3 ] || { echo "uso: $0 <origem> \"<decisão>\" \"<onde vive>\""; exit 1; }
echo "- $(date +%F) | $1 | $2 | $3" >> decisoes.md
echo "registrado em decisoes.md; commite com a mudança."
