#!/usr/bin/env python3
"""Gera painel/data/dashboard.json — a aba 📈 Evolução do painel.

    python3 dashboard.py

Lê o histórico do Garmin, acumula as pesagens em historico_peso.json (o renpho_out.json
só guarda a janela do último pull) e cruza com as metas de metas.json.

Duas regras do projeto valem aqui também:
  * peso é lido pela MÉDIA DAS LEITURAS NEUTRAS — manhã seguinte a jogo vem ~0,26 kg
    abaixo do real e não entra na média;
  * VO2max medido em altitude não é tendência (07 e 08/10/2026, Curitiba, 930 m).
"""

import datetime as dt
import json
import os
import statistics as st
import sys

import fatos  # reaproveita a detecção de jogo sem relógio

AQUI = os.path.dirname(os.path.abspath(__file__))
# Corridas com GPS fora do nível do mar: a estimativa de VO2max desaba sem que a
# aptidão tenha mudado. Acrescente aqui toda viagem a cidade alta.
ALTITUDE = {"2026-10-07": "Curitiba, 930 m", "2026-10-08": "Curitiba, 930 m"}


def carregar(nome, padrao):
    try:
        with open(os.path.join(AQUI, nome), encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return padrao


def media(v, casas=2):
    v = [x for x in v if x is not None]
    return round(st.mean(v), casas) if v else None


def acumular_peso():
    """historico_peso.json = toda pesagem já vista. Sem isso o gráfico encolhe
    para a janela do último pull do Renpho."""
    hist = {d["data"]: d for d in carregar("historico_peso.json", {"dias": []}).get("dias", [])}
    for d in carregar("renpho_out.json", {}).get("dias", []) or []:
        if d.get("data") and d.get("peso_kg"):
            hist[d["data"]] = {"data": d["data"], "peso_kg": d["peso_kg"],
                               "gordura_pct": d.get("gordura_pct")}
    dias = [hist[k] for k in sorted(hist)]
    with open(os.path.join(AQUI, "historico_peso.json"), "w", encoding="utf-8") as f:
        json.dump({"dias": dias}, f, ensure_ascii=False, indent=1)
    return dias


def serie_peso(pesagens, garmin, regs, resumo):
    ativas = {d["data"]: d.get("kcal_ativas") for d in garmin}
    jogos = fatos.dias_de_jogo(regs) | fatos.jogos_planejados(resumo)
    pontos = []
    for p in pesagens:
        vespera = (dt.date.fromisoformat(p["data"]) - dt.timedelta(days=1)).isoformat()
        k = ativas.get(vespera)
        pos = (k is not None and k >= fatos.LIMIAR_DIA_INTENSO) or vespera in jogos
        pontos.append({"data": p["data"], "peso": p["peso_kg"], "pos_esforco": pos})
    neutras = []
    for p in pontos:
        if not p["pos_esforco"]:
            neutras.append(p["peso"])
        p["media"] = round(st.mean(neutras[-7:]), 2) if len(neutras) >= 3 else None
    return pontos


def tendencia_kg_semana(pontos, dias=28):
    """Inclinação por mínimos quadrados da média neutra nos últimos `dias`."""
    corte = (dt.date.today() - dt.timedelta(days=dias)).isoformat()
    xy = [(dt.date.fromisoformat(p["data"]).toordinal(), p["media"])
          for p in pontos if p["data"] >= corte and p["media"] is not None]
    if len(xy) < 4:
        return None
    mx, my = st.mean(x for x, _ in xy), st.mean(y for _, y in xy)
    den = sum((x - mx) ** 2 for x, _ in xy)
    return round(sum((x - mx) * (y - my) for x, y in xy) / den * 7, 2) if den else None


def rolante(garmin, campo, janela=7, casas=1):
    saida, buf = [], []
    for d in garmin:
        buf.append(d.get(campo))
        buf = buf[-janela:]
        validos = [x for x in buf if x is not None]
        if len(validos) >= 4:
            saida.append({"data": d["data"], "valor": round(st.mean(validos), casas)})
    return saida


def dias_ativos_por_semana(garmin, semanas=14):
    por = {}
    for d in garmin:
        data = dt.date.fromisoformat(d["data"])
        seg = data - dt.timedelta(days=data.weekday())
        e = por.setdefault(seg.isoformat(), {"ativos": 0, "pesados": 0, "com_dado": 0})
        k = d.get("kcal_ativas")
        if k is None:
            continue
        e["com_dado"] += 1
        e["ativos"] += k >= 300
        e["pesados"] += k >= 600
    chaves = sorted(por)[-semanas:]
    return [{"semana": k, **por[k]} for k in chaves]


def main():
    metas = carregar("metas.json", {})
    h = carregar("historico_garmin.json", [])
    garmin = sorted(h.get("dias", h) if isinstance(h, dict) else h, key=lambda x: x["data"])
    r = carregar("resumo_diario.json", [])
    resumo = r.get("dias", r) if isinstance(r, dict) else r
    regs = fatos.registros()

    pontos = serie_peso(acumular_peso(), garmin, regs, resumo)
    atual = next((p["media"] for p in reversed(pontos) if p["media"] is not None), None)
    partida = (metas.get("partida") or {}).get("peso_kg")
    alvo = metas.get("peso_alvo_kg")
    ritmo = tendencia_kg_semana(pontos)

    progresso = None
    if None not in (atual, partida, alvo) and partida != alvo:
        progresso = round(max(0.0, min(1.0, (partida - atual) / (partida - alvo))), 3)

    saudavel = metas.get("ritmo_saudavel_kg_semana") or 0.5
    eta_no_ritmo, eta_saudavel = None, None
    if None not in (atual, alvo):
        falta = atual - alvo
        if ritmo is not None and ritmo < -0.05:
            eta_no_ritmo = (dt.date.today() + dt.timedelta(weeks=falta / -ritmo)).isoformat()
        eta_saudavel = (dt.date.today() + dt.timedelta(weeks=falta / saudavel)).isoformat()

    vo2 = [{"data": d["data"], "valor": d["vo2max"], "altitude": ALTITUDE.get(d["data"])}
           for d in garmin if d.get("vo2max")]
    ao_nivel_do_mar = [p for p in vo2 if not p["altitude"]]
    vo2_ref = ao_nivel_do_mar[-1]["valor"] if ao_nivel_do_mar else None
    faixa = metas.get("vo2max_alvo") or [None, None]
    vo2_partida = (metas.get("partida") or {}).get("vo2max")
    vo2_prog = None
    if None not in (vo2_ref, vo2_partida, faixa[0]) and faixa[0] != vo2_partida:
        vo2_prog = round(max(0.0, min(1.0, (vo2_ref - vo2_partida) / (faixa[0] - vo2_partida))), 3)
    # VO2max é por quilo: mesma capacidade absoluta num corpo mais leve já sobe o número.
    so_pelo_peso = round(vo2_ref * atual / alvo, 1) if None not in (vo2_ref, atual, alvo) else None

    saida = {
        "gerado_em": dt.datetime.now().isoformat(timespec="seconds"),
        "metas": metas,
        "peso": {"atual_media_neutra": atual, "partida": partida, "alvo": alvo,
                 "progresso": progresso, "ritmo_kg_semana_28d": ritmo,
                 "eta_no_ritmo_atual": eta_no_ritmo, "eta_ritmo_saudavel": eta_saudavel,
                 "ritmo_saudavel": saudavel, "serie": pontos[-120:]},
        "vo2max": {"referencia_nivel_do_mar": vo2_ref, "ultimo": vo2[-1] if vo2 else None,
                   "partida": vo2_partida, "alvo": faixa, "progresso": vo2_prog,
                   "so_pelo_peso": so_pelo_peso, "serie": vo2},
        "recuperacao": {"hrv": rolante(garmin, "hrv_ms", casas=0)[-90:],
                        "fc_repouso": rolante(garmin, "fc_repouso", casas=0)[-90:],
                        "sono": rolante(garmin, "sono_h", casas=2)[-90:]},
        "frequencia": dias_ativos_por_semana(garmin),
    }
    destino = os.path.join(AQUI, "painel", "data", "dashboard.json")
    with open(destino, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=1)
    print(f"dashboard.json: {len(pontos)} pesagens, {len(vo2)} pontos de VO2max, "
          f"{len(saida['frequencia'])} semanas", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
