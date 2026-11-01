"""Gravação segura e trava de execução (31/10/2026, avaliação profunda). Antes, jornada.py, historia.py e despachos.py
gravavam direto no arquivo (queda de energia no meio zerava a Campanha) e rodavam ao mesmo tempo (laço de 15 min,
avaliação, brief, bot). Agora: gravar em temporário + os.replace; uma trava por nome; e JSON ilegível falha alto."""
import fcntl, json, os, sys, tempfile, time

AQUI = os.path.dirname(os.path.abspath(__file__))
_TRAVAS = []


def gravar_json(caminho, obj, indent=1):
    d = os.path.dirname(caminho) or '.'
    os.makedirs(d, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=d, prefix='.tmp_', suffix='.json')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(obj, f, ensure_ascii=False, indent=indent)
            f.flush(); os.fsync(f.fileno())
        os.replace(tmp, caminho)
    except BaseException:
        try: os.unlink(tmp)
        except OSError: pass
        raise


def ler_estrito(caminho, padrao=None):
    """Arquivo ausente = padrão. Arquivo que existe mas não é JSON válido = para tudo (nunca recomeça em silêncio)."""
    if not os.path.exists(caminho):
        return padrao
    try:
        return json.load(open(caminho, encoding='utf-8'))
    except ValueError as e:
        sys.exit(f'ERRO: {os.path.relpath(caminho, AQUI)} está ilegível ({e}). Nada foi alterado; corrija ou restaure do git (git checkout -- <arquivo>).')


def trava(nome, espera=180):
    """Uma execução por vez (por nome). Fica presa até o processo terminar."""
    f = open(os.path.join(AQUI, f'.trava_{nome}'), 'w')
    fim = time.time() + espera
    while True:
        try:
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB); _TRAVAS.append(f); return
        except OSError:
            if time.time() > fim:
                sys.exit(f'ERRO: outra execução ({nome}) segue rodando há mais de {espera} s; esta foi cancelada para não gravar por cima.')
            time.sleep(1)
