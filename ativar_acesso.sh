#!/bin/zsh
# Liga (ou troca) o código de acesso do painel. RODE VOCÊ MESMO, no Terminal, na pasta do health-hub:  ./ativar_acesso.sh
# O que faz: gera um código novo; grava em .env (PAINEL_KEY, para os scripts) e em acesso_painel.txt (para você);
# grava na Vercel (PAINEL_KEY, ambiente de produção) e publica o painel. O código NÃO é impresso na tela.
# Depois, no celular, abra o endereço que está em acesso_painel.txt (grava o código no aparelho uma única vez).
set -eu
cd "$(dirname "$0")"
COD=$(python3 -c "
import secrets
a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
print('-'.join(''.join(secrets.choice(a) for _ in range(5)) for _ in range(4)))")
touch .env; chmod 600 .env
grep -v '^PAINEL_KEY=' .env > .env.novo || true
printf '\n# Código de acesso ao painel (/api e /data). Mesmo valor na Vercel (PAINEL_KEY). Nunca imprimir.\nPAINEL_KEY=%s\n' "$COD" >> .env.novo
mv .env.novo .env; chmod 600 .env
printf 'CÓDIGO DE ACESSO DO PAINEL (só seu; não compartilhe)\n\n%s\n\nNo celular, abra este endereço UMA vez (grava o código no aparelho e some do endereço):\nhttps://painel-xi-three.vercel.app/#acesso=%s\n\nOu abra o painel e digite o código quando ele pedir.\nPara trocar: ./ativar_acesso.sh de novo (os outros aparelhos pedirão o código novo).\n' "$COD" "$COD" > acesso_painel.txt
chmod 600 acesso_painel.txt
( cd painel
  printf '%s' "$COD" | npx vercel env add PAINEL_KEY production --force > /dev/null
  npx vercel deploy --prod --yes > /dev/null 2>&1
  npx vercel deploy --prod --yes 2>&1 | grep -i aliased || echo "⚠️ deploy sem alias — confira à mão" )
echo "Pronto. Abra acesso_painel.txt para ver o código e o endereço do celular."
