#!/usr/bin/env python3
"""O motor da aventura (A Campanha dos 85).

O desempenho do Fabio na semana decide o que acontece com a companhia; a história não conta o dia dele.
  jornada.py  -> mede o desempenho (missões da semana, relógio, balança, registros)
  historia.py -> transforma a semana FECHADA num desfecho (triunfo, avanço, sustenta, revés ou crise),
                 aplica as consequências ao mundo (etapa, companhia, mochila, crise) e escreve o capítulo.

Canon em historia/mundo.json (texto escrito à mão). Estado em historia/estado.json. Saída para o painel em
painel/data/historia.json e os capítulos em historia/livro/NN-*.md (o jornada.py os lê para o livro).

Regras (decisão do Fabio, 24/10/2026: "o desempenho guia o personagem; perda de membros, derrota e crise são
possíveis; o ambiente pode ser sincronizado; não pode ser retrospectiva do dia"):
  - A semana tem uma AMEAÇA (evento) anunciada na segunda, com o que está em jogo. O desfecho vem na semana fechada.
  - Triunfo (todas as missões): avança 2 etapas, 2 talismãs, a companhia se recupera, volta quem se perdeu.
  - Avanço (capítulo concluído): avança 1 etapa, 1 talismã, a companhia se recupera.
  - Sustenta (metade das missões ou mais): fica onde está, a companhia se recupera.
  - Revés (semana fraca): um companheiro ferido. Crise (semana vazia, ou 2 semanas fracas seguidas): recuo de 1 etapa,
    um companheiro capturado, crise aberta com prazo de 3 semanas para o resgate; se o prazo acaba, ele se perde.
  - Talismã (ganho por missão cumprida) absorve uma derrota: ela cai um nível.
  - Doença/descanso protege: semana com estalagem confirmada ou 3 ou mais manhãs vermelhas nunca vira revés nem crise
    (a companhia se abriga). Semana sem dado fica fora do livro. O XP nunca diminui: as perdas são do mundo da história,
    nunca do XP, e toda perda tem um caminho de volta.
O peso nunca dá nem tira nada aqui; o chefe do arco cai pela média de 28 dias (jornada.py), como antes.
Uso: python3 historia.py [--fechar-hoje] [--dry]"""
import datetime as dt, hashlib, json, os, re, subprocess, sys, unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
HOJE = dt.date.today()
DRY = '--dry' in sys.argv
FECHAR_HOJE = '--fechar-hoje' in sys.argv
MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
PRIORIDADE_ITEM = ['forcas', 'ativos', 'pesagens', 'almocos', 'lanches']
LIGA = {'ativos': 'brisa', 'forcas': 'dorn', 'pesagens': 'ysa', 'almocos': 'ysa', 'lanches': 'ysa'}
ANTAG = {'ativos': 'tempestade', 'forcas': 'pantano', 'pesagens': 'nevoa', 'almocos': 'sereias', 'lanches': 'sereias'}
TITULOS_INTERMEZZO = {'mercador-das-brumas': 'O Mercador das Brumas', 'fogueira-dos-viajantes': 'A Fogueira dos Viajantes'}


def ler(nome, padrao=None):
    p = os.path.join(AQUI, nome)
    try:
        return json.load(open(p, encoding='utf-8'))
    except (OSError, ValueError):
        return padrao


def gravar(nome, obj):
    if DRY: return
    p = os.path.join(AQUI, nome); os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(obj, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def D(s): return dt.date.fromisoformat(s)


def a_etapa(nome):
    """'A Estrada de Pedra' -> 'a Estrada de Pedra' (para frases como 'avançou até ...')."""
    return re.sub(r'^(A|O|As|Os)\b', lambda m: m.group(1).lower(), nome)
def seg(d): return d - dt.timedelta(days=d.weekday())


def periodo(segunda):
    a, b = segunda, segunda + dt.timedelta(days=6)
    return f'{a.day} a {b.day} de {MESES[b.month - 1]}' if a.month == b.month else f'{a.day} de {MESES[a.month - 1]} a {b.day} de {MESES[b.month - 1]}'


def lua_na_semana(segunda):
    """'cheia', 'nova' ou None: a fase da lua (aproximação sinódica) em algum dia da semana."""
    for i in range(7):
        d = segunda + dt.timedelta(days=i)
        jd = d.toordinal() + 1721424.5
        f = ((jd - 2451550.1) % 29.530588853) / 29.530588853
        if abs(f - 0.5) < 0.017: return 'cheia'
        if f < 0.017 or f > 0.983: return 'nova'
    return None


def clima_da_semana(segunda):
    """Resumo do tempo no Rio (Open-Meteo) para a semana: 'tempestade', 'chuvosa', 'quente' ou 'seca'; None sem rede."""
    ini, fim = segunda, segunda + dt.timedelta(days=6)
    url = ('https://api.open-meteo.com/v1/forecast?latitude=-22.86&longitude=-43.23&timezone=America%2FSao_Paulo'
           f'&daily=precipitation_sum,apparent_temperature_max&start_date={ini}&end_date={fim}')
    try:
        r = subprocess.run(['curl', '-sS', '--max-time', '25', url], capture_output=True, text=True)
        d = json.loads(r.stdout)['daily']
        chuva = [x or 0 for x in d['precipitation_sum']]; calor = [x or 0 for x in d['apparent_temperature_max']]
    except Exception:
        return None
    if max(chuva) >= 25: return 'tempestade'
    if sum(1 for x in chuva if x >= 3) >= 3: return 'chuvosa'
    if sum(1 for x in calor if x >= 32) >= 3: return 'quente'
    return 'seca'


def sentenca_ambiente(mundo, amb):
    if not amb: return ''
    a = mundo['ambiente']; partes = []
    if amb.get('clima') in a: partes.append(a[amb['clima']])
    if amb.get('lua') in ('cheia', 'nova'): partes.append(a['lua_' + {'cheia': 'cheia', 'nova': 'nova'}[amb['lua']]])
    return ' '.join(partes)


def fmt(t, c=None, mundo=None, **kw):
    """Encaixa {c}, {g}, {lugar}, {ambiente} etc. no texto."""
    if c and mundo:
        comp = mundo['companhia'][c]; kw.update(c=comp['nome'], g=comp['g'])
    for k, v in kw.items(): t = t.replace('{' + k + '}', str(v))
    return re.sub(r'\s+', ' ', t.replace('{ambiente}', kw.get('ambiente', ''))).strip()


# ──────────────── dados
J = ler('painel/data/jornada.json')
if not J:
    sys.exit('historia: sem painel/data/jornada.json (rode jornada.py antes)')
R = ler('jornada_regras.json', {})
mundo = ler('historia/mundo.json')
resumo = {x['data']: x for x in (ler('resumo_diario.json', {}).get('dias') or [])}
estalagens = {e['data'] for e in ler('jornada_eventos.json', {}).get('eventos', []) if e.get('tipo') == 'estalagem' and e.get('confirmado_em')}
INICIO = D(R.get('inicio_livro', '2026-10-12'))
ARCOS = mundo['arcos']


def estado_novo():
    return {'versao': 1, 'inicio': INICIO.isoformat(), 'arco': ARCOS[0]['id'], 'etapa': 0,
            'companhia': {k: {'estado': 'ativa'} for k in mundo['companhia']}, 'mochila': [], 'crise': None,
            'falhas_seguidas': 0, 'semanas': {}, 'semana_atual': None, 'ultimo_evento': None, 'marcos': []}


E = ler('historia/estado.json') or estado_novo()
for _k, _v in (('materiais', {}), ('reliquias', []), ('maldicoes', []), ('dividas', [])): E.setdefault(_k, _v)
EVD = sorted(ler('historia/eventos_dia.json', {}).get('eventos', []), key=lambda e: e['data'])
NIVEIS = ['crise', 'reves', 'sustenta', 'avanco', 'triunfo']


def eventos_da_semana(segunda):
    fim = segunda + dt.timedelta(days=6)
    return [e for e in EVD if segunda.isoformat() <= e['data'] <= fim.isoformat()]


def maldicao_ativa(mid, antes_de=None):
    return next((m for m in E['maldicoes'] if m['id'] == mid and (antes_de is None or m['desde'] < antes_de)), None)


def alvos_amaldicoados():
    return {m.get('alvo') for m in E['maldicoes'] if m.get('alvo')}
arco_de = lambda: next(a for a in ARCOS if a['id'] == E['arco'])
CAP = lambda arco: len(arco['etapas']) - 2        # a última etapa (o chefe) só cai pela balança


# ──────────────── eventos
def hash_de(txt): return int(hashlib.sha1(txt.encode()).hexdigest(), 16)


def evento_generico(arco, etapa):
    atual, cap = arco['etapas'][etapa], CAP(arco)
    para = arco['etapas'][min(etapa + 1, len(arco['etapas']) - 1)]
    depois = arco['etapas'][min(etapa + 2, cap)]
    if etapa >= cap:
        return {'titulo': 'O cerco: ' + arco['chefe'], 'etapa': etapa, 'para': '',
                'abertura': f'{{ambiente}} A companhia cerca {arco["chefe"]} e mede, passo a passo, o que ainda falta. Ele não se rende por uma semana boa: cede aos poucos, quando o caminho inteiro anda firme.',
                'em_jogo': 'Manter o cerco sem perder terreno.',
                'triunfo': f'A companhia apertou o cerco como nunca, e {arco["chefe"]} recuou um passo, que todos viram.',
                'avanco': 'O cerco se manteve firme, e a companhia dormiu sem sobressalto.',
                'sustenta': 'A companhia ficou onde estava, sem ganhar nem perder terreno.',
                'reves': f'{arco["chefe"]} achou uma fresta, e a companhia recuou ferida. {{c}} ficou machucad{{g}}.'}
    return {'titulo': atual, 'etapa': etapa, 'para': para,
            'abertura': f'{{ambiente}} A companhia deixou {atual} para trás e seguiu em direção a {para}. O caminho é longo e ninguém sabe o que a estrada guarda.',
            'em_jogo': f'Chegar a {para} com a companhia inteira.',
            'triunfo': f'A companhia fez a jornada em dois lances e passou por {para} sem parar, chegando a {depois}.',
            'avanco': f'A companhia chegou a {para} ao fim do dia, em ordem, e acampou sem pressa.',
            'sustenta': f'A companhia acampou a meio caminho de {para}, sem ganhar nem perder terreno.',
            'reves': 'O caminho cobrou caro: a companhia voltou ao ponto de partida, e {c} ficou machucad{g}.'}


def escolher_evento(segunda):
    """A ameaça da semana. Determinística: mesma semana e mesmo estado, mesmo evento."""
    arco = arco_de(); etapa = min(E['etapa'], CAP(arco))
    if E['crise']:
        return 'resgate', {'titulo': 'O Resgate', 'etapa': etapa, 'para': ''}
    ev = mundo['eventos']
    base = [k for k, v in ev.items() if v['etapa'] == etapa] if arco['id'] == 'I' else []
    inter = sorted(k for k, v in ev.items() if v['etapa'] == -1)
    ultimo = E.get('ultimo_evento')
    if not base:
        return f'generico:{arco["id"]}:{etapa}', evento_generico(arco, etapa)
    if ultimo in base:   # a etapa não mudou desde a semana passada: um intermezzo antes de repetir a ameaça
        opc = [k for k in inter if k != ultimo] or inter
        k = opc[hash_de(f'{segunda}-{etapa}') % len(opc)]
        return k, {**ev[k], 'titulo': TITULOS_INTERMEZZO.get(k, k)}
    k = base[0]
    return k, {**ev[k], 'titulo': arco['etapas'][ev[k]['etapa']]}


def evento_por_id(eid, etapa):
    arco = arco_de()
    if eid == 'resgate': return {'titulo': 'O Resgate', 'para': ''}
    if eid.startswith('generico:'): return evento_generico(arco, etapa)
    ev = mundo['eventos'][eid]
    return {**ev, 'titulo': TITULOS_INTERMEZZO.get(eid) or arco['etapas'][ev['etapa']]}


# ──────────────── resolução de uma semana fechada
def dados_da_semana(segunda):
    dias = [segunda + dt.timedelta(days=i) for i in range(7)]
    com_dado = sum(1 for d in dias if d <= HOJE and (resumo.get(d.isoformat()) or {}).get('vazio') is False)
    vermelhos = sum(1 for d in dias if (resumo.get(d.isoformat()) or {}).get('banda') == 'r')
    est = sum(1 for d in dias if d.isoformat() in estalagens)
    return com_dado, vermelhos, est


def tier_base(ok, n, concl, seguidas):
    if ok == n: return 'triunfo'
    if concl: return 'avanco'
    if ok * 2 >= n: return 'sustenta'
    return 'crise' if (ok == 0 or seguidas >= 1) else 'reves'


def pior_missao(missoes):
    falhas = [m for m in missoes if not m['cumprida']]
    return max(falhas, key=lambda m: (m['meta'] - m['feito']) / max(m['meta'], 1))['id'] if falhas else None


def dar_item(missoes, quantos, efeitos):
    cumpridas = [m['id'] for m in sorted(missoes, key=lambda m: PRIORIDADE_ITEM.index(m['id']) if m['id'] in PRIORIDADE_ITEM else 9) if m['cumprida']]
    tem = {i['id'] for i in E['mochila']}
    ordem = [i for i in cumpridas if i not in tem] + [i for i in cumpridas if i in tem]
    for i in ordem[:quantos]:
        E['mochila'].append({'id': i, 'desde': dt.date.today().isoformat()})
        efeitos.append(f'A companhia ganhou um talismã: {mundo["itens"][i]["nome"]}.')
    del E['mochila'][:-3]


def escolher_companheiro(preferido):
    vivos = [k for k, v in E['companhia'].items() if v['estado'] in ('ativa', 'ferida')]
    if not vivos: return None
    feridos = [k for k in vivos if E['companhia'][k]['estado'] == 'ferida']
    if preferido in feridos: return preferido
    if feridos: return feridos[0]
    return preferido if preferido in vivos else vivos[0]


def resolver(segunda, semana):
    """Aplica o desempenho da semana fechada ao mundo e devolve o registro do capítulo."""
    arco = arco_de(); cap = CAP(arco)
    missoes = semana['missoes']; n = len(missoes); ok = sum(m['cumprida'] for m in missoes)
    concl = ok >= (n - 1 if n >= 3 else n)
    com_dado, vermelhos, est = dados_da_semana(segunda)
    atual = E['semana_atual'] if (E['semana_atual'] or {}).get('segunda') == segunda.isoformat() else None
    eid = (atual or {}).get('evento') or escolher_evento(segunda)[0]
    ev = evento_por_id(eid, E['etapa'])
    efeitos, regs = [], {}
    companhia_antes = {k: v['estado'] for k, v in E['companhia'].items()}
    etapa_antes = E['etapa']; mochila_antes = [i['id'] for i in E['mochila']]
    afetado = retorna = None; talisma = False; semana_de_resgate = bool(E['crise'])
    amb = (atual or {}).get('ambiente') or {}
    seg_s = segunda.isoformat()
    # ── o que aconteceu por baixo, dia a dia (eventos_dia.json): materiais, relíquias, dívidas e juramentos
    quebras = 0
    for evd in eventos_da_semana(segunda):
        ef = evd.get('efeito') or {}
        for mat in ('ferro', 'rumo', 'pena'):
            if ef.get(mat): E['materiais'][mat] = E['materiais'].get(mat, 0) + ef[mat]
        rid = ef.get('reliquia')
        if rid and rid in mundo.get('reliquias', {}) and rid not in [r['id'] for r in E['reliquias']]:
            E['reliquias'].append({'id': rid, 'desde': evd['data']}); efeitos.append(f'Relíquia ganha: {mundo["reliquias"][rid]["nome"]}.')
        if ef.get('divida') and not any(d['npc'] == ef.get('npc') for d in E['dividas']):
            E['dividas'].append({'npc': ef.get('npc'), 'desde': evd['data']})
        if ef.get('juramento'):
            quebras += 1; cons = ef.get('consequencia')
            if cons == 'trinca':
                if E['mochila']:
                    it = E['mochila'].pop(0); talisma = True
                    efeitos.append(f'O talismã {mundo["itens"][it["id"]]["nome"]} partiu-se: a lei da lanterna foi quebrada.')
                else:
                    E['companhia']['dorn']['estado'] = 'ferida' if E['companhia']['dorn']['estado'] == 'ativa' else E['companhia']['dorn']['estado']
                    efeitos.append('Sem talismã para partir, quem pagou foi Dorn: saiu ferido da semana.')
            elif cons == 'febre_do_orgulho':
                velha = maldicao_ativa('febre_do_orgulho', seg_s)
                alvo = mundo['maldicoes']['febre_do_orgulho']['alvo']
                if velha and E['companhia'][alvo]['estado'] in ('ativa', 'ferida') and not E['crise']:
                    E['companhia'][alvo]['estado'] = 'capturada'; afetado = alvo
                    E['crise'] = {'companheiro': alvo, 'antagonista': 'nevoa', 'prazo': 3, 'aberta_em': seg_s}
                    E['maldicoes'] = [m for m in E['maldicoes'] if m['id'] != 'febre_do_orgulho']
                    efeitos.append(f'A Febre do Orgulho cresceu e levou {mundo["companhia"][alvo]["nome"]} para a Torre da Névoa. Resgate em até 3 semanas.')
                elif not maldicao_ativa('febre_do_orgulho'):
                    E['maldicoes'].append({'id': 'febre_do_orgulho', 'alvo': alvo, 'desde': seg_s})
                    if E['companhia'][alvo]['estado'] == 'ativa': E['companhia'][alvo]['estado'] = 'ferida'
                    efeitos.append(f'Maldição: a Febre do Orgulho pegou {mundo["companhia"][alvo]["nome"]}. Sai com uma semana inteira dentro da lei da lanterna.')
            elif cons == 'sal':
                sal = next((r for r in E['reliquias'] if r['id'] == 'sal_limpo' and not r.get('usada')), None)
                if sal:
                    sal['usada'] = True; efeitos.append('O Sal Limpo espantou o canto das Sereias.')
                elif not maldicao_ativa('canto_das_sereias'):
                    E['maldicoes'].append({'id': 'canto_das_sereias', 'desde': seg_s}); efeitos.append('Maldição: o Canto das Sereias ficou no ouvido da companhia.')
    # a febre sai numa semana inteira dentro da lei
    velha = maldicao_ativa('febre_do_orgulho', seg_s)
    if velha and quebras == 0:
        E['maldicoes'] = [m for m in E['maldicoes'] if m is not velha]
        if E['companhia'][velha['alvo']]['estado'] == 'ferida': E['companhia'][velha['alvo']]['estado'] = 'ativa'
        efeitos.append(f'A Febre do Orgulho deixou {mundo["companhia"][velha["alvo"]]["nome"]}: a companhia passou a semana inteira dentro da lei.')
    # semana sem fritura além da conta e sem quebra das Sereias: o sal das salinas (registrado como bênção pelo escritor)
    if E['materiais'].get('ferro', 0) >= mundo.get('materiais', {}).get('ferro', {}).get('forja', 3) and not any(r['id'] == 'lamina_do_marco' for r in E['reliquias']):
        E['materiais']['ferro'] -= 3; E['reliquias'].append({'id': 'lamina_do_marco', 'desde': seg_s})
        efeitos.append('Com três lascas de ferro-estrela, Dorn forjou a Lâmina do Marco.')

    def cena_de(tier_final):
        tc = 'reves' if (semana_de_resgate and tier_final in ('reves', 'crise')) else tier_final
        novos = [i['id'] for i in E['mochila'] if i['id'] not in mochila_antes]
        return {'tier': tc, 'etapa_antes': etapa_antes, 'etapa_depois': E['etapa'], 'arco': E['arco'], 'clima': amb.get('clima'), 'lua': amb.get('lua'),
                'companhia': companhia_antes, 'afetado': afetado, 'retorna': retorna, 'itens': novos, 'talisma': talisma}
    if com_dado < 3:
        return {'segunda': segunda.isoformat(), 'evento': eid, 'tier': 'sem_dado', 'ok': ok, 'n': n, 'efeitos': ['Esta semana ficou fora do livro: a névoa cobriu o mapa e nada foi decidido.'],
                'texto': 'A névoa cobriu o mapa esta semana. A companhia ficou onde estava, e o livro não registra o que não se viu.', 'titulo': ev['titulo'], 'cena': cena_de('sem_dado')}
    abrigo = est >= 1 or vermelhos >= 3
    base = tier_base(ok, n, concl, E['falhas_seguidas'])
    t = base
    if base in ('reves', 'crise') and abrigo:
        t = 'sustenta'; efeitos.append('A companhia se abrigou na estalagem e esperou a tempestade passar. Nada foi perdido.')
    canto = maldicao_ativa('canto_das_sereias', seg_s)
    if canto:
        t = NIVEIS[max(0, NIVEIS.index(t) - 1)]; E['maldicoes'] = [m for m in E['maldicoes'] if m is not canto]
        efeitos.append('O Canto das Sereias puxou a semana um nível para baixo, e então se calou.')
    esc = next((r for r in E['reliquias'] if r['id'] == 'escama_rio_cinza' and not r.get('usada')), None)
    if esc and eid == 'vau-do-rio-cinza':
        t = NIVEIS[min(len(NIVEIS) - 1, NIVEIS.index(t) + 1)]; esc['usada'] = True
        efeitos.append('A Escama do Rio Cinza soube onde pisar: a travessia subiu um nível.')
    if t in ('reves', 'crise') and E['mochila']:
        item = E['mochila'].pop(0); talisma = True
        t = {'crise': 'reves', 'reves': 'sustenta'}[t]
        efeitos.append(f'O talismã {mundo["itens"][item["id"]]["nome"]} quebrou e levou o golpe no lugar da companhia.')
    # falhas seguidas: só semana fraca de verdade (sem abrigo) conta
    if base in ('reves', 'crise') and not abrigo: E['falhas_seguidas'] += 1
    elif concl or ok * 2 >= n: E['falhas_seguidas'] = 0

    texto_extra = ''
    if E['crise']:   # semana de resgate
        c = E['crise']['companheiro']; ant = mundo['antagonistas'][E['crise']['antagonista']]
        kw = dict(lugar=ant['lugar'])
        if t in ('triunfo', 'avanco'):
            E['companhia'][c]['estado'] = 'ativa'; retorna = c; texto_extra = fmt(mundo['resgate']['libertado'], c, mundo, **kw)
            efeitos.append(f'{mundo["companhia"][c]["nome"]} foi resgatad{mundo["companhia"][c]["g"]} e voltou à companhia.'); E['crise'] = None
        else:
            E['crise']['prazo'] -= 1
            if t in ('reves', 'crise'):
                outro = escolher_companheiro(LIGA.get(pior_missao(missoes)))
                if outro and outro != c: afetado = outro; E['companhia'][outro]['estado'] = 'ferida'; efeitos.append(f'{mundo["companhia"][outro]["nome"]} saiu ferid{mundo["companhia"][outro]["g"]} da tentativa.')
            if E['crise']['prazo'] <= 0:
                E['companhia'][c]['estado'] = 'perdida'; texto_extra = fmt(mundo['resgate']['perdido'], c, mundo, **kw)
                efeitos.append(f'{mundo["companhia"][c]["nome"]} está perdid{mundo["companhia"][c]["g"]}. Só uma grande vitória a traz de volta.'); E['crise'] = None
            else:
                texto_extra = fmt(mundo['resgate']['adiado'], c, mundo, **kw)
                efeitos.append(f'Prazo do resgate: {E["crise"]["prazo"]} semana(s).')
        desfecho = texto_extra
    else:
        antes = E['etapa']
        if t == 'triunfo':
            E['etapa'] = min(E['etapa'] + 2, cap); dar_item(missoes, 2, efeitos)
            for k in E['companhia']:
                if E['companhia'][k]['estado'] == 'ferida' and k not in alvos_amaldicoados(): E['companhia'][k]['estado'] = 'ativa'
            perdida = next((k for k, v in E['companhia'].items() if v['estado'] == 'perdida'), None)
            if perdida:
                E['companhia'][perdida]['estado'] = 'ativa'; retorna = perdida; efeitos.append(f'{mundo["companhia"][perdida]["nome"]} voltou: a grande vitória reabriu o caminho.')
        elif t == 'avanco':
            E['etapa'] = min(E['etapa'] + 1, cap); dar_item(missoes, 1, efeitos)
            for k in E['companhia']:
                if E['companhia'][k]['estado'] == 'ferida' and k not in alvos_amaldicoados(): E['companhia'][k]['estado'] = 'ativa'
        elif t == 'sustenta':
            for k in E['companhia']:
                if E['companhia'][k]['estado'] == 'ferida' and k not in alvos_amaldicoados(): E['companhia'][k]['estado'] = 'ativa'
        elif t == 'reves':
            c = escolher_companheiro(LIGA.get(pior_missao(missoes)))
            sem = next((r for r in E['reliquias'] if r['id'] == 'sementes_do_vale' and not r.get('usada')), None)
            if c and sem:
                sem['usada'] = True; efeitos.append(f'As Sementes do Vale curaram {mundo["companhia"][c]["nome"]} antes que a ferida pegasse.'); c = None
            if c: afetado = c; E['companhia'][c]['estado'] = 'ferida'; efeitos.append(f'{mundo["companhia"][c]["nome"]} ficou ferid{mundo["companhia"][c]["g"]} e não ajuda no próximo trecho.')
        elif t == 'crise':
            pior = pior_missao(missoes); ant_id = ANTAG.get(pior, 'nevoa')
            c = escolher_companheiro(LIGA.get(pior))
            E['etapa'] = max(E['etapa'] - 1, 0)
            if c:
                afetado = c; E['companhia'][c]['estado'] = 'capturada'
                E['crise'] = {'companheiro': c, 'antagonista': ant_id, 'prazo': 3, 'aberta_em': segunda.isoformat()}
                efeitos.append(f'{mundo["companhia"][c]["nome"]} foi capturad{mundo["companhia"][c]["g"]}. Resgate em até 3 semanas: uma semana boa (capítulo concluído) a traz de volta.')
            if E['etapa'] < antes: efeitos.append(f'A companhia recuou até {a_etapa(arco["etapas"][E["etapa"]])}.')
        if t in ('triunfo', 'avanco') and E['etapa'] > antes:
            efeitos.append(f'A companhia avançou até {a_etapa(arco["etapas"][E["etapa"]])}.')
        if t == 'crise' and E['crise']:
            ant = mundo['antagonistas'][E['crise']['antagonista']]
            desfecho = fmt(ant['crise'], E['crise']['companheiro'], mundo)
        else:
            c_ferida = next((k for k, v in E['companhia'].items() if v['estado'] == 'ferida'), None) if t == 'reves' else None
            desfecho = fmt(ev.get(t if t in ('triunfo', 'avanco', 'sustenta', 'reves') else 'sustenta', ''), c_ferida or 'brisa', mundo)
    return {'segunda': segunda.isoformat(), 'evento': eid, 'tier': t, 'tier_base': base, 'ok': ok, 'n': n, 'efeitos': efeitos,
            'texto': desfecho, 'titulo': ev['titulo'], 'cena': cena_de(t)}


# ──────────────── abertura da semana corrente
def abrir_semana_atual():
    s = seg(HOJE)
    if E['semana_atual'] and E['semana_atual'].get('segunda') == s.isoformat(): return
    eid, ev = escolher_evento(s)
    amb = {'clima': clima_da_semana(s), 'lua': lua_na_semana(s)}
    E['semana_atual'] = {'segunda': s.isoformat(), 'evento': eid, 'ambiente': amb, 'etapa': E['etapa']}


def texto_abertura(sa):
    ev = evento_por_id(sa['evento'], sa.get('etapa', E['etapa']))
    amb = sentenca_ambiente(mundo, sa.get('ambiente'))
    if sa['evento'] == 'resgate' and E['crise']:
        c = E['crise']['companheiro']; ant = mundo['antagonistas'][E['crise']['antagonista']]
        ab = fmt(mundo['resgate']['abertura'], c, mundo, lugar=ant['lugar']); em = f'Trazer {mundo["companhia"][c]["nome"]} de volta antes de o prazo acabar.'
    else:
        ab = fmt(ev['abertura'], 'brisa', mundo, ambiente=amb); em = ev['em_jogo']
        if '{ambiente}' not in ev['abertura'] and amb: ab = amb + ' ' + ab
    return ev['titulo'], ab, em


# ──────────────── execução
semanas = [s for s in J.get('semanas', []) if D(s['segunda']) >= INICIO and 'missoes' in s]
for s in semanas:
    seg_d = D(s['segunda'])
    fechada = seg_d + dt.timedelta(days=6) < HOJE or (FECHAR_HOJE and seg_d == seg(HOJE) and HOJE.weekday() == 6)
    if not fechada or s['segunda'] in E['semanas']: continue
    if not E['semana_atual'] or E['semana_atual'].get('segunda') != s['segunda']:   # semana que ninguém abriu (primeira execução)
        eid, ev = escolher_evento(seg_d); E['semana_atual'] = {'segunda': s['segunda'], 'evento': eid, 'ambiente': {'clima': clima_da_semana(seg_d), 'lua': lua_na_semana(seg_d)}, 'etapa': E['etapa']}
    abertura = list(texto_abertura(E['semana_atual']))[1:]
    ambiente_sem = E['semana_atual'].get('ambiente')
    reg = resolver(seg_d, s)
    reg['abertura'] = abertura
    reg['ambiente'] = ambiente_sem
    E['semanas'][s['segunda']] = reg
    if reg['evento'] not in ('resgate',) and reg['tier'] != 'sem_dado': E['ultimo_evento'] = reg['evento']
    E['semana_atual'] = None

# chefe do arco: cai pela balança, nunca por semana
arco = arco_de()
if J.get('media_28d') is not None and J['media_28d'] <= arco['ate'] and E['arco'] == J.get('arco', {}).get('num') and arco is not ARCOS[-1]:
    prox = ARCOS[ARCOS.index(arco) + 1]
    E['marcos'].append({'em': HOJE.isoformat(), 'texto': f'{arco["chefe"]} caiu. A companhia atravessou o platô e viu, lá adiante, {prox["etapas"][0]}.'})
    E['arco'], E['etapa'] = prox['id'], 0

abrir_semana_atual()
arco = arco_de()


# ──────────────── projeção: como a semana corrente fecharia agora (nada é gravado)
def projetar():
    global E
    sa = E.get('semana_atual')
    if not sa: return None
    salvo = json.loads(json.dumps(E))
    try:
        reg = resolver(D(sa['segunda']), {'missoes': (J.get('capitulo') or {}).get('missoes', [])})
        reg['depois'] = {'etapa': E['etapa'], 'companhia': {k: v['estado'] for k, v in E['companhia'].items()},
                         'mochila': [i['id'] for i in E['mochila']], 'reliquias': [r['id'] for r in E['reliquias']],
                         'maldicoes': [m['id'] for m in E['maldicoes']], 'materiais': dict(E['materiais'])}
    finally:
        E = salvo
    return reg


PROJ = projetar()


# ──────────────── textos longos escritos a cada semana (historia/escritos/AAAA-MM-DD-premissa.md e -encerramento.md)
def ler_escrito(segunda_s, tipo):
    p = os.path.join(AQUI, 'historia', 'escritos', f'{segunda_s}-{tipo}.md')
    if not os.path.exists(p): return None
    txt = open(p, encoding='utf-8').read()
    meta = {}
    if txt.startswith('---'):
        cab, _, txt = txt[3:].partition('\n---')
        for linha in cab.strip().splitlines():
            if ':' in linha: k, _, v = linha.partition(':'); meta[k.strip()] = v.strip()
    return meta, txt.strip()


def texto_do_desfecho(segunda_s, tier):
    e = ler_escrito(segunda_s, 'encerramento')
    if not e: return None
    meta, txt = e
    partes = re.split(r'<!--\s*alternativa:\s*(\w+)\s*-->', txt)
    principal, alts = partes[0].strip(), {partes[i]: partes[i + 1].strip() for i in range(1, len(partes) - 1, 2)}
    if tier and tier != meta.get('desfecho_padrao', tier) and tier in alts:
        corte = principal.rfind('\n## ')
        principal = (principal[:corte] if corte > 0 else principal) + '\n\n' + alts[tier]
    palavras = len(re.findall(r'\w+', principal))
    return {'titulo': meta.get('titulo', ''), 'subtitulo': meta.get('subtitulo', ''), 'n': int(meta.get('capitulo', 0) or 0), 'simulacao': meta.get('simulacao') == 'sim',
            'nota': meta.get('nota', ''), 'texto': principal, 'minutos': max(1, round(palavras / 200)), 'tier': tier, 'outros_desfechos': sorted(alts)}


def premissa_de(segunda_s):
    e = ler_escrito(segunda_s, 'premissa')
    if not e: return None
    meta, txt = e
    palavras = len(re.findall(r'\w+', txt))
    return {'titulo': meta.get('titulo', ''), 'n': int(meta.get('capitulo', 0) or 0), 'semana': segunda_s, 'simulacao': meta.get('simulacao') == 'sim',
            'nota': meta.get('nota', ''), 'texto': txt, 'minutos': max(1, round(palavras / 200))}


ROTULO_EF = {'ferro': '+{n} lasca de ferro-estrela', 'rumo': '+{n} medida no mapa', 'pena': '+{n} pena de vento'}
DIAS_PT = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']


def diario_da_semana(segunda):
    dias = []
    for i in range(7):
        d = (segunda + dt.timedelta(days=i)).isoformat()
        evs = []
        for e in [x for x in EVD if x['data'] == d]:
            ef = e.get('efeito') or {}; marcas = []
            for k, f in ROTULO_EF.items():
                if ef.get(k): marcas.append(f.format(n=ef[k]))
            if ef.get('reliquia') in mundo.get('reliquias', {}): marcas.append('relíquia: ' + mundo['reliquias'][ef['reliquia']]['nome'])
            if ef.get('divida'): marcas.append('dívida com Mãe Tarsila' if ef.get('npc') == 'tarsila' else 'dívida')
            if ef.get('juramento'): marcas.append('juramento quebrado: o preço vem no fim da semana')
            if ef.get('abrigo'): marcas.append('abrigo')
            evs.append({'tipo': e['tipo'], 'texto': e['texto'], 'marcas': marcas})
        if evs: dias.append({'data': d, 'dia': DIAS_PT[i], 'eventos': evs})
    return dias


def biblia():
    p = os.path.join(AQUI, 'historia', 'biblia.md')
    if not os.path.exists(p): return []
    secs = re.split(r'\n## ', '\n' + open(p, encoding='utf-8').read().split('\n', 1)[1])
    return [{'titulo': x.split('\n', 1)[0].strip(), 'texto': x.split('\n', 1)[1].strip() if '\n' in x else ''} for x in secs if x.strip()]

# ──────────────── capítulos (arquivos do livro) e saída para o painel
def slug(t):
    t = unicodedata.normalize('NFKD', t.lower()).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')


capitulos = []
for segunda_s, reg in sorted(E['semanas'].items()):
    sd = D(segunda_s); n = (sd - INICIO).days // 7 + 1
    corpo = []
    longo = texto_do_desfecho(segunda_s, reg['tier'])
    if longo:
        corpo.append(longo['texto'])
    else:
        if reg.get('abertura'): corpo.append(reg['abertura'][0])
        corpo.append(reg['texto'])
    if reg.get('efeitos'): corpo.append(' '.join(reg['efeitos']))
    capitulos.append({'n': n, 'titulo': reg['titulo'], 'periodo': periodo(sd), 'fim': (sd + dt.timedelta(days=6)).isoformat(), 'tier': reg['tier'], 'ok': reg['ok'], 'total': reg['n'],
                      'abertura': (reg.get('abertura') or ['', ''])[0], 'em_jogo': (reg.get('abertura') or ['', ''])[1] if len(reg.get('abertura') or []) > 1 else '',
                      'desfecho': reg['texto'], 'efeitos': reg.get('efeitos', []), 'concluido': True, 'cena': reg.get('cena'), 'md': '\n\n'.join(corpo)})
sa = E['semana_atual']
semana_painel = None
if sa:
    titulo, ab, em = texto_abertura(sa); sd = D(sa['segunda']); n = (sd - INICIO).days // 7 + 1
    cap_j = J.get('capitulo') or {}
    semana_painel = {'n': n, 'segunda': sa['segunda'], 'titulo': titulo, 'periodo': periodo(sd), 'abertura': ab, 'em_jogo': em,
                     'ambiente': sa.get('ambiente'), 'ok': sum(m['cumprida'] for m in cap_j.get('missoes', [])), 'total': len(cap_j.get('missoes', []))}
    capitulos.append({'n': n, 'titulo': titulo, 'periodo': periodo(sd), 'tier': None, 'concluido': False, 'abertura': ab, 'em_jogo': em,
                      'desfecho': '', 'efeitos': [], 'md': ab + '\n\nEm jogo: ' + em + '\n\nO desfecho vem quando a semana fechar, e depende de como ela for.'})

livro_dir = os.path.join(AQUI, 'historia', 'livro')
if not DRY:
    os.makedirs(livro_dir, exist_ok=True)
    for f in os.listdir(livro_dir):   # capítulos gerados são refeitos a cada execução; o prólogo (00) é escrito à mão
        if re.match(r'^(0[1-9]|[1-9]\d)-.*\.md$', f): os.remove(os.path.join(livro_dir, f))
    for c in capitulos:
        marca = '' if c['concluido'] else ', em andamento'
        open(os.path.join(livro_dir, f'{c["n"]:02d}-{slug(c["titulo"])}.md'), 'w', encoding='utf-8').write(
            f'# Capítulo {c["n"]}: {c["titulo"]} ({c["periodo"]}{marca})\n{c["md"]}\n')

painel = {
    'gerado_em': dt.datetime.now().isoformat(timespec='seconds'),
    'arco': {'id': arco['id'], 'nome': arco['nome'], 'chefe': arco['chefe'], 'chefe_texto': arco.get('chefe_texto', '')},
    'etapa': E['etapa'], 'etapas': [{'nome': e, 'estado': 'feita' if i < E['etapa'] else ('atual' if i == E['etapa'] else 'futura')} for i, e in enumerate(arco['etapas'])],
    'companhia': [{'id': k, **{f: mundo['companhia'][k][f] for f in ('nome', 'papel', 'texto', 'g')}, 'estado': E['companhia'][k]['estado']} for k in mundo['companhia']],
    'guia': mundo['guia'], 'mochila': [{'id': i['id'], 'nome': mundo['itens'][i['id']]['nome'], 'texto': mundo['itens'][i['id']]['texto']} for i in E['mochila']],
    'regra_item': mundo['regra_item'],
    'crise': ({'companheiro': mundo['companhia'][E['crise']['companheiro']]['nome'], 'g': mundo['companhia'][E['crise']['companheiro']]['g'], 'onde': mundo['antagonistas'][E['crise']['antagonista']]['lugar'],
               'antagonista': mundo['antagonistas'][E['crise']['antagonista']]['nome'], 'prazo': E['crise']['prazo']} if E['crise'] else None),
    'semana': semana_painel, 'capitulos': [{k: v for k, v in c.items() if k != 'md'} for c in capitulos], 'marcos': E['marcos'],
    'reliquias': [{'id': r['id'], **mundo['reliquias'][r['id']], 'usada': bool(r.get('usada')), 'desde': r['desde']} for r in E['reliquias'] if r['id'] in mundo.get('reliquias', {})],
    'maldicoes': [{'id': m['id'], **mundo['maldicoes'][m['id']], 'desde': m['desde']} for m in E['maldicoes'] if m['id'] in mundo.get('maldicoes', {})],
    'materiais': {k: {'qtd': E['materiais'].get(k, 0), **v} for k, v in mundo.get('materiais', {}).items()},
    'dividas': E['dividas'],
    'fios': (ler('historia/fios.json', {}) or {}).get('fios', []),
    'biblia': biblia(),
}
if sa:
    sd_atual = D(sa['segunda'])
    painel['diario'] = diario_da_semana(sd_atual)
    painel['premissa_atual'] = premissa_de(sa['segunda'])
    painel['premissa_proxima'] = premissa_de((sd_atual + dt.timedelta(days=7)).isoformat())
    if PROJ:
        painel['projecao'] = {'tier': PROJ['tier'], 'ok': PROJ['ok'], 'n': PROJ['n'], 'efeitos': PROJ['efeitos'], 'cena': PROJ.get('cena'), 'depois': PROJ.get('depois'),
                              'falta_para_avanco': max(0, (PROJ['n'] - 1) - PROJ['ok'])}
        painel['encerramento'] = texto_do_desfecho(sa['segunda'], PROJ['tier'])
# a última semana fechada com texto longo (depois que a semana vira)
fechadas = [s_ for s_ in sorted(E['semanas']) if ler_escrito(s_, 'encerramento')]
if fechadas and not painel.get('encerramento'):
    painel['encerramento'] = texto_do_desfecho(fechadas[-1], E['semanas'][fechadas[-1]]['tier'])
gravar('historia/estado.json', E)
gravar('painel/data/historia.json', painel)
res = {c['n']: c['tier'] for c in capitulos if c['concluido']}
print(f'historia: arco {arco["id"]} etapa {E["etapa"]} ({arco["etapas"][E["etapa"]]}); companhia ' + ', '.join(f'{k}={v["estado"]}' for k, v in E['companhia'].items())
      + f'; mochila {len(E["mochila"])}; crise {"sim" if E["crise"] else "não"}; capítulos resolvidos {res}'
      + (' [dry]' if DRY else ''))
