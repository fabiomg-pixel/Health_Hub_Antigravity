#!/usr/bin/env python3
"""Despachos da Campanha: cada marco vira uma cena curta no Telegram, na hora (pedido do Fabio, 29/10/2026).

Marco = algo que o motor (historia.py) já decidiu: uma carta do dia (achado aos 2 itens, bênção aos 4, percalço no
dia fechado sem nada), um juramento quebrado (maldição), uma missão da semana cumprida, ou a mudança do desfecho
projetado da parte. O texto da cena vem do baralho da parte (`despacho`, foco num personagem); embaixo vai uma linha
fora da história dizendo qual marco a tirou e o que ele pesa. A história continua autônoma: a cena nunca conta o que
ele fez; só o rodapé diz.

Cada despacho fica em historia/despachos.json. No domingo, a rotina do capítulo integra todos ao encerramento e
escreve historia/escritos/<segunda>-marcos.json (onde cada um entrou na história), que o painel mostra.

Roda num laço (screen "despachos", ligado pelo iniciar_saude.command), a cada 15 min. Só envia das 7h às 23h; fora
disso, guarda para a próxima janela. Na primeira vez, só marca o que já existe como visto (não manda o passado).
Uso: ./despachos.py [--dry] [--sem-recalculo] [--agora]
"""
import datetime as dt, json, os, subprocess, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
DRY = '--dry' in sys.argv
AGORA = dt.datetime.now()
LEDGER = os.path.join(AQUI, 'historia', 'despachos.json')
TIER = {'triunfo': 'triunfo', 'avanco': 'avanço', 'sustenta': 'impasse', 'reves': 'revés', 'crise': 'crise'}
CARTA = {'bencao': 'bênção', 'achado': 'achado', 'percalco': 'percalço', 'maldicao': 'maldição', 'missao': 'missão cumprida'}


def ler(nome, padrao=None):
    try:
        return json.load(open(os.path.join(AQUI, nome), encoding='utf-8'))
    except (OSError, ValueError):
        return padrao


def rodar(*cmd):
    r = subprocess.run(cmd, cwd=AQUI, capture_output=True, text=True, timeout=180)
    if r.returncode: sys.exit(f'despachos: {cmd[1]} falhou: {(r.stderr or r.stdout)[-300:]}')


if '--sem-recalculo' not in sys.argv:
    rodar('python3', 'jornada.py')
    rodar('python3', 'historia.py')

H = ler('painel/data/historia.json') or {}
J = ler('painel/data/jornada.json') or {}
sem = H.get('semana') or {}
SEG = sem.get('segunda')
if not SEG: sys.exit(0)
P = ler(f'historia/partes/{SEG}.json', {}) or {}
L = ler('historia/despachos.json') or {'_nota': 'Despachos da Campanha enviados ao Telegram (despachos.py). Cada um é um marco; '
                                     'o encerramento de domingo conta onde cada um entrou na história.', 'despachos': [], 'projecao': {}}
vistos = {d['id'] for d in L['despachos']}
primeira = not L['despachos'] and not L['projecao']
proj = H.get('projecao') or {}
mat = (proj.get('depois') or {}).get('materiais') or {}


def itens(data): return (J.get('dias', {}).get(data) or {}).get('itens', [])


def peso(tipo, ev=None):
    if tipo == 'bencao': return f"+1 estilha do céu ({mat.get('estilha', 0)} de 5 para a Lâmina Estelar)"
    if tipo == 'achado': return f"+1 pista do Códice ({mat.get('pista', 0)} na estrada)"
    if tipo == 'percalco':
        n = mat.get('desgaste', 0)
        return f'desgaste ({n} nesta parte; com 2, alguém sai ferido no fechamento)'
    if tipo == 'maldicao': return 'juramento quebrado: o preço vem no fechamento da parte'
    return ''


novos = []
# 1. as cartas do diário de bordo (o dia em curso só mostra as cartas já garantidas)
for dia in H.get('diario', []):
    contagem = {}
    for ev in dia['eventos']:
        t = ev['tipo']; contagem[t] = contagem.get(t, 0) + 1
        did = f"{dia['data']}:{t}" + (f':{contagem[t]}' if contagem[t] > 1 else '')
        if did in vistos or t in ('quieto', 'missao'): continue   # missão já vem do passo 2 (o diário só a espelha)
        if t == 'maldicao': motivo = 'juramento quebrado' + (f" ({ev.get('juramento')})" if ev.get('juramento') else '')
        elif t == 'percalco': motivo = 'dia fechado sem nenhum item, com o relógio registrando'
        else:
            its = itens(dia['data']); motivo = f"{len(its)} itens no dia ({', '.join(its)})"
        novos.append({'id': did, 'data': dia['data'], 'tipo': t, 'carta': ev['texto'], 'cena': ev.get('despacho') or ev['texto'],
                      'marco': f'{motivo} → {CARTA[t]}', 'peso': peso(t, ev)})
# 2. as missões da semana cumpridas (uma carta da pilha "missao" por missão, na ordem em que se cumprem)
pilha = P.get('baralho', {}).get('missao') or []
ja = sum(1 for d in L['despachos'] if d['tipo'] == 'missao' and d['id'].startswith(f'missao:{SEG}:'))
for m in (J.get('capitulo') or {}).get('missoes', []):
    did = f"missao:{SEG}:{m['id']}"
    if not m.get('cumprida') or did in vistos: continue
    c = pilha[ja % len(pilha)] if pilha else {'texto': 'A companhia ganhou um dia de fôlego.'}; ja += 1
    novos.append({'id': did, 'data': AGORA.date().isoformat(), 'tipo': 'missao', 'carta': c['texto'], 'cena': c.get('despacho') or c['texto'],
                  'marco': f"missão da semana cumprida: {m['nome']} ({m['feito']} de {m['meta']})", 'peso': f"{sem.get('ok', 0)} de {sem.get('total', 0)} missões da parte"})
# 3. o desfecho projetado mudou?
t_novo, t_velho = proj.get('tier'), L['projecao'].get(SEG)
mudou = bool(t_novo and t_velho and t_novo != t_velho)

if primeira:
    for n in novos: n.update(enviado=None, visto_em=AGORA.isoformat(timespec='minutes'), linha_de_base=True)
    L['despachos'] += novos; L['projecao'][SEG] = t_novo
    if not DRY: json.dump(L, open(LEDGER, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'despachos: linha de base gravada ({len(novos)} marcos já existentes, nada enviado)'); sys.exit(0)

if not novos and not mudou:
    if t_novo and not t_velho and not DRY:
        L['projecao'][SEG] = t_novo; json.dump(L, open(LEDGER, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('despachos: nada novo'); sys.exit(0)
if not (7 <= AGORA.hour < 23) and '--agora' not in sys.argv:
    print(f'despachos: {len(novos)} marco(s) esperando a janela das 7h às 23h'); sys.exit(0)

# ── a mensagem: as cenas primeiro (história), depois o rodapé (fora da história)
cab = f"⟡ Campanha · Parte {sem.get('parte', '')}: {sem.get('titulo', '')}"
blocos = [n['cena'] for n in novos]
rod = [f"Marco: {n['marco']}" + (f" · {n['peso']}" if n['peso'] else '') for n in novos]
if mudou or t_novo:
    linha = f"Se a parte fechasse agora: {TIER.get(t_novo, t_novo)}"
    if mudou: linha += f" (antes: {TIER.get(t_velho, t_velho)})"
    ef = proj.get('efeitos') or []
    if ef: linha += '. ' + ' '.join(ef[:2])
    rod.append(linha)
    if mudou and (P.get('rumo') or {}).get(t_novo): blocos.append((P['rumo'])[t_novo])
msg = cab + '\n\n' + '\n\n'.join(blocos) + '\n\n—\n' + '\n'.join(rod) + '\nTudo isto entra na história do domingo. Painel: https://painel-xi-three.vercel.app/#campanha'
if DRY: print(msg); sys.exit(0)

r = subprocess.run([os.path.join(AQUI, 'enviar_telegram_saude.py'), 'campanha'], input=msg, cwd=AQUI, capture_output=True, text=True, timeout=120)
try: ok = json.loads(r.stdout.strip().splitlines()[-1]).get('ok')
except (ValueError, IndexError): ok = False
if not ok: sys.exit('despachos: envio falhou; tento de novo no próximo ciclo: ' + (r.stderr or r.stdout)[-200:])
for n in novos: n.update(enviado=AGORA.isoformat(timespec='minutes'))
L['despachos'] += novos; L['projecao'][SEG] = t_novo
json.dump(L, open(LEDGER, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# o painel também precisa do marco novo: a bênção e a Cinza viram palco no app (palco.js) quando ele abre
subprocess.Popen(['/bin/zsh', os.path.join(AQUI, 'publicar_jornada.sh')], cwd=AQUI, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
print(f'despachos: {len(novos)} enviado(s)' + (f'; desfecho {t_velho} → {t_novo}' if mudou else ''))
