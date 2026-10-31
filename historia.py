#!/usr/bin/env python3
"""O motor da campanha "A Semente de Aurora" (v2, 25/10/2026).

A história é autônoma: nenhum acontecimento corresponde a um hábito, a um dia ou a um fato da vida do Fabio
(decisão dele, 25/10). A ÚNICA ligação com a vida real é mecânica: as métricas decidem se os desfechos são
favoráveis ou não.

Cada semana real é uma PARTE da campanha (a parte não corresponde a uma semana dentro da história):
  - premissa (texto longo, escrito no domingo anterior) em historia/escritos/<segunda>-premissa.md
  - baralho de acontecimentos da parte em historia/partes/<segunda>.json
  - todo dia fechado tira cartas do baralho pela QUALIDADE do dia (quantas missões do dia foram cumpridas):
      4 ou mais = bênção (estilha), 2-3 = achado (pista), 1 = dia quieto, 0 com dado = percalço (desgaste);
      juramento quebrado no dia (historia/juramentos.json) = carta de maldição. O texto da carta é só história.
      Desde 29/10 as cartas são cumulativas (achado aos 2 itens, bênção aos 4) e cada uma vira um despacho no
      Telegram (despachos.py); o encerramento mostra onde cada despacho entrou na história (<segunda>-marcos.json).
  - no fechamento: o nível da parte vem das missões da semana (triunfo, avanço, sustenta, revés, crise);
      juramentos: o 1º da parte parte uma runa (ou fere alguém), o 2º lança a Mácula de Cinza; juramento com a mácula
      já ativa entrega a pessoa marcada à Cinza (crise); "mesa" lança o Sussurro da Rainha (a próxima parte cai um nível);
      parte sem juramento quebrado tira a mácula e dá a relíquia da parte; 2 desgastes ferem alguém; 5 estilhas forjam a
      Lâmina Estelar; 3 ou mais manhãs vermelhas protegem de revés e crise.
  - o encerramento (texto longo) é escrito no domingo à noite em historia/escritos/<segunda>-encerramento.md.
O peso nunca dá nem tira nada aqui; o chefe do arco cai pela média de 28 dias (jornada.py).
Uso: python3 historia.py [--fechar-hoje] [--dry]"""
import datetime as dt, json, os, re, sys, unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
HOJE = dt.date.today()
DRY = '--dry' in sys.argv
FECHAR_HOJE = '--fechar-hoje' in sys.argv
MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
DIAS_PT = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
NIVEIS = ['crise', 'reves', 'sustenta', 'avanco', 'triunfo']
ITENS_DO_DIA = {'Pesagem', 'Dia ativo', 'Corrida', 'Sessão de força', 'Almoço registrado', 'Lanche registrado', 'Descanso na estalagem', 'Rodada bônus'}


def ler(nome, padrao=None):
    try:
        return json.load(open(os.path.join(AQUI, nome), encoding='utf-8'))
    except (OSError, ValueError):
        return padrao


def gravar(nome, obj):
    if DRY: return
    p = os.path.join(AQUI, nome); os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(obj, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def D(s): return dt.date.fromisoformat(s[:10])
def seg(d): return d - dt.timedelta(days=d.weekday())
def romano(n): return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][n] if 0 < n <= 12 else str(n)


def periodo(segunda):
    a, b = segunda, segunda + dt.timedelta(days=6)
    return f'{a.day} a {b.day} de {MESES[b.month - 1]}' if a.month == b.month else f'{a.day} de {MESES[a.month - 1]} a {b.day} de {MESES[b.month - 1]}'


def a_etapa(nome): return re.sub(r'^(A|O|As|Os)\b', lambda m: m.group(1).lower(), nome)


def fmt(t, c, mundo, **kw):
    comp = mundo['companhia'][c]; kw.update(c=comp['nome'], g=comp['g'])
    for k, v in kw.items(): t = t.replace('{' + k + '}', str(v))
    return t


# ──────────────── dados
J = ler('painel/data/jornada.json')
if not J: sys.exit('historia: sem painel/data/jornada.json (rode jornada.py antes)')
mundo = ler('historia/mundo.json')
resumo = {x['data']: x for x in (ler('resumo_diario.json', {}).get('dias') or [])}
estalagens = {e['data'] for e in ler('jornada_eventos.json', {}).get('eventos', []) if e.get('tipo') == 'estalagem' and e.get('confirmado_em')}
JUR = sorted(ler('historia/juramentos.json', {}).get('quebras', []), key=lambda q: q['data'])
INICIO = D(mundo['inicio'])
ARCOS = mundo['arcos']
DIAS = J.get('dias') or {}


def n_parte(segunda): return (segunda - INICIO).days // 7 + 1


def estado_novo():
    return {'versao': 2, 'inicio': INICIO.isoformat(), 'arco': ARCOS[0]['id'], 'etapa': 0,
            'companhia': {k: {'estado': 'ativa'} for k in mundo['companhia']},
            'mochila': [{'id': 'escudo', 'desde': INICIO.isoformat()}], 'crise': None, 'falhas_seguidas': 0,
            'semanas': {}, 'materiais': {}, 'reliquias': [], 'maldicoes': [], 'aflicoes': 0, 'marcos': []}


E = ler('historia/estado.json') or {}
if E.get('versao') != 2: E = estado_novo()
arco_de = lambda: next(a for a in ARCOS if a['id'] == E['arco'])
CAP = lambda arco: len(arco['etapas']) - 2   # a última etapa (o chefe) só cai pela balança


def parte_de(segunda):
    return ler(f'historia/partes/{segunda.isoformat()}.json') or ler('historia/partes/_padrao.json')


# ──────────────── o diário de bordo: cartas tiradas pela qualidade de cada dia
# Desde 29/10 as cartas são cumulativas (pedido do Fabio: cada marco vira um despacho no Telegram na hora):
# 2 itens tiram o achado; 4 itens tiram também a bênção. O dia em curso só tira as cartas já garantidas
# (itens não somem); quieto e percalço só saem com o dia fechado. Antes de 29/10, uma carta por dia.
CUMULATIVO_DESDE = dt.date(2026, 10, 29)


def valencias(d):
    info = DIAS.get(d.isoformat()) or {}
    n = len(set(info.get('itens', [])) & ITENS_DO_DIA)
    if d < CUMULATIVO_DESDE:
        if not info: return []
        if n >= 4: return ['bencao']
        if n >= 2: return ['achado']
        return ['quieto'] if n == 1 else (['percalco'] if (resumo.get(d.isoformat()) or {}).get('vazio') is False else [])
    v = (['achado'] if n >= 2 else []) + (['bencao'] if n >= 4 else [])
    if d > HOJE or (d == HOJE and not FECHAR_HOJE): return v
    if n == 1: return ['quieto']
    if n == 0 and (resumo.get(d.isoformat()) or {}).get('vazio') is False: return ['percalco']
    return v


def diario(segunda, incluir_hoje=False):
    p = parte_de(segunda) or {}; bar = p.get('baralho', {}); usados = {}
    dias = []
    for i in range(7):
        d = segunda + dt.timedelta(days=i)
        if d > HOJE or (d == HOJE and not incluir_hoje): break
        evs = []
        for v in valencias(d):
            k = usados.get(v, 0); pilha = bar.get(v) or []
            if pilha:
                carta = pilha[k % len(pilha)]; usados[v] = k + 1
                evs.append({'tipo': v, 'texto': carta['texto'], 'despacho': carta.get('despacho', ''), 'efeito': carta.get('efeito', {})})
        for q in [q for q in JUR if q['data'] == d.isoformat()]:
            k = usados.get('maldicao', 0); pilha = bar.get('maldicao') or [{'texto': 'Alguma coisa se rompeu naquela noite.'}]
            c = pilha[k % len(pilha)]
            evs.append({'tipo': 'maldicao', 'texto': c['texto'], 'despacho': c.get('despacho', ''), 'efeito': {}, 'juramento': q['tipo']}); usados['maldicao'] = k + 1
        if evs: dias.append({'data': d.isoformat(), 'dia': DIAS_PT[i], 'eventos': evs})
    return dias


ROTULO = {'estilha': '+{n} estilha do céu', 'pista': '+{n} pista do Códice', 'desgaste': 'desgaste'}


def marcas_de(ev):
    m = [ROTULO[k].format(n=v) for k, v in ev['efeito'].items() if k in ROTULO and v]
    if ev['efeito'].get('reliquia') in mundo['reliquias']: m.append('relíquia: ' + mundo['reliquias'][ev['efeito']['reliquia']]['nome'])
    if ev.get('juramento'): m.append('juramento quebrado: o preço vem no fim da parte')
    return m


# ──────────────── resolução de uma semana (parte) fechada
def tier_base(ok, n, concl, seguidas):
    if ok == n: return 'triunfo'
    if concl: return 'avanco'
    if ok * 2 >= n: return 'sustenta'
    return 'crise' if (ok == 0 or seguidas >= 1) else 'reves'


def proximo_aflito(evitar=()):
    ordem = mundo['ordem_aflicao']
    for i in range(len(ordem)):
        k = ordem[(E['aflicoes'] + i) % len(ordem)]
        if E['companhia'][k]['estado'] in ('ativa', 'ferida') and k not in evitar:
            E['aflicoes'] = (E['aflicoes'] + i + 1) % len(ordem); return k
    return None


def maldicao(mid, antes_de=None):
    return next((m for m in E['maldicoes'] if m['id'] == mid and (antes_de is None or m['desde'] < antes_de)), None)


def alvos_amaldicoados(): return {m.get('alvo') for m in E['maldicoes'] if m.get('alvo')}


def reliquia_livre(rid): return next((r for r in E['reliquias'] if r['id'] == rid and not r.get('usada')), None)


def dar_runa(qtd, efeitos):
    tem = {r['id'] for r in E['mochila']}
    for rid in [r for r in mundo['runas'] if r not in tem][:qtd]:
        E['mochila'].append({'id': rid, 'desde': HOJE.isoformat()}); efeitos.append(f'Bram gravou uma runa nova: {mundo["runas"][rid]["nome"]}.')
    del E['mochila'][:-3]


def ferir(k, efeitos, motivo=''):
    if not k: return None
    pena = reliquia_livre('pena_da_garca')
    nome = mundo['companhia'][k]['nome']; g = mundo['companhia'][k]['g']
    if pena:
        pena['usada'] = True; efeitos.append(f'A Pena da Garça Branca poupou {nome} de uma ferida.'); return None
    if E['companhia'][k]['estado'] == 'ativa': E['companhia'][k]['estado'] = 'ferida'
    efeitos.append(f'{nome} saiu ferid{g}{motivo}.'); return k


def resolver(segunda, missoes):
    arco = arco_de(); cap = CAP(arco); seg_s = segunda.isoformat()
    parte = parte_de(segunda) or {}
    n = len(missoes); ok = sum(m['cumprida'] for m in missoes); concl = ok >= (n - 1 if n >= 3 else n)
    dias_sem = [segunda + dt.timedelta(days=i) for i in range(7)]
    vermelhos = sum(1 for d in dias_sem if (resumo.get(d.isoformat()) or {}).get('banda') == 'r')
    est = sum(1 for d in dias_sem if d.isoformat() in estalagens)
    efeitos = []; afetado = retorna = None; talisma = False
    companhia_antes = {k: v['estado'] for k, v in E['companhia'].items()}; etapa_antes = E['etapa']
    mochila_antes = [r['id'] for r in E['mochila']]; semana_de_resgate = bool(E['crise'])

    # 1. as cartas dos dias
    cartas = [ev for d in diario(segunda, incluir_hoje=True) for ev in d['eventos']]
    for ev in cartas:
        for mat in ('estilha', 'pista', 'desgaste'):
            if ev['efeito'].get(mat): E['materiais'][mat] = E['materiais'].get(mat, 0) + ev['efeito'][mat]
        rid = ev['efeito'].get('reliquia')
        if rid in mundo['reliquias'] and rid not in [r['id'] for r in E['reliquias']]:
            E['reliquias'].append({'id': rid, 'desde': seg_s}); efeitos.append(f'Relíquia ganha: {mundo["reliquias"][rid]["nome"]}.')
    desgaste = sum(ev['efeito'].get('desgaste', 0) for ev in cartas)
    # 2. os juramentos quebrados
    quebras = [q for q in JUR if seg_s <= q['data'] <= (segunda + dt.timedelta(days=6)).isoformat()]
    limites = 0
    for q in quebras:
        if q['tipo'] == 'mesa':
            sal = reliquia_livre('sal_dos_farois')
            if sal: sal['usada'] = True; efeitos.append('O Sal dos Faróis desfez o Sussurro da Rainha antes que ele pegasse.')
            elif not maldicao('sussurro_da_rainha'):
                E['maldicoes'].append({'id': 'sussurro_da_rainha', 'desde': seg_s}); efeitos.append('Maldição: o Sussurro da Rainha. A próxima parte termina um nível abaixo.')
            continue
        limites += 1
        velha = maldicao('macula_de_cinza', seg_s)
        if velha and E['companhia'].get(velha['alvo'], {}).get('estado') in ('ativa', 'ferida') and not E['crise']:
            alvo = velha['alvo']; E['companhia'][alvo]['estado'] = 'capturada'; afetado = alvo
            E['crise'] = {'companheiro': alvo, 'antagonista': 'cinza', 'prazo': 3, 'aberta_em': seg_s}
            E['maldicoes'] = [m for m in E['maldicoes'] if m is not velha]
            efeitos.append(f'A Mácula de Cinza se abriu de vez, e a Cinza levou {mundo["companhia"][alvo]["nome"]}. Resgate em até 3 partes.')
        elif limites == 1:
            if E['mochila']:
                r = E['mochila'].pop(0); talisma = True; efeitos.append(f'A {mundo["runas"][r["id"]]["nome"]} se partiu.')
            else:
                afetado = ferir(proximo_aflito(), efeitos, ' de um juramento quebrado') or afetado
        elif not maldicao('macula_de_cinza'):
            alvo = proximo_aflito(evitar=alvos_amaldicoados())
            if alvo:
                E['maldicoes'].append({'id': 'macula_de_cinza', 'alvo': alvo, 'desde': seg_s})
                if E['companhia'][alvo]['estado'] == 'ativa': E['companhia'][alvo]['estado'] = 'ferida'
                efeitos.append(f'Maldição: a Mácula de Cinza marcou {mundo["companhia"][alvo]["nome"]}.')
        else:
            afetado = ferir(proximo_aflito(evitar=alvos_amaldicoados()), efeitos, ' de um juramento quebrado') or afetado
    # 3. parte limpa
    if not quebras:
        velha = maldicao('macula_de_cinza', seg_s)
        if velha:
            E['maldicoes'] = [m for m in E['maldicoes'] if m is not velha]
            if E['companhia'][velha['alvo']]['estado'] == 'ferida': E['companhia'][velha['alvo']]['estado'] = 'ativa'
            efeitos.append(f'A Mácula de Cinza recuou: {mundo["companhia"][velha["alvo"]]["nome"]} está livre dela.')
        rid = parte.get('recompensa_limpa')
        if rid in mundo['reliquias'] and rid not in [r['id'] for r in E['reliquias']]:
            E['reliquias'].append({'id': rid, 'desde': seg_s}); efeitos.append(f'Parte sem juramento quebrado. Relíquia ganha: {mundo["reliquias"][rid]["nome"]}.')
    # 4. desgaste e forja
    if desgaste >= 2: afetado = ferir(proximo_aflito(evitar=alvos_amaldicoados()), efeitos, ' do desgaste') or afetado
    if E['materiais'].get('estilha', 0) >= mundo['materiais']['estilha']['forja'] and not any(r['id'] == 'lamina_estelar' for r in E['reliquias']):
        E['materiais']['estilha'] -= mundo['materiais']['estilha']['forja']; E['reliquias'].append({'id': 'lamina_estelar', 'desde': seg_s})
        efeitos.append('Com cinco estilhas, Bram forjou a Lâmina Estelar.')

    # 5. o nível da parte
    abrigo = est >= 1 or vermelhos >= 3
    base = tier_base(ok, n, concl, E['falhas_seguidas']); t = base
    if base in ('reves', 'crise') and abrigo: t = 'sustenta'; efeitos.append('A companhia se abrigou e esperou o pior passar. Nada se perdeu pelo nível da parte.')
    sus = maldicao('sussurro_da_rainha', seg_s)
    if sus:
        t = NIVEIS[max(0, NIVEIS.index(t) - 1)]; E['maldicoes'] = [m for m in E['maldicoes'] if m is not sus]
        efeitos.append('O Sussurro da Rainha puxou a parte um nível para baixo, e então se calou.')
    if t in ('reves', 'crise') and E['mochila']:
        r = E['mochila'].pop(0); talisma = True; t = {'crise': 'reves', 'reves': 'sustenta'}[t]
        efeitos.append(f'A {mundo["runas"][r["id"]]["nome"]} se partiu e levou o golpe no lugar da companhia.')
    if base in ('reves', 'crise') and not abrigo: E['falhas_seguidas'] += 1
    elif concl or ok * 2 >= n: E['falhas_seguidas'] = 0

    def curar_todos():
        for k in E['companhia']:
            if E['companhia'][k]['estado'] == 'ferida' and k not in alvos_amaldicoados(): E['companhia'][k]['estado'] = 'ativa'

    if semana_de_resgate and E['crise'] and E['crise'].get('aberta_em') != seg_s:
        c = E['crise']['companheiro']; lugar = mundo['antagonistas'][E['crise']['antagonista']]['lugar']
        if t in ('triunfo', 'avanco'):
            E['companhia'][c]['estado'] = 'ativa'; retorna = c; E['crise'] = None
            efeitos.append(fmt(mundo['resgate']['libertado'], c, mundo, lugar=lugar)); curar_todos()
        else:
            E['crise']['prazo'] -= 1
            if t in ('reves', 'crise'): afetado = ferir(proximo_aflito(evitar=[c]), efeitos, ' na tentativa de resgate') or afetado
            if E['crise']['prazo'] <= 0:
                E['companhia'][c]['estado'] = 'perdida'; efeitos.append(fmt(mundo['resgate']['perdido'], c, mundo, lugar=lugar)); E['crise'] = None
            else:
                efeitos.append(fmt(mundo['resgate']['adiado'], c, mundo, lugar=lugar) + f' Faltam {E["crise"]["prazo"]} partes.')
    else:
        antes = E['etapa']
        if t == 'triunfo':
            E['etapa'] = min(E['etapa'] + 2, cap); dar_runa(2, efeitos); curar_todos()
            perdida = next((k for k, v in E['companhia'].items() if v['estado'] == 'perdida'), None)
            if perdida: E['companhia'][perdida]['estado'] = 'ativa'; retorna = perdida; efeitos.append(fmt(mundo['resgate']['reencontro'], perdida, mundo))
        elif t == 'avanco':
            E['etapa'] = min(E['etapa'] + 1, cap); dar_runa(1, efeitos); curar_todos()
        elif t == 'sustenta':
            curar_todos()
        elif t == 'reves':
            afetado = ferir(proximo_aflito(evitar=alvos_amaldicoados()), efeitos) or afetado
        elif t == 'crise' and not E['crise']:
            c = proximo_aflito(); ant = parte.get('antagonista', 'cinza')
            E['etapa'] = max(E['etapa'] - 1, 0)
            if c:
                afetado = c; E['companhia'][c]['estado'] = 'capturada'
                E['crise'] = {'companheiro': c, 'antagonista': ant if ant in mundo['antagonistas'] else 'cinza', 'prazo': 3, 'aberta_em': seg_s}
                efeitos.append(fmt(mundo['antagonistas'][E['crise']['antagonista']]['crise'], c, mundo) + ' Resgate em até 3 partes.')
            if E['etapa'] < antes: efeitos.append(f'A companhia recuou até {a_etapa(arco["etapas"][E["etapa"]])}.')
        if t in ('triunfo', 'avanco') and E['etapa'] > antes: efeitos.append(f'A companhia avançou até {a_etapa(arco["etapas"][E["etapa"]])}.')

    tc = 'reves' if (semana_de_resgate and t in ('reves', 'crise')) else t
    cena = {'tier': tc, 'etapa_antes': etapa_antes, 'etapa_depois': E['etapa'], 'arco': E['arco'], 'clima': parte.get('clima'), 'lua': None,
            'companhia': companhia_antes, 'afetado': afetado, 'retorna': retorna,
            'itens': [r['id'] for r in E['mochila'] if r['id'] not in mochila_antes], 'talisma': talisma}
    return {'segunda': seg_s, 'parte': n_parte(segunda), 'titulo': parte.get('titulo') or f'Parte {romano(n_parte(segunda))}',
            'tier': t, 'tier_base': base, 'ok': ok, 'n': n, 'efeitos': efeitos, 'cena': cena,
            'cartas': {'bencao': sum(1 for c in cartas if c['tipo'] == 'bencao'), 'achado': sum(1 for c in cartas if c['tipo'] == 'achado'),
                       'percalco': sum(1 for c in cartas if c['tipo'] == 'percalco'), 'maldicao': len(quebras)}}


# ──────────────── execução: fecha as semanas que já acabaram
for s in [s for s in J.get('semanas', []) if D(s['segunda']) >= INICIO and 'missoes' in s]:
    sd = D(s['segunda'])
    fechada = sd + dt.timedelta(days=6) < HOJE or (FECHAR_HOJE and sd == seg(HOJE) and HOJE.weekday() == 6)
    if fechada and s['segunda'] not in E['semanas']:
        E['semanas'][s['segunda']] = resolver(sd, s['missoes'])

arco = arco_de()
if J.get('media_28d') is not None and E['arco'] == (J.get('arco') or {}).get('num') and J['media_28d'] <= (J.get('arco') or {}).get('ate', -1) and arco is not ARCOS[-1]:
    prox = ARCOS[ARCOS.index(arco) + 1]
    E['marcos'].append({'em': HOJE.isoformat(), 'texto': f'{arco["chefe"]} caiu. A companhia seguiu para {a_etapa(prox["etapas"][0])}.'})
    E['arco'], E['etapa'] = prox['id'], 0
    arco = prox

SEG_ATUAL = seg(HOJE)


def projetar():
    global E
    if SEG_ATUAL.isoformat() in E['semanas'] or SEG_ATUAL < INICIO: return None
    salvo = json.loads(json.dumps(E))
    try:
        reg = resolver(SEG_ATUAL, (J.get('capitulo') or {}).get('missoes', []))
        reg['depois'] = {'etapa': E['etapa'], 'companhia': {k: v['estado'] for k, v in E['companhia'].items()}, 'mochila': [r['id'] for r in E['mochila']],
                         'reliquias': [r['id'] for r in E['reliquias']], 'maldicoes': [m['id'] for m in E['maldicoes']], 'materiais': dict(E['materiais'])}
    finally:
        E = salvo
    return reg


PROJ = projetar()


# ──────────────── textos longos
def ler_escrito(nome):
    p = os.path.join(AQUI, 'historia', 'escritos', nome)
    if not os.path.exists(p): return None
    txt = open(p, encoding='utf-8').read(); meta = {}
    if txt.startswith('---'):
        cab, _, txt = txt[3:].partition('\n---')
        for linha in cab.strip().splitlines():
            if ':' in linha: k, _, v = linha.partition(':'); meta[k.strip()] = v.strip()
    return meta, txt.strip()


def minutos(txt): return max(1, round(len(re.findall(r'\w+', txt)) / 200))


def encerramento(segunda_s, tier):
    e = ler_escrito(f'{segunda_s}-encerramento.md')
    if not e: return None
    meta, txt = e
    partes = re.split(r'<!--\s*alternativa:\s*(\w+)\s*-->', txt)
    principal, alts = partes[0].strip(), {partes[i]: partes[i + 1].strip() for i in range(1, len(partes) - 1, 2)}
    if tier and tier != meta.get('desfecho_padrao', tier) and tier in alts:
        corte = principal.rfind('\n## ')
        principal = (principal[:corte] if corte > 0 else principal) + '\n\n' + alts[tier]
    n = n_parte(D(segunda_s))
    marcos = (ler(f'historia/escritos/{segunda_s}-marcos.json', {}) or {}).get('marcos', [])
    return {'parte': romano(n), 'n': n, 'titulo': meta.get('titulo', ''), 'subtitulo': meta.get('subtitulo', ''), 'simulacao': meta.get('simulacao') == 'sim',
            'nota': meta.get('nota', ''), 'texto': principal, 'minutos': minutos(principal), 'tier': tier, 'semana': segunda_s, 'marcos': marcos}


def premissa(segunda):
    e = ler_escrito(f'{segunda.isoformat()}-premissa.md')
    if not e: return None
    meta, txt = e; n = n_parte(segunda)
    return {'parte': romano(n), 'n': n, 'titulo': meta.get('titulo', ''), 'semana': segunda.isoformat(), 'simulacao': meta.get('simulacao') == 'sim',
            'nota': meta.get('nota', ''), 'texto': txt, 'minutos': minutos(txt)}


def prologo():
    e = ler_escrito('prologo.md')
    return {'titulo': e[0].get('titulo', 'Prólogo'), 'subtitulo': e[0].get('subtitulo', ''), 'texto': e[1], 'minutos': minutos(e[1])} if e else None


def biblia():
    p = os.path.join(AQUI, 'historia', 'biblia.md')
    if not os.path.exists(p): return []
    secs = re.split(r'\n## ', '\n' + open(p, encoding='utf-8').read().split('\n', 1)[1])
    return [{'titulo': x.split('\n', 1)[0].strip(), 'texto': x.split('\n', 1)[1].strip() if '\n' in x else ''} for x in secs if x.strip()]


def slug(t): return re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFKD', t.lower()).encode('ascii', 'ignore').decode()).strip('-')


# ──────────────── saída: livro e painel
partes_feitas = []
for s_, reg in sorted(E['semanas'].items()):
    enc = encerramento(s_, reg['tier'])
    partes_feitas.append({'parte': romano(reg['parte']), 'n': reg['parte'], 'titulo': reg['titulo'], 'periodo': periodo(D(s_)), 'fim': (D(s_) + dt.timedelta(days=6)).isoformat(),
                          'tier': reg['tier'], 'ok': reg['ok'], 'total': reg['n'], 'efeitos': reg['efeitos'], 'cena': reg['cena'], 'concluido': True,
                          'desfecho': '', 'tem_texto': bool(enc)})

livro_dir = os.path.join(AQUI, 'historia', 'livro')
if not DRY:
    os.makedirs(livro_dir, exist_ok=True)
    for f in os.listdir(livro_dir):
        if f.endswith('.md'): os.remove(os.path.join(livro_dir, f))
    pr = prologo()
    if pr: open(os.path.join(livro_dir, '00-prologo.md'), 'w', encoding='utf-8').write(f'# Prólogo: {pr["subtitulo"]}\n{pr["texto"]}\n')
    for s_, reg in sorted(E['semanas'].items()):
        enc = encerramento(s_, reg['tier'])
        if enc: open(os.path.join(livro_dir, f'{reg["parte"]:02d}-{slug(reg["titulo"])}.md'), 'w', encoding='utf-8').write(f'# Parte {enc["parte"]}: {enc["titulo"]}\n{enc["texto"]}\n')

parte_atual = parte_de(SEG_ATUAL) if SEG_ATUAL >= INICIO else None
cap_j = J.get('capitulo') or {}
painel = {
    'gerado_em': dt.datetime.now().isoformat(timespec='seconds'), 'versao': 2, 'titulo': mundo['titulo'],
    'arco': {'id': arco['id'], 'nome': arco['nome'], 'chefe': arco['chefe'], 'chefe_texto': arco.get('chefe_texto', '')},
    'etapa': E['etapa'], 'etapas': [{'nome': e, 'estado': 'feita' if i < E['etapa'] else ('atual' if i == E['etapa'] else 'futura')} for i, e in enumerate(arco['etapas'])],
    'companhia': [{'id': k, **{f: mundo['companhia'][k][f] for f in ('nome', 'papel', 'texto', 'g')}, 'estado': E['companhia'][k]['estado']} for k in mundo['companhia']],
    'guia': mundo['guia'],
    'mochila': [{'id': r['id'], **mundo['runas'][r['id']]} for r in E['mochila']], 'regra_item': mundo['regra_runa'],
    'crise': ({'companheiro': mundo['companhia'][E['crise']['companheiro']]['nome'], 'g': mundo['companhia'][E['crise']['companheiro']]['g'],
               'onde': mundo['antagonistas'][E['crise']['antagonista']]['lugar'], 'antagonista': mundo['antagonistas'][E['crise']['antagonista']]['nome'],
               'prazo': E['crise']['prazo']} if E['crise'] else None),
    'reliquias': [{'id': r['id'], **mundo['reliquias'][r['id']], 'usada': bool(r.get('usada'))} for r in E['reliquias'] if r['id'] in mundo['reliquias']],
    'maldicoes': [{'id': m['id'], **mundo['maldicoes'][m['id']], 'alvo': mundo['companhia'].get(m.get('alvo'), {}).get('nome')} for m in E['maldicoes'] if m['id'] in mundo['maldicoes']],
    'materiais': {k: {'qtd': E['materiais'].get(k, 0), **v} for k, v in mundo['materiais'].items()},
    'fios': (ler('historia/fios.json', {}) or {}).get('fios', []), 'biblia': biblia(), 'prologo': prologo(),
    'capitulos': partes_feitas, 'marcos': E['marcos'],
    'semana': ({'n': n_parte(SEG_ATUAL), 'parte': romano(n_parte(SEG_ATUAL)), 'segunda': SEG_ATUAL.isoformat(), 'titulo': (parte_atual or {}).get('titulo', ''),
                'periodo': periodo(SEG_ATUAL), 'ok': sum(m['cumprida'] for m in cap_j.get('missoes', [])), 'total': len(cap_j.get('missoes', [])), 'em_jogo': '', 'abertura': ''}
               if SEG_ATUAL >= INICIO else None),
    'diario': [{**d, 'eventos': [{'tipo': ev['tipo'], 'texto': ev['texto'], 'despacho': ev.get('despacho', ''), 'juramento': ev.get('juramento'), 'marcas': marcas_de(ev)} for ev in d['eventos']]} for d in diario(SEG_ATUAL, incluir_hoje=True)] if SEG_ATUAL >= INICIO else [],
    'premissa_atual': premissa(SEG_ATUAL), 'premissa_proxima': premissa(SEG_ATUAL + dt.timedelta(days=7)),
}
# as missões cumpridas viram cartas no diário, no dia em que o despachos.py as viu (historia/despachos.json)
for dsp in (ler('historia/despachos.json', {}) or {}).get('despachos', []):
    if dsp['tipo'] != 'missao' or not dsp['id'].startswith(f'missao:{SEG_ATUAL.isoformat()}:'): continue
    dia = next((x for x in painel['diario'] if x['data'] == dsp['data']), None)
    if not dia:
        dd = D(dsp['data']); dia = {'data': dsp['data'], 'dia': DIAS_PT[dd.weekday()], 'eventos': []}
        painel['diario'].append(dia); painel['diario'].sort(key=lambda x: x['data'])
    dia['eventos'].append({'tipo': 'missao', 'texto': dsp['carta'], 'despacho': dsp['cena'], 'juramento': None, 'marcas': ['missão da semana cumprida']})
if PROJ:
    painel['projecao'] = {'tier': PROJ['tier'], 'ok': PROJ['ok'], 'n': PROJ['n'], 'efeitos': PROJ['efeitos'], 'cena': PROJ['cena'], 'depois': PROJ['depois'],
                          'falta_para_avanco': max(0, (PROJ['n'] - 1) - PROJ['ok'])}
    painel['encerramento'] = encerramento(SEG_ATUAL.isoformat(), PROJ['tier'])
if not painel.get('encerramento'):
    com_texto = [s_ for s_ in sorted(E['semanas']) if ler_escrito(f'{s_}-encerramento.md')]
    if com_texto: painel['encerramento'] = encerramento(com_texto[-1], E['semanas'][com_texto[-1]]['tier'])

gravar('historia/estado.json', E)
gravar('painel/data/historia.json', painel)
print(f'historia v2: arco {arco["id"]} etapa {E["etapa"]} ({arco["etapas"][E["etapa"]]}); ' + ', '.join(f'{mundo["companhia"][k]["nome"]}={v["estado"]}' for k, v in E['companhia'].items())
      + f'; runas {len(E["mochila"])}; partes fechadas {[(romano(r["parte"]), r["tier"]) for r in E["semanas"].values()]}'
      + (f'; projeção {PROJ["tier"]} ({PROJ["ok"]}/{PROJ["n"]})' if PROJ else '') + (' [dry]' if DRY else ''))
