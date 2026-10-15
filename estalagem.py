#!/usr/bin/env python3
"""Registra um dia de ESTALAGEM (descanso que conta como cumprido na Campanha) DEPOIS do sim do Fabio.

Uso: ./estalagem.py AAAA-MM-DD "motivo (ex.: resfriado, índice vermelho, viagem)"
Só o Fabio confirma. O Silvester propõe pelo Telegram e roda isto quando ele disser sim; depois,
./publicar_jornada.sh e commit de jornada_eventos.json.
"""
import datetime as dt, json, os, sys
if len(sys.argv) < 3: sys.exit(__doc__)
data, motivo = sys.argv[1], sys.argv[2]
dt.date.fromisoformat(data)
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'jornada_eventos.json')
j = json.load(open(p, encoding='utf-8'))
if any(e.get('data') == data and e.get('tipo') == 'estalagem' for e in j['eventos']):
    sys.exit('estalagem de %s já estava registrada' % data)
j['eventos'].append({'data': data, 'tipo': 'estalagem', 'motivo': motivo, 'confirmado_em': dt.date.today().isoformat()})
json.dump(j, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('estalagem registrada em %s (%s). Agora: ./publicar_jornada.sh e commit.' % (data, motivo))
