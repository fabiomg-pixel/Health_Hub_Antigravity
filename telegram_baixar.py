#!/usr/bin/env python3
"""Baixa um arquivo do Telegram (foto, áudio, documento) pelo file_id, para a rotina da nuvem ler (01/11/2026).

Uso: ./telegram_baixar.py <file_id> [nome]   → imprime o caminho salvo em inbox/
O token vem de TELEGRAM_BOT_TOKEN (nuvem) ou do .env do bot (Mac), pelo mesmo leitor do enviar_telegram_saude.py.
A URL com o token vai ao curl pelo stdin, nunca na linha de comando nem na saída."""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import enviar_telegram_saude as envio
AQUI = envio.AQUI

if len(sys.argv) < 2: sys.exit(__doc__)
fid = sys.argv[1]
r = envio.api('getFile?file_id=' + fid)
if not r.get('ok'): sys.exit('ERRO: getFile recusado: ' + str(r.get('description')))
caminho = r['result']['file_path']
destino_dir = os.path.join(AQUI, 'inbox'); os.makedirs(destino_dir, exist_ok=True)
nome = sys.argv[2] if len(sys.argv) > 2 else fid[-24:] + os.path.splitext(caminho)[1]
destino = os.path.join(destino_dir, os.path.basename(nome))
cfg = 'url = "https://api.telegram.org/file/bot%s/%s"\n' % (envio.token(), caminho)
p = subprocess.run(['curl', '-s', '-m', '60', '-K', '-', '-o', destino], input=cfg, capture_output=True, text=True)
if p.returncode or not os.path.getsize(destino): sys.exit('ERRO: download falhou')
print(destino)
