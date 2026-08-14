#!/usr/bin/env python3
"""Puxa peso e composição corporal da nuvem Renpho e imprime JSON no stdout.

    python3 renpho_pull.py --days 7 > renpho_out.json

Usa a lib não-oficial `renpho-api` (pip install renpho-api). Vem da NUVEM, então
independe do celular estar por perto — mesma lógica do Garmin.

Credenciais em .env (RENPHO_EMAIL / RENPHO_PASSWORD). Sem elas o script sai com
{"erro": ...} no stdout em vez de estourar, para o brief conseguir distinguir
"sem credencial" de "sem pesagem" e seguir com o resto da mensagem.
"""

import argparse
import datetime as dt
import json
import os
import sys

# A lib entrega chaves cruas da API; mapeamos para os nomes que o resto usa.
CAMPOS = {
    "weight": "peso_kg",
    "bodyfat": "gordura_pct",
    "muscle": "musculo_pct",
    "bodywater": "agua_pct",
    "bmi": "imc",
    "bmr": "tmb_kcal",
}


def log(msg):
    print(msg, file=sys.stderr)


def normalizar_data(m):
    """A API varia entre timestamp epoch e string — aceita os dois."""
    bruto = m.get("timeStamp") or m.get("time_stamp") or m.get("created_at")
    if bruto is None:
        return None
    try:
        if isinstance(bruto, (int, float)) or str(bruto).isdigit():
            return dt.datetime.fromtimestamp(int(bruto)).date().isoformat()
        return str(bruto)[:10]
    except (ValueError, OSError, OverflowError):
        return None


def normalizar(m):
    d = {"data": normalizar_data(m)}
    for origem, destino in CAMPOS.items():
        valor = m.get(origem)
        if isinstance(valor, (int, float)):
            d[destino] = round(float(valor), 2)
        else:
            d[destino] = None
    if d.get("peso_kg") and d.get("gordura_pct"):
        d["massa_magra_kg"] = round(d["peso_kg"] * (1 - d["gordura_pct"] / 100), 2)
    else:
        d["massa_magra_kg"] = None
    return d


def main():
    ap = argparse.ArgumentParser(description="Puxa peso/composição do Renpho")
    ap.add_argument("--days", type=int, default=7, help="janela de dias até hoje")
    args = ap.parse_args()

    try:
        from dotenv import load_dotenv

        load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
    except ImportError:
        pass

    saida = {"gerado_em": dt.datetime.now().isoformat(timespec="seconds"), "dias": []}

    email = os.environ.get("RENPHO_EMAIL")
    senha = os.environ.get("RENPHO_PASSWORD")
    if not (email and senha):
        saida["erro"] = (
            "RENPHO_EMAIL/RENPHO_PASSWORD ausentes do .env — "
            "sem credencial não dá para puxar peso"
        )
        log(saida["erro"])
        print(json.dumps(saida, ensure_ascii=False, indent=1))
        return 1

    try:
        from renpho.client import RenphoClient

        cliente = RenphoClient(email, senha)
        medidas = cliente.get_all_measurements() or []
        log(f"{len(medidas)} medições recebidas")
    except Exception as e:
        msg = f"{type(e).__name__}: {e}"
        log(f"falha ao puxar Renpho: {msg}")
        saida["erro"] = msg
        print(json.dumps(saida, ensure_ascii=False, indent=1))
        return 1

    corte = (dt.date.today() - dt.timedelta(days=args.days - 1)).isoformat()
    dias = [n for n in (normalizar(m) for m in medidas) if n["data"] and n["data"] >= corte]

    # Mais de uma pesagem no mesmo dia: fica a última.
    por_dia = {}
    for d in sorted(dias, key=lambda x: x["data"]):
        por_dia[d["data"]] = d
    saida["dias"] = list(por_dia.values())

    pesos = [d["peso_kg"] for d in saida["dias"] if d.get("peso_kg")]
    if pesos:
        saida["peso_mais_recente"] = saida["dias"][-1].get("peso_kg")
        saida["peso_media_janela"] = round(sum(pesos) / len(pesos), 2)

    print(json.dumps(saida, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
