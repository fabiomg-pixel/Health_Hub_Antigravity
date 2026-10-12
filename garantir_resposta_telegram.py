#!/usr/bin/env python3
"""Gancho Stop: impede o fim do turno de uma sessão do bot que recebeu uma mensagem do Telegram e
NÃO chamou a ferramenta reply (o texto escrito no terminal não chega ao Fabio).
Só lê o transcript; bloqueia no máximo uma vez por turno (stop_hook_active evita laço)."""
import json, re, sys

def main():
    try:
        dado = json.load(sys.stdin)
    except Exception:
        return
    if dado.get("stop_hook_active"):
        return
    caminho = dado.get("transcript_path")
    if not caminho:
        return
    try:
        linhas = [json.loads(l) for l in open(caminho, encoding="utf-8") if l.strip()]
    except Exception:
        return

    def texto_real(r):
        c = (r.get("message") or {}).get("content") if isinstance(r.get("message"), dict) else None
        if isinstance(c, str):
            return c
        if isinstance(c, list):
            return " ".join(x.get("text", "") for x in c if isinstance(x, dict) and x.get("type") == "text")
        return ""

    ultimo = None
    for i, r in enumerate(linhas):
        if r.get("type") == "user" and texto_real(r).strip():
            ultimo = i
    if ultimo is None:
        return
    msg = texto_real(linhas[ultimo])
    if '<channel source="plugin:telegram' not in msg:
        return
    for r in linhas[ultimo + 1:]:
        c = (r.get("message") or {}).get("content") if isinstance(r.get("message"), dict) else None
        if r.get("type") == "assistant" and isinstance(c, list):
            for x in c:
                if x.get("type") == "tool_use" and "telegram" in x.get("name", "") and x.get("name", "").endswith("reply"):
                    return
    m = re.search(r'chat_id="(\d+)"', msg)
    chat = m.group(1) if m else "o chat_id da tag <channel>"
    print(json.dumps({
        "decision": "block",
        "reason": ("Você escreveu a resposta no terminal, mas ela NÃO chegou ao Fabio: o Telegram só entrega o que "
                   "passa pela ferramenta mcp__plugin_telegram_telegram__reply. Envie agora, com chat_id=" + chat +
                   " e o texto da sua resposta. Se a ferramenta não estiver na sua lista, rode antes ToolSearch com "
                   "query select:mcp__plugin_telegram_telegram__reply. Não repita a análise: só envie.")
    }, ensure_ascii=False))

main()
