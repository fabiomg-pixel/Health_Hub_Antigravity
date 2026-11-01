#!/usr/bin/env bash
# Sincronia Mac ↔ nuvem (01/11/2026). A conversa mora na nuvem e as rotinas do dia no Mac: os dois só se enxergam
# pelo GitHub. Chamado em segundo plano pelo enviar_telegram_saude.py depois de cada envio do Mac (para a nuvem saber
# a que o Fabio está respondendo, ex.: perguntas do conselho) e pelo laco_despachos.sh a cada 15 min.
# Uso: nuvem/sincronizar.sh <motivo> [--publicar]   (--publicar: se a nuvem mudou o painel, publica na Vercel)
# Só roda no Mac. Log: nuvem/sincronizar.log (fora do git).
[ "$(uname)" = Darwin ] || exit 0
cd "$(dirname "$0")/.." || exit 1
LOG=nuvem/sincronizar.log; TRAVA=.git/sincronizar.trava
mkdir "$TRAVA" 2>/dev/null || { [ -n "$(find "$TRAVA" -mmin +5 2>/dev/null)" ] && rmdir "$TRAVA" && mkdir "$TRAVA"; } || exit 0
trap 'rmdir "$TRAVA" 2>/dev/null' EXIT
{
  echo "$(date '+%F %T') $1"
  git add ultimo_envio.md ultimo_despacho.md 2>/dev/null
  git diff --cached --quiet -- ultimo_envio.md ultimo_despacho.md || git commit -q -m "último envio do bot ($1)" -- ultimo_envio.md ultimo_despacho.md
  ANTES=$(git rev-parse HEAD)
  if ! git pull -q --rebase --autostash origin main; then
    git rebase --abort 2>/dev/null; echo "  ⚠️ pull falhou (conflito?): confira à mão"; exit 1
  fi
  git push -q origin HEAD:main || echo "  ⚠️ push falhou"
  if [ "$2" = "--publicar" ] && ! git diff --quiet "$ANTES" HEAD -- painel; then
    echo "  a nuvem mudou o painel: publicando"
    (cd painel && npx vercel deploy --prod --yes 2>&1 | grep -i aliased) || echo "  ⚠️ deploy sem alias"
  fi
} >> "$LOG" 2>&1
tail -n 300 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
