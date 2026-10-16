#!/usr/bin/env python3
"""Grava no painel (caixa Diário do Notion, via /api/log) o que o Fabio mandou pelo Telegram.

O bot usa isto para que refeição, treino ou sintoma contado no Telegram valha como registro feito no site
(decisão do Fabio em 16/10/2026). Só grava o que ele mandou; nada inventado.

Uso:
  ./registrar_no_painel.py refeicao --refeicao Jantar --data 2026-10-15 --texto "frango, arroz" [--foto caminho.jpg]
  ./registrar_no_painel.py treino --texto "Campeonato de futebol, 3 jogos" [--data AAAA-MM-DD]
  ./registrar_no_painel.py observacao --texto "dor no joelho esquerdo 3/10"
  ... [--forcar]   grava mesmo se já houver registro igual no dia

Saída: 0 gravado; 3 já existe registro parecido no dia (mostra qual; pergunte ao Fabio ou use --forcar);
1 erro de rede ou da API (nada gravado).
"""
import argparse, base64, datetime, json, subprocess, sys, time

BASE = 'https://painel-xi-three.vercel.app'
REFEICOES = ['Café', 'Almoço', 'Lanche', 'Jantar', 'Outro']
ROTULO = {'refeicao': 'Refeição', 'treino': 'Treino', 'observacao': 'Observação'}


def pedir(url, corpo=None, tentativas=3):
    # curl, e não urllib: o Python deste Mac não acha os certificados (mesma escolha do enviar_telegram_saude.py)
    cmd = ['curl', '-sS', '--max-time', '60', '-w', '\n%{http_code}', url]
    if corpo is not None:
        cmd += ['-H', 'Content-Type: application/json', '--data-binary', '@-']
    for i in range(tentativas):
        r = subprocess.run(cmd, input=json.dumps(corpo) if corpo is not None else None,
                           capture_output=True, text=True)
        if r.returncode == 0:
            texto, _, codigo = r.stdout.rpartition('\n')
            if codigo != '200':
                raise SystemExit(f'erro da API ({codigo}): {texto[:300]}; nada gravado')
            return json.loads(texto)
        if i == tentativas - 1:
            raise SystemExit(f'sem rede depois de {tentativas} tentativas ({r.stderr.strip()}); nada gravado')
        time.sleep(5 * (i + 1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('tipo', choices=list(ROTULO))
    ap.add_argument('--texto', default='')
    ap.add_argument('--refeicao', choices=REFEICOES)
    ap.add_argument('--data', default=datetime.date.today().isoformat())
    ap.add_argument('--foto')
    ap.add_argument('--forcar', action='store_true')
    a = ap.parse_args()

    datetime.date.fromisoformat(a.data)
    if a.tipo == 'refeicao' and not a.refeicao:
        ap.error('refeição pede --refeicao (Café, Almoço, Lanche, Jantar ou Outro)')
    if not a.texto.strip() and not a.foto:
        ap.error('sem texto e sem foto não há o que registrar')

    if not a.forcar:
        itens = pedir(f'{BASE}/api/registros').get('items', [])
        iguais = [x for x in itens if x.get('data') == a.data and x.get('tipo') == ROTULO[a.tipo]
                  and (a.tipo != 'refeicao' or x.get('refeicao') == a.refeicao)]
        if iguais:
            print('já existe no painel, no mesmo dia:')
            for x in iguais:
                print(f"  - {x.get('refeicao') or x['tipo']}: {x.get('texto') or '(só foto)'}{' [foto]' if x.get('foto') else ''}")
            print('nada gravado. Se for outro registro, rode de novo com --forcar.')
            sys.exit(3)

    corpo = {'tipo': a.tipo, 'texto': a.texto.strip(), 'data': a.data}
    if a.refeicao:
        corpo['refeicao'] = a.refeicao
    if a.foto:
        with open(a.foto, 'rb') as f:
            bruto = f.read()
        if len(bruto) > 4_000_000:
            raise SystemExit('foto acima de 4 MB; reduza antes (sips -Z 1600 arquivo.jpg)')
        corpo['photoBase64'] = base64.b64encode(bruto).decode()
        corpo['fileName'] = 'telegram.jpg'

    r = pedir(f'{BASE}/api/log', corpo)
    if not r.get('ok'):
        raise SystemExit(f'a API não confirmou: {r}')
    oque = r.get('refeicao') or ROTULO[a.tipo]
    print(f"gravado no painel: {oque} de {r['dia']}{' com foto' if r.get('foto') else ''}")


if __name__ == '__main__':
    main()
