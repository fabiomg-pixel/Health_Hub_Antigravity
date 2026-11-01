#!/bin/zsh
# Backup diário do repositório (git bundle) FORA da pasta do projeto (31/10/2026: o git não tem remoto e o histórico do
# Garmin, o estado da Campanha e os despachos existiam só neste disco). Guarda 14 dias. NUNCA inclui .env nem tokens
# (não são versionados). Para copiar também para outro disco ou nuvem PRÓPRIA (não a pasta compartilhada do laboratório),
# defina BACKUP_DIR. Chamado pelo laço dos despachos; seguro para rodar várias vezes (1 por dia).
cd "$(dirname "$0")"
DEST="${BACKUP_DIR:-$HOME/Backups/health-hub}"
mkdir -p "$DEST" || exit 1
ARQ="$DEST/health-hub-$(date +%F).bundle"
[ -f "$ARQ" ] && exit 0
git bundle create "$ARQ.tmp" --all > /dev/null 2>&1 && mv "$ARQ.tmp" "$ARQ" && echo "$(date '+%F %T') backup ok: $ARQ ($(du -h "$ARQ" | cut -f1))" || { rm -f "$ARQ.tmp"; echo "$(date '+%F %T') ⚠️ backup falhou"; exit 1; }
ls -1t "$DEST"/health-hub-*.bundle 2>/dev/null | tail -n +15 | while read f; do rm -f "$f"; done
