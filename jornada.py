#!/usr/bin/env python3
"""Camada 0 da Campanha dos 85 (gamificação em RPG). Lê só dados reais e grava painel/data/jornada.json.

Regras: jornada_regras.json. Desenho: propostas/gamificacao_rpg.md (história) e propostas/gamificacao.md
(mecânica e evidência). Princípios que este arquivo garante:
- XP só por comportamento (sessão, dia ativo, pesagem, registro, descanso confirmado). O peso nunca dá XP.
- XP nunca diminui. Cada coisa conta uma vez por dia. Teto diário.
- Sem dado, sem XP e sem punição: o que falta aparece como "sem dado".
- Determinístico e recalculável do zero: rodar duas vezes dá o mesmo resultado.
"""
import collections
import datetime as dt
import glob
import json
import os
import re
import subprocess

import painel_acesso
import util_arq

AQUI = os.path.dirname(os.path.abspath(__file__))
API = 'https://painel-xi-three.vercel.app/api/registros?tudo=1'


def ler(nome, padrao):
    try:
        return json.load(open(os.path.join(AQUI, nome), encoding='utf-8'))
    except (OSError, ValueError):
        return padrao


def registros():
    try:
        r = subprocess.run(['curl', '-s', '-m', '60'] + painel_acesso.curl_args() + [API], capture_output=True, text=True, timeout=75)
        return json.loads(r.stdout).get('items', []), True
    except Exception:
        return [], False


util_arq.trava('campanha')
R = ler('jornada_regras.json', {})
XP = R['xp']
HOJE = dt.date.today()
D = lambda s: dt.date.fromisoformat(s[:10])
seg = lambda d: d - dt.timedelta(days=d.weekday())

G = {d['data']: d for d in ler('historico_garmin.json', {}).get('dias', [])}
PES = {p['data'][:10] for p in ler('historico_peso.json', {}).get('dias', [])}
SEMANA = util_arq.ler_estrito(os.path.join(AQUI, 'painel', 'data', 'semana.json'), {})   # JSON quebrado para tudo: antes sumia com o plano em silêncio
FATOS = ler('fatos.json', {})
DASH = ler('painel/data/dashboard.json', {})
EVENTOS = ler('jornada_eventos.json', {}).get('eventos', [])
ANTERIOR = ler('painel/data/jornada.json', {})
REG, REG_OK = registros()
if not REG_OK or not REG:
    raise SystemExit('jornada: a API de registros não respondeu; nada foi gravado (o XP não pode cair por falta de dado)')

RX_FORCA = re.compile(r'lower|upper|for[çc]a|muscula|academia|leg press|supino|costas|peito|full body|core|corpo inteiro|treino feito no painel', re.I)
RX_CORRIDA = re.compile(r'corrida|esteira|correr', re.I)
RX_JOGO = re.compile(r'futebol|campeonato|\bjogo\b', re.I)


RX_NEG = re.compile(r'n[ãa]o (treinou|treinei|fiz|fez|feito|rolou|deu|foi poss[íi]vel|completei|completou|consegui|completa|vou|fui)|pulei|pulou|n[ãa]o feit|cancel(ei|ou|ada|ado)|adiei|adiou|desisti|descans(ei|o hoje|ar hoje)|sem treino|fiquei em casa', re.I)
# anotações escritas pelo copiloto (não pelo Fabio): falam dele em 3ª pessoa, abrem com data, citam screenshot ou RPE.
# O marcador "[Processado em…]" é posto pelo copiloto em registros DO Fabio, então não marca autoria.
RX_COPILOTO = re.compile(r'\bF[áa]bio\b|copiloto|conselho de domingo|linha de base|^\s*\d{2}/\d{2}\b|screenshot|\bRPE\b', re.I)


def tipos_treino(texto):
    """Conjunto de tipos de um registro de treino (pode ser força e corrida juntas)."""
    t = (texto or '').split('#sets')[0]
    # Rodada bônus (Fabio, 31/10): força curta no dia de corrida ou corrida leve no dia de força. Pontuação extra,
    # fora das missões de força e de corrida (não conta como sessão nem como corrida).
    if re.search(r'rodada b[ôo]nus', t, re.I): return {'bonus'}
    tipos = set()
    if re.search(r'futebol|campeonato', t, re.I) or (re.search(r'\bjogo\b', t, re.I) and not re.search(r'v[ée]spera', t, re.I)): tipos.add('jogo')
    if RX_FORCA.search(t): tipos.add('forca')
    if re.search(r'lower', t, re.I): tipos.add('lower')
    if RX_CORRIDA.search(t): tipos.add('corrida')
    return tipos or {'outro'}


# ── o que cada dia teve, a partir dos registros (uma vez por dia por tipo)
por_dia = collections.defaultdict(set)
cargas = []   # (data, exercício, kg) das séries registradas no painel
for x in REG:
    d, tipo, txt = x.get('data'), x.get('tipo'), (x.get('texto') or '').strip()
    if not d: continue
    vazio = not txt and not x.get('foto')
    do_copiloto = bool(RX_COPILOTO.search(txt))
    negado = bool(RX_NEG.search(txt.split('#sets')[0]))
    if tipo == 'Treino' and not vazio and not negado:
        por_dia[d].add('treino'); por_dia[d].update(tipos_treino(txt))
        m = re.search(r'#sets (\{.*\})\s*$', txt)
        if m:
            try:
                for e in json.loads(m.group(1)).get('ex', []):
                    for s in e.get('s', []):
                        if len(s) >= 2 and isinstance(s[0], (int, float)): cargas.append((d, (e.get('o') or e.get('i') or ''), s[0]))
            except ValueError:
                pass
    elif tipo == 'Observação' and not do_copiloto and not negado and re.search(r'corrida guiada', txt, re.I) and re.search(r'\bcompleta\b', txt, re.I) and not re.search(r'incomplet', txt, re.I):
        por_dia[d].add('treino'); por_dia[d].add('corrida')
    elif tipo == 'Refeição' and not vazio:
        ref = (x.get('refeicao') or '')
        if ref == 'Almoço': por_dia[d].add('almoco')
        if ref == 'Lanche': por_dia[d].add('lanche')
    if not vazio and not do_copiloto: por_dia[d].add('registro')   # o livro de bordo conta só o que ele registrou
for e in EVENTOS:
    if e.get('tipo') == 'estalagem' and e.get('confirmado_em'): por_dia[e['data']].add('estalagem')
REG_DESDE = min((x['data'] for x in REG if x.get('data')), default=None)


def ativo(d):
    """True / False / None (sem dado do relógio e sem treino registrado)."""
    s = d.isoformat()
    if 'treino' in por_dia[s]: return True
    g = G.get(s)
    if g is None or g.get('kcal_ativas') is None: return None
    return g['kcal_ativas'] >= R['dia_ativo_kcal']


def xp_do_dia(d):
    s, itens = d.isoformat(), []
    f = por_dia[s]
    if 'forca' in f: itens.append(('Sessão de força', XP['forca']))
    if 'corrida' in f: itens.append(('Corrida', XP['corrida']))
    if ativo(d): itens.append(('Dia ativo', XP['dia_ativo']))
    if 'bonus' in f and f & {'forca', 'corrida'}: itens.append(('Rodada bônus', XP.get('bonus', 50)))   # só vale junto da sessão principal
    if 'estalagem' in f: itens.append(('Descanso na estalagem', XP['estalagem']))   # o mesmo nome que o historia.py lê
    if s in PES: itens.append(('Pesagem', XP['pesagem']))
    if 'almoco' in f: itens.append(('Almoço registrado', XP['almoco']))
    if 'lanche' in f: itens.append(('Lanche registrado', XP['lanche']))
    total = min(sum(v for _, v in itens), XP['teto_diario'])
    return total, itens


# ── plano da semana atual (só ela tem plano escrito em semana.json)
def iso_ddmm(ddmm):
    dd, mm = ddmm.split('/')
    cand = [dt.date(HOJE.year + k, int(mm), int(dd)) for k in (-1, 0, 1)]
    return min(cand, key=lambda c: abs((c - HOJE).days))


def tipo_plano(dia):
    foco = ((dia.get('treino') or {}).get('foco') or '')
    if re.match(r'a definir', foco, re.I): return 'definir'
    if dia.get('tipo') == 'futebol' or RX_JOGO.search(foco): return 'jogo'
    if re.search(r'recupera|descanso|descompress', foco, re.I): return 'descanso'
    if re.search(r'lower|upper|costas|for[çc]a|academia|ombro|corpo inteiro', foco, re.I): return 'forca'
    if re.search(r'corrida|esteira|\bkm\b', foco, re.I): return 'corrida'
    return 'forca' if dia.get('tipo') == 'treino' else 'leve'


PLANO = {}
# semanas anteriores arquivadas (a semana.json é substituída no domingo à noite, antes de a semana velha acabar)
for arq in sorted(glob.glob(os.path.join(AQUI, 'historico_semanas', '*.json'))):
    try:
        ini = dt.date.fromisoformat(os.path.basename(arq)[:10])
        for x in json.load(open(arq, encoding='utf-8')).get('dias', []):
            dd, mm = x['data'].split('/')
            PLANO[dt.date(ini.year, int(mm), int(dd)).isoformat()] = x
    except (OSError, ValueError, KeyError):
        pass
PLANO.update({iso_ddmm(x['data']).isoformat(): x for x in SEMANA.get('dias', [])})

# ── semanas: missões, capítulos, resgate, saga
inicio = D(R['inicio_campanha'])
semanas, w = [], seg(inicio)
while w <= seg(HOJE):
    semanas.append(w); w += dt.timedelta(days=7)

M = R['missoes']
resultado, sem_cap_seguidas = [], 0
hist_ativos = []
for w in semanas:
    dias = [w + dt.timedelta(days=i) for i in range(7)]
    passados = [d for d in dias if d <= HOJE]
    atual = w == seg(HOJE)
    n_ativos = sum(1 for d in passados if ativo(d) or 'estalagem' in por_dia[d.isoformat()])
    janela = hist_ativos[-M['ativos_janela_semanas']:]
    meta_at = 4 if not janela else min(M['ativos_max'], max(M['ativos_min'], round(sum(janela) / len(janela)) + 1))
    novo_arco = sem_cap_seguidas >= R['novo_arco_apos_semanas_sem_capitulo']
    if novo_arco: meta_at = M['ativos_min']
    missoes = [{'id': 'ativos', 'nome': 'Dias ativos', 'feito': n_ativos, 'meta': meta_at},
               {'id': 'pesagens', 'nome': 'Pesagens em jejum', 'feito': sum(1 for d in passados if d.isoformat() in PES), 'meta': M['pesagens']}]
    forcas_plano = [d for d in dias if PLANO.get(d.isoformat()) and tipo_plano(PLANO[d.isoformat()]) == 'forca']
    if forcas_plano:
        missoes.append({'id': 'forcas', 'nome': 'Sessões de força do plano', 'feito': sum(1 for d in passados if 'forca' in por_dia[d.isoformat()]), 'meta': min(3, len(forcas_plano))})   # Fabio, 31/10: meta fixa em 3 (nível de base); fim de semana complementa, não aumenta a meta
    if REG_DESDE and w >= seg(D(REG_DESDE)):
        missoes.append({'id': 'almocos', 'nome': 'Almoços registrados (seg a sex)', 'feito': sum(1 for d in passados if d.weekday() < 5 and 'almoco' in por_dia[d.isoformat()]), 'meta': M['almocos_uteis']})
        missoes.append({'id': 'lanches', 'nome': 'Lanches da tarde registrados', 'feito': sum(1 for d in passados if 'lanche' in por_dia[d.isoformat()]), 'meta': M['lanches']})
    for m in missoes: m['cumprida'] = m['feito'] >= m['meta']
    n, ok = len(missoes), sum(m['cumprida'] for m in missoes)
    concluido = ok >= (n - 1 if n >= 3 else n)
    status = 'concluido' if concluido else ('em_andamento' if atual else 'nao_concluido')
    xp_sem = XP['missao_semana'] * ok + (XP['capitulo'] if concluido else 0)
    resultado.append({'segunda': w.isoformat(), 'janela_ativos': list(janela), 'missoes': missoes, 'cumpridas': ok, 'status': status,
                      'novo_arco': novo_arco, 'xp_semana': xp_sem, 'ativos_por_dia': {d.isoformat(): ativo(d) for d in passados}})
    if not atual:
        hist_ativos.append(n_ativos)
        sem_cap_seguidas = 0 if concluido else sem_cap_seguidas + 1

# resgate e saga
RG = R['resgate']; ultimo_resgate = None; saga = 0; sagas = []
for i, s in enumerate(resultado):
    if s['status'] == 'concluido':
        saga += 1; continue
    if s['status'] == 'em_andamento':
        break
    prox = resultado[i + 1] if i + 1 < len(resultado) else None
    bloco = False
    if prox:
        seq = [v for _, v in sorted(prox['ativos_por_dia'].items())]
        bloco = any(sum(1 for v in seq[k:k + RG['em_dias_corridos']] if v) >= RG['dias_ativos'] for k in range(len(seq)))
    pode = ultimo_resgate is None or i - ultimo_resgate >= RG['uma_vez_a_cada_semanas']
    if saga == 0:   # resgate protege uma saga existente; sem saga não há o que resgatar
        continue
    if prox and prox['status'] == 'concluido' and bloco and pode:
        s['status'] = 'resgatado'; ultimo_resgate = i
    elif prox and prox['status'] == 'em_andamento' and pode:
        s['status'] = 'resgate_possivel'
    else:
        if saga: sagas.append({'ate': s['segunda'], 'capitulos': saga})
        saga = 0

# ── XP, nível, título
xp_total, xp_por_dia = 0, {}
d = inicio
while d <= HOJE:
    t, itens = xp_do_dia(d)
    # a API de registros devolve só os últimos ~100 itens: o dia mais antigo da janela vem incompleto.
    # O XP nunca diminui: vale o maior entre o que já foi gravado e o recalculado.
    ant = (ANTERIOR.get('xp_por_dia') or {}).get(d.isoformat()) or 0
    if ant > t:
        t, itens = ant, [('XP já gravado', ant)]
    xp_por_dia[d.isoformat()] = {'xp': t, 'itens': itens}
    xp_total += t; d += dt.timedelta(days=1)
xp_total += sum(s['xp_semana'] for s in resultado)
nv, falta, base = 1, R['nivel']['primeiro'], 0
while xp_total >= base + falta:
    base += falta; nv += 1; falta = R['nivel']['primeiro'] + R['nivel']['incremento'] * (nv - 1)
titulos = R['titulos']

# ── hoje: só o que está programado (regra da aba Hoje)
hoje_s = HOJE.isoformat(); dia_plano = PLANO.get(hoje_s); f_hoje = por_dia[hoje_s]
missoes_hoje = []
rc = FATOS.get('recuperacao') or {}
ferido = rc.get('banda_hoje') == 'r' and rc.get('indice_hoje_confiavel', True)
if dia_plano:
    tp, foco = tipo_plano(dia_plano), ((dia_plano.get('treino') or {}).get('foco') or '')
    if tp == 'forca': missoes_hoje.append({'nome': 'Sessão de força: ' + foco.split(' — ')[0], 'xp': XP['forca'], 'feito': 'forca' in f_hoje})
    elif tp == 'corrida': missoes_hoje.append({'nome': 'Corrida: ' + foco.split(' — ')[0], 'xp': XP['corrida'], 'feito': 'corrida' in f_hoje})
    elif tp == 'jogo': missoes_hoje.append({'nome': foco.split(' — ')[0] + ' (conta como dia ativo)', 'xp': 0, 'feito': 'jogo' in f_hoje})
    a = ativo(HOJE)
    missoes_hoje.append({'nome': 'Dia ativo', 'xp': XP['dia_ativo'], 'feito': a, 'sem_dado': a is None})
    missoes_hoje.append({'nome': 'Pesagem em jejum', 'xp': XP['pesagem'], 'feito': hoje_s in PES})
    if (dia_plano.get('refeicoes') or {}).get('almoco'): missoes_hoje.append({'nome': 'Registrar o almoço', 'xp': XP['almoco'], 'feito': 'almoco' in f_hoje})
    missoes_hoje.append({'nome': 'Registrar o lanche da tarde', 'xp': XP['lanche'], 'feito': 'lanche' in f_hoje})
    if ferido or 'estalagem' in f_hoje:
        missoes_hoje.append({'nome': 'Estalagem: descansar conta como cumprido (o Silvester confirma com você)', 'xp': XP['estalagem'], 'feito': 'estalagem' in f_hoje, 'estalagem': True})

# ── atributos, chefe, missão paralela
m28 = (FATOS.get('peso') or {}).get('media_28d_neutras')
arco = None
if m28 is not None:
    for a in R['arcos']:
        if m28 > a['ate']:
            arco = dict(a); arco['hp'] = round(max(0.0, min(1.0, (m28 - a['ate']) / (a['de'] - a['ate']))), 3); break
    if arco is None: arco = {'num': 'fim', 'nome': 'Campanha concluída', 'chefe': None, 'hp': 0}
V = DASH.get('vo2max') or {}; vo2 = V.get('referencia_nivel_do_mar')
pr = R['paralela']
paralela = {'nome': pr['nome'], 'valor': vo2, 'de': pr['de'], 'ate': pr['ate'],
            'progresso': round(max(0.0, min(1.0, ((vo2 or pr['de']) - pr['de']) / (pr['ate'] - pr['de']))), 3),
            'nota': 'só leitura ao nível do mar conta; a última em altitude (%s) não entra' % ((V.get('ultimo') or {}).get('altitude') or '—')}
oito = [s for s in resultado if s['status'] != 'em_andamento'][-8:]
const = sum(1 for s in oito if s['status'] in ('concluido', 'resgatado'))
desde8 = (HOJE - dt.timedelta(days=56)).isoformat()
forcas8 = sum(1 for k, v in por_dia.items() if k >= desde8 and 'forca' in v)
leg = [kg for (dd, ex, kg) in cargas if 'leg' in ex.lower() or 'presa' in ex.lower()]
atributos = [
    {'nome': 'Fôlego', 'valor': vo2, 'unidade': 'VO₂ máx', 'nota': 'meta 46 a 47, ao nível do mar'},
    {'nome': 'Força', 'valor': forcas8, 'unidade': 'sessões em 8 semanas', 'nota': ('maior leg press registrado: %d kg' % max(leg)) if leg else 'cargas ainda sem registro'},
    {'nome': 'Constância', 'valor': const, 'unidade': 'de %d capítulos' % len(oito), 'nota': 'capítulos concluídos nas últimas 8 semanas'},
]
vitalidade = {'indice': rc.get('indice_hoje'), 'banda': rc.get('banda_hoje'), 'confiavel': rc.get('indice_hoje_confiavel'),
              'sono_h': rc.get('sono_ultima_noite_h'), 'estado': 'ferido' if ferido else ('sem dado' if rc.get('indice_hoje') is None else 'de pé')}

# ── relíquias (deduzidas do histórico; as trancadas mostram o caminho)
def primeira(cond):
    for k in sorted(por_dia):
        if cond(k, por_dia[k]): return k
    return None


rel = []
saga_max = max([x['capitulos'] for x in sagas] + [saga])
verao = None
run = 0
for s in resultado:
    run = run + 1 if s['status'] == 'concluido' else 0
    if run >= 5 and not verao: verao = (D(s['segunda']) + dt.timedelta(days=6)).isoformat()
rel.append({'id': 'verao', 'nome': 'Os Cinco Capítulos do Verão', 'texto': 'Cinco capítulos seguidos concluídos.', 'em': verao})
semana5 = None
for s in resultado:
    at = [k for k, v in sorted(s['ativos_por_dia'].items()) if v]
    if len(at) >= 5: semana5 = at[4]; break
rel.append({'id': 'cinco', 'nome': 'A Semana dos Cinco', 'texto': 'Cinco dias ativos numa mesma semana.', 'em': semana5})
rel.append({'id': 'retorno', 'nome': 'O Primeiro Passo do Retorno', 'texto': 'O primeiro Lower depois do congresso.', 'em': primeira(lambda k, v: k >= '2026-10-12' and 'lower' in v)})
rel.append({'id': 'corrida', 'nome': 'A Corrida Inteira', 'texto': 'Uma corrida guiada completa, do começo ao fim.', 'em': primeira(lambda k, v: 'corrida' in v and k >= '2026-10-11')})
c150 = sorted(dd for (dd, ex, kg) in cargas if ('leg' in ex.lower() or 'presa' in ex.lower()) and kg >= 150)
rel.append({'id': 'cento50', 'nome': 'Cento e Cinquenta', 'texto': 'Leg press com 150 kg registrado.', 'em': c150[0] if c150 else None})
dias_reg = sorted(k for k, v in por_dia.items() if 'registro' in v)
rel.append({'id': 'livro', 'nome': 'O Livro de Bordo', 'texto': '30 dias com algum registro.', 'em': dias_reg[29] if len(dias_reg) >= 30 else None})
rel.append({'id': 'estalagem', 'nome': 'A Estalagem Honrada', 'texto': 'Descansar quando o corpo pediu, e contar isso como vitória.', 'em': primeira(lambda k, v: 'estalagem' in v)})
pos_retorno = [s for s in resultado if s['segunda'] >= R['inicio_livro']]
run, saga4 = 0, None
for s in pos_retorno:
    run = run + 1 if s['status'] in ('concluido', 'resgatado') else 0
    if run >= 4 and not saga4: saga4 = (D(s['segunda']) + dt.timedelta(days=6)).isoformat()
rel.append({'id': 'saga4', 'nome': 'A Saga de Quatro', 'texto': 'Quatro capítulos seguidos depois do retorno.', 'em': saga4})
rel.append({'id': 'guardiao', 'nome': 'O Colosso Derrotado', 'texto': 'A média de 28 dias abaixo de 92,5 kg.', 'em': None if (m28 is None or m28 > 92.5) else hoje_s})
rel.append({'id': 'folego', 'nome': 'O Fôlego do Dragão', 'texto': 'VO₂ máx de 46 ao nível do mar.', 'em': hoje_s if (vo2 or 0) >= 46 else None})
rel.append({'id': 'mestre', 'nome': 'Mestre dos 85', 'texto': 'A média de 28 dias em 85 kg.', 'em': None if (m28 is None or m28 > 85) else hoje_s})

# ── o livro (prólogo e crônicas escritas)
livro = []
for p in sorted(glob.glob(os.path.join(AQUI, 'historia', 'livro', '*.md'))):
    txt = open(p, encoding='utf-8').read().strip().split('\n')
    livro.append({'arquivo': os.path.basename(p), 'titulo': txt[0].lstrip('# ').strip(), 'texto': '\n'.join(txt[1:]).strip()})

atual = resultado[-1] if resultado else None
n_cap = ((seg(HOJE) - D(R['inicio_livro'])).days // 7) + 1
out = {
    'gerado_em': dt.datetime.now().isoformat(timespec='seconds'),
    'fontes': {'registros_ok': REG_OK, 'registros_desde': REG_DESDE, 'garmin_ate': max(G) if G else None},
    'personagem': {'nome': 'Fabio', 'classe': 'Pesquisador de Campo', 'nivel': nv, 'titulo': titulos[min(nv, len(titulos)) - 1],
                   'xp_total': xp_total, 'xp_no_nivel': xp_total - base, 'xp_para_proximo': falta},
    'vitalidade': vitalidade, 'atributos': atributos,
    'capitulo': {'numero': n_cap, 'segunda': atual['segunda'] if atual else None, 'status': atual['status'] if atual else None,
                 'missoes': atual['missoes'] if atual else [], 'novo_arco': atual['novo_arco'] if atual else False, 'xp_semana': atual['xp_semana'] if atual else 0},
    'saga': {'atual': saga, 'maior': saga_max, 'historico': sagas},
    'hoje': {'data': hoje_s, 'xp': xp_por_dia.get(hoje_s, {}).get('xp', 0), 'missoes': missoes_hoje, 'ferido': ferido},
    'arco': arco, 'media_28d': m28, 'paralela': paralela,
    'reliquias': rel, 'semanas': [{k: s[k] for k in ('segunda', 'status', 'cumpridas', 'xp_semana', 'novo_arco')} | {'n': len(s['missoes']), 'missoes': s['missoes']} for s in resultado],
    'xp_por_dia': {k: v['xp'] for k, v in xp_por_dia.items()},
    # os últimos 21 dias em detalhe, para o diário de bordo da aventura (historia.py)
    'dias': {k: {'xp': v['xp'], 'itens': [i[0] for i in v['itens']], 'marcas': sorted(por_dia[k]), 'ativo': ativo(D(k))}
             for k, v in xp_por_dia.items() if D(k) >= HOJE - dt.timedelta(days=20)},
    'livro': livro,
}
os.makedirs(os.path.join(AQUI, 'painel', 'data'), exist_ok=True)
util_arq.gravar_json(os.path.join(AQUI, 'painel', 'data', 'jornada.json'), out)
print('jornada: nível %d (%s), %d XP; capítulo %d %s; saga %d (maior %d); arco %s, chefe %s HP %s' % (
    nv, out['personagem']['titulo'], xp_total, n_cap, out['capitulo']['status'], saga, saga_max,
    arco and arco.get('num'), arco and arco.get('chefe'), arco and arco.get('hp')))
