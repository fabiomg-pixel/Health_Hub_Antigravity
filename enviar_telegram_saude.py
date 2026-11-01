#!/usr/bin/env python3
"""Envia a mensagem do copiloto pelo bot NOVO (@Silvester_TheTrainer_bot) para o chat do Fabio.

Uso:  printf '%s' "$MSG" | ./enviar_telegram_saude.py <brief|avaliacao|aviso|capitulo|campanha>
      ./enviar_telegram_saude.py --verificar     (só confere o bot e o chat; não envia nada)

Por que existe: as tarefas agendadas rodam em sessões próprias, cujo plugin do Telegram usa o bot ANTIGO.
Aqui o envio vai direto pela API do bot novo, o mesmo que conversa com o Fabio, e o texto enviado fica em
ultimo_envio.md: a passagem (passagem.sh) o mostra ao bot, para ele saber a que o Fabio está respondendo.
O token só é lido aqui dentro: não vai para argumentos de processo, saída nem log.
"""
import datetime, json, os, subprocess, sys, tempfile, time

BASE = os.path.expanduser('~/.claude/channels/telegram-saude')
AQUI = os.path.dirname(os.path.abspath(__file__))
TOKEN = None


def token():
    global TOKEN
    if TOKEN is None:
        TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip().strip('"\'') or None   # nuvem: segredo do ambiente, sem arquivo
    if TOKEN is None:
        try:
            for l in open(os.path.join(BASE, '.env'), encoding='utf-8'):
                if l.startswith('TELEGRAM_BOT_TOKEN='):
                    TOKEN = l.split('=', 1)[1].strip().strip('"\'')
        except OSError:
            pass
        if not TOKEN:
            sys.exit('ERRO: token do bot novo não encontrado (TELEGRAM_BOT_TOKEN no ambiente ou ' + BASE + '/.env)')
    return TOKEN


def chat():
    if os.environ.get('TELEGRAM_CHAT_ID', '').strip(): return os.environ['TELEGRAM_CHAT_ID'].strip()   # nuvem
    try:
        ids = json.load(open(os.path.join(BASE, 'access.json'), encoding='utf-8')).get('allowFrom') or []
    except (OSError, ValueError):
        ids = []
    if not ids:
        sys.exit('ERRO: nenhum chat autorizado (TELEGRAM_CHAT_ID no ambiente ou access.json; o Fabio o aprova com /telegram:access)')
    return str(ids[0])


def api(metodo, texto=None, chat_id=None):
    """Chama a API; a URL (com o token) vai pelo stdin do curl (-K -), nunca em argv."""
    cfg = 'url = "https://api.telegram.org/bot%s/%s"\n' % (token(), metodo)
    args = ['curl', '-s', '-m', '30', '-K', '-']
    tmp = None
    if chat_id is not None:
        args += ['--data-urlencode', 'chat_id=' + chat_id, '--data-urlencode', 'disable_web_page_preview=true']
    if texto is not None:
        tmp = tempfile.NamedTemporaryFile('w', delete=False, encoding='utf-8', suffix='.txt')
        os.chmod(tmp.name, 0o600); tmp.write(texto); tmp.close()
        args += ['--data-urlencode', 'text@' + tmp.name]
    try:
        r = subprocess.run(args, input=cfg, capture_output=True, text=True, timeout=45)
    finally:
        if tmp: os.unlink(tmp.name)
    saida = (r.stdout or '').replace(token(), '<token>')
    try:
        return json.loads(saida)
    except ValueError:
        sys.exit('ERRO: resposta inesperada da API do Telegram: ' + saida[:200])


def partes(texto, limite=3900):
    out, atual = [], ''
    for linha in texto.split('\n'):
        if len(atual) + len(linha) + 1 > limite and atual:
            out.append(atual.rstrip()); atual = ''
        atual += linha + '\n'
    if atual.strip(): out.append(atual.rstrip())
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    if sys.argv[1] == '--verificar':
        me = api('getMe')
        if not me.get('ok'):
            sys.exit('ERRO: getMe falhou: ' + str(me.get('description')))
        print('bot @%s ok; chat autorizado: %s' % (me['result']['username'], chat()))
        return
    tipo = sys.argv[1]
    texto = sys.stdin.read().strip()
    if not texto:
        sys.exit('ERRO: mensagem vazia')
    alvo, ids, usuario = chat(), [], None
    for p in partes(texto):
        for tentativa in range(3):   # o Telegram limita a taxa ("Too Many Requests: retry after N"): espera e repete
            r = api('sendMessage', texto=p, chat_id=alvo)
            espera = (r.get('parameters') or {}).get('retry_after')
            if r.get('ok') or not espera or tentativa == 2: break
            time.sleep(int(espera) + 1)
        if not r.get('ok'):
            sys.exit('ERRO: envio recusado: ' + str(r.get('description')))
        ids.append(r['result']['message_id']); usuario = (r['result'].get('from') or {}).get('username')
    agora = datetime.datetime.now().strftime('%d/%m %H:%M')
    # Os despachos da Campanha (despachos.py) vão para outro arquivo: o disparar_rotina.sh --verificar confere o
    # brief e a avaliação pelo cabeçalho de ultimo_envio.md, e um despacho depois deles faria a rotina ser repetida.
    arq = 'ultimo_despacho.md' if tipo == 'campanha' else 'ultimo_envio.md'
    # Carimbo FORA de Documents (31/10): o launchd não lê ~/Documents, então o disparar_rotina.sh --verificar nunca via o
    # envio e repetia toda rotina (26 reenvios e 0 confirmações). O carimbo mora ao lado do bot; a data de modificação é a prova.
    try:
        open(os.path.join(BASE, 'envio_' + tipo + '.stamp'), 'w').write(agora + '\n')
    except OSError:
        pass
    open(os.path.join(AQUI, arq), 'w', encoding='utf-8').write(
        '# Último envio do bot (%s) em %s\n\n%s\n' % (tipo, agora, texto[:3500]))
    # Modo Nuvem (01/11): quem recebe a resposta dele é a nuvem; ela só vê este envio (e o estado que a rotina gravou)
    # depois que o Mac manda ao GitHub. Em segundo plano, para não atrasar a rotina.
    try:
        subprocess.Popen(['/bin/bash', os.path.join(AQUI, 'nuvem', 'sincronizar.sh'), 'envio ' + tipo], cwd=AQUI,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    except OSError:
        pass
    print(json.dumps({'ok': True, 'bot': usuario, 'tipo': tipo, 'mensagens': ids, 'em': agora}, ensure_ascii=False))


if __name__ == '__main__':
    main()
