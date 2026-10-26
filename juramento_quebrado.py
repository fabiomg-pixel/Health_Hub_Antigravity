#!/usr/bin/env python3
"""Registra um juramento quebrado (historia/juramentos.json). Na campanha entra só a data e o tipo; o que foi feito
nunca aparece na história. O preço é decidido pelo historia.py no fechamento da parte.
  ./juramento_quebrado.py AAAA-MM-DD limite   # portão ou teto da fisiologista desrespeitado (treino fora do plano, acima do teto, manhã vermelha)
  ./juramento_quebrado.py AAAA-MM-DD mesa     # fritura além de 2 na semana"""
import datetime, json, os, sys
if len(sys.argv) != 3 or sys.argv[2] not in ('limite', 'mesa'): sys.exit(__doc__)
datetime.date.fromisoformat(sys.argv[1])
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'historia', 'juramentos.json')
d = json.load(open(p, encoding='utf-8'))
if any(q['data'] == sys.argv[1] and q['tipo'] == sys.argv[2] for q in d['quebras']): sys.exit('já registrado')
d['quebras'].append({'data': sys.argv[1], 'tipo': sys.argv[2]}); d['quebras'].sort(key=lambda q: q['data'])
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'juramento quebrado registrado: {sys.argv[1]} ({sys.argv[2]})')
