#!/usr/bin/env python3
"""Envia a mensagem do copiloto pelo bot NOVO (@Silvester_TheTrainer_bot) para o chat do Fabio.

Uso:  printf '%s' "$MSG" | ./enviar_telegram_saude.py <brief|avaliacao|aviso>
      ./enviar_telegram_saude.py --verificar     (só confere o bot e o chat; não envia nada)

Por que existe: as tarefas agendadas rodam em sessões próprias, cujo plugin do Telegram usa o bot ANTIGO.
Aqui o envio vai direto pela API do bot novo, o mesmo que conversa com o Fabio, e o texto enviado fica em
ultimo_envio.md: a passagem (passagem.sh) o mostra ao bot, para ele saber a que o Fabio está respondendo.
O token só é lido aqui dentro: não vai para argumentos de processo, saída nem log.
"""
import datetime, json, os, subprocess, sys, tempfile

BASE = os.path.expanduser('~/.claude/channels/telegram-saude')
AQUI = os.path.dirname(os.path.abspath(__file__))
TOKEN = None


def token():
    global TOKEN
    if TOKEN is None:
        try:
            for l in open(os.path.join(BASE, '.env'), encoding='utf-8'):
                if l.startswith('TELEGRAM_BOT_TOKEN='):
                    TOKEN = l.split('=', 1)[1].strip().strip('"\'')
        except OSError:
            pass
        if not TOKEN:
            sys.exit('ERRO: token do bot novo não encontrado em ' + BASE + '/.env')
    return TOKEN


def chat():
    try:
        ids = json.load(open(os.path.join(BASE, 'access.json'), encoding='utf-8')).get('allowFrom') or []
    except (OSError, ValueError):
        ids = []
    if not ids:
        sys.exit('ERRO: nenhum chat autorizado em access.json (o Fabio o aprova com /telegram:access)')
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
        r = api('sendMessage', texto=p, chat_id=alvo)
        if not r.get('ok'):
            sys.exit('ERRO: envio recusado: ' + str(r.get('description')))
        ids.append(r['result']['message_id']); usuario = (r['result'].get('from') or {}).get('username')
    agora = datetime.datetime.now().strftime('%d/%m %H:%M')
    open(os.path.join(AQUI, 'ultimo_envio.md'), 'w', encoding='utf-8').write(
        '# Último envio do bot (%s) em %s\n\n%s\n' % (tipo, agora, texto[:3500]))
    print(json.dumps({'ok': True, 'bot': usuario, 'tipo': tipo, 'mensagens': ids, 'em': agora}, ensure_ascii=False))


main()
