#!/usr/bin/env python3
"""Wrapper do passagem.sh para o contrato PreInvocation do Antigravity (.agents/hooks.json).
Roda apenas no primeiro passo de cada turno do usuário (invocationNum == 1) para injetar o estado atual do disco."""
import json
import os
import subprocess
import sys

def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}

    # Injeta apenas na primeira invocação do turno para não repetir a cada tool call
    inv_num = payload.get("invocationNum", 1)
    if inv_num and int(inv_num) > 1:
        print("{}")
        return

    here = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(here) if os.path.basename(here) == ".agents" else here
    script = os.path.join(root, "passagem.sh")

    try:
        r = subprocess.run(
            [script],
            cwd=root,
            input="",
            capture_output=True,
            text=True,
            timeout=8,
        )
        out = (r.stdout or "").strip()
    except Exception as e:
        out = f"(Erro ao rodar passagem.sh: {e})"

    if not out:
        print("{}")
        return

    print(json.dumps({
        "injectSteps": [
            {
                "ephemeralMessage": out
            }
        ]
    }, ensure_ascii=False))

if __name__ == "__main__":
    main()
