"""Código de acesso do painel para os scripts Python (31/10/2026). Lê PAINEL_KEY do .env e entrega os argumentos do curl
SEM pôr o código na linha de comando (que qualquer processo do Mac enxerga): um arquivo temporário 0600 com `header = ...`.
Uso: subprocess.run(['curl', ...] + painel_acesso.curl_args() + [url])"""
import atexit, os, stat, tempfile

_AQUI = os.path.dirname(os.path.abspath(__file__))
_CFG = None


def chave():
    try:
        for l in open(os.path.join(_AQUI, '.env'), encoding='utf-8'):
            if l.startswith('PAINEL_KEY='):
                return l.split('=', 1)[1].strip().strip('"\'')
    except OSError:
        pass
    return os.environ.get('PAINEL_KEY', '')


def curl_args():
    global _CFG
    k = chave()
    if not k:
        return []   # barreira ainda desligada ou .env sem a chave: segue sem cabeçalho
    if _CFG is None:
        fd, _CFG = tempfile.mkstemp(prefix='painel_', suffix='.cfg')
        os.fchmod(fd, stat.S_IRUSR | stat.S_IWUSR)
        os.write(fd, ('header = "x-painel-key: %s"\n' % k).encode()); os.close(fd)
        atexit.register(lambda: os.path.exists(_CFG) and os.unlink(_CFG))
    return ['-K', _CFG]
