#!/usr/bin/env python3
"""Registra um acontecimento do dia no diário de bordo da aventura (historia/eventos_dia.json).

O efeito é aplicado pelo historia.py só na Hora do Balanço (fechamento da semana). Usado pela avaliação da noite.
  ./evento_aventura.py AAAA-MM-DD conquista "Dorn acendeu a forja e achou uma lasca de ferro-estrela." --efeito ferro=1
  ./evento_aventura.py AAAA-MM-DD juramento_quebrado "..." --efeito juramento=limite --efeito consequencia=trinca
  ./evento_aventura.py AAAA-MM-DD presente "..." --efeito reliquia=escama_rio_cinza
Tipos e efeitos válidos: ver o cabeçalho de historia/eventos_dia.json e rotinas/capitulo_semana.md."""
import argparse, datetime, json, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
ARQ = os.path.join(AQUI, 'historia', 'eventos_dia.json')
TIPOS = {'conquista', 'presente', 'percalco', 'juramento_quebrado', 'bencao', 'encontro', 'nevoa', 'aurora', 'neutro'}
INTEIROS = {'ferro', 'rumo', 'pena', 'divida'}
TEXTO = {'reliquia', 'juramento', 'consequencia', 'npc', 'fio'}
BOOL = {'abrigo'}

ap = argparse.ArgumentParser()
ap.add_argument('data'); ap.add_argument('tipo', choices=sorted(TIPOS)); ap.add_argument('texto')
ap.add_argument('--efeito', action='append', default=[], help='chave=valor; repita')
a = ap.parse_args()
datetime.date.fromisoformat(a.data)
mundo = json.load(open(os.path.join(AQUI, 'historia', 'mundo.json'), encoding='utf-8'))
ef = {}
for kv in a.efeito:
    k, _, v = kv.partition('=')
    if k in INTEIROS: ef[k] = int(v)
    elif k in BOOL: ef[k] = v.lower() in ('1', 'sim', 'true')
    elif k in TEXTO: ef[k] = v
    else: sys.exit(f'efeito desconhecido: {k}')
if ef.get('reliquia') and ef['reliquia'] not in mundo.get('reliquias', {}): sys.exit(f'relíquia fora do canon (historia/mundo.json): {ef["reliquia"]}')
if ef.get('juramento') and ef['juramento'] not in ('limite', 'sereias'): sys.exit('juramento: limite ou sereias')
if ef.get('consequencia') and ef['consequencia'] not in ('trinca', 'febre_do_orgulho', 'sal'): sys.exit('consequencia: trinca, febre_do_orgulho ou sal')
d = json.load(open(ARQ, encoding='utf-8'))
if any(e['data'] == a.data and e['texto'] == a.texto for e in d['eventos']): sys.exit('já registrado')
d['eventos'].append({'data': a.data, 'tipo': a.tipo, 'texto': a.texto.strip(), 'efeito': ef})
d['eventos'].sort(key=lambda e: e['data'])
json.dump(d, open(ARQ, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'diário de bordo: {a.data} {a.tipo} {ef or ""}')
