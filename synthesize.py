#!/usr/bin/env python3
"""Cruza garmin_out.json + renpho_out.json e escreve resumo_diario.json.

    python3 synthesize.py

Produz o Índice de Prontidão sintético (0–100) e a banda 🟢/🟡/🔴 de cada dia.

O índice é DETERMINÍSTICO e serve de CROSS-CHECK — não substitui a Prontidão do
próprio Garmin, que é o sinal principal do brief. Ele roda mais duro e mais
reativo que o Garmin (~30 pontos abaixo, historicamente); a função dele é pegar
o dia em que o Garmin está otimista e o corpo não está.

    índice = logística(0.35·HRV + 0.25·Sono − 0.20·FCrep + 0.15·BodyBattery − 0.05·Estresse)

Cada componente entra como z-score contra a baseline causal de 28 dias (só dias
ANTERIORES ao dia avaliado — nunca o futuro, senão o índice de hoje muda quando
amanhã chegar). FC de repouso e estresse entram com sinal negativo: subir é pior.
"""

import datetime as dt
import json
import math
import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
BASELINE_DIAS = 28
# Com poucos dias de baseline o z-score vira ruído: numa amostra de 3, um dia
# comum vira ±2 desvios e a logística satura em 99. Abaixo deste piso o índice
# sai como None — dizer "ainda não sei" é melhor que publicar um número falso.
MIN_AMOSTRA = 7
HISTORICO_MAX = 400  # dias guardados; o suficiente para a baseline nunca faltar
JANELA_SAIDA = 35  # dias escritos no resumo — o brief só olha o passado recente

PESOS = {
    "hrv_ms": 0.35,
    "sono_h": 0.25,
    "fc_repouso": -0.20,
    "body_battery_max": 0.15,
    "estresse_medio": -0.05,
}


def log(msg):
    print(msg, file=sys.stderr)


def carregar(nome):
    caminho = os.path.join(AQUI, nome)
    try:
        with open(caminho, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        log(f"{nome} não encontrado — seguindo sem ele")
    except json.JSONDecodeError as e:
        log(f"{nome} ilegível ({e}) — seguindo sem ele")
    return {}


def z(valor, historico):
    """z-score contra o histórico; None quando não há amostra que sustente."""
    amostra = [v for v in historico if isinstance(v, (int, float))]
    if valor is None or len(amostra) < MIN_AMOSTRA:
        return None
    media = sum(amostra) / len(amostra)
    variancia = sum((v - media) ** 2 for v in amostra) / len(amostra)
    desvio = math.sqrt(variancia)
    if desvio < 1e-9:  # série achatada: sem variação não há desvio a medir
        return 0.0
    return (valor - media) / desvio


def banda(indice):
    if indice is None:
        return None
    if indice >= 75:
        return "g"
    if indice >= 50:
        return "y"
    return "r"


def acumular_historico(dias_novos):
    """Funde o pull de hoje no histórico em disco e devolve a série completa.

    O pull traz só ~7 dias, mas a baseline pede 28. Sem memória entre execuções
    o índice nunca teria amostra suficiente. Guardar o histórico também é a
    defesa contra o próximo acidente com o repositório: a série sobrevive a um
    pull que venha vazio, em vez de sumir junto.
    """
    caminho = os.path.join(AQUI, "historico_garmin.json")
    antigos = {}
    try:
        with open(caminho, encoding="utf-8") as f:
            for d in json.load(f).get("dias", []):
                if d.get("data"):
                    antigos[d["data"]] = d
    except (FileNotFoundError, json.JSONDecodeError):
        pass

    for d in dias_novos:
        data = d.get("data")
        if not data:
            continue
        # Um dia vazio no pull não apaga o que já estava gravado: dia sem
        # sincronia do relógio volta vazio, e sobrescrever perderia o histórico.
        if d.get("vazio") and antigos.get(data) and not antigos[data].get("vazio"):
            continue
        antigos[data] = d

    serie = [antigos[k] for k in sorted(antigos)][-HISTORICO_MAX:]
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump({"dias": serie}, f, ensure_ascii=False, indent=1)
    log(f"histórico: {len(serie)} dias em historico_garmin.json")
    return serie


def main():
    garmin = carregar("garmin_out.json")
    renpho = carregar("renpho_out.json")

    dias = acumular_historico(garmin.get("dias") or [])
    if not dias:
        log("sem dias no pull e sem histórico — resumo sai vazio")

    peso_por_dia = {d["data"]: d for d in (renpho.get("dias") or []) if d.get("data")}

    resumo = []
    for i, dia in enumerate(dias):
        anteriores = dias[max(0, i - BASELINE_DIAS) : i]  # causal: nunca inclui hoje

        soma, peso_total = 0.0, 0.0
        componentes = {}
        for campo, peso in PESOS.items():
            escore = z(dia.get(campo), [a.get(campo) for a in anteriores])
            componentes[campo] = None if escore is None else round(escore, 2)
            if escore is not None:
                soma += peso * escore
                peso_total += abs(peso)

        if peso_total == 0:
            indice = None
        else:
            # Reescala pelos pesos efetivamente usados, para que um dia com
            # métrica faltando não seja punido só por estar incompleto.
            normalizado = soma * (sum(abs(p) for p in PESOS.values()) / peso_total)
            indice = round(100 / (1 + math.exp(-1.5 * normalizado)))

        linha = {
            "data": dia.get("data"),
            "indice_prontidao": indice,
            "banda": banda(indice),
            "prontidao_garmin": dia.get("prontidao"),
            "banda_garmin": banda(dia.get("prontidao")),
            "sono_h": dia.get("sono_h"),
            "sono_score": dia.get("sono_score"),
            "fc_repouso": dia.get("fc_repouso"),
            "hrv_ms": dia.get("hrv_ms"),
            "body_battery_max": dia.get("body_battery_max"),
            "passos": dia.get("passos"),
            "gasto_kcal": dia.get("gasto_kcal"),
            "training_status": dia.get("training_status"),
            "vazio": dia.get("vazio"),
            "componentes_z": componentes,
        }

        medida = peso_por_dia.get(dia.get("data")) or {}
        linha["peso_kg"] = medida.get("peso_kg")
        linha["gordura_pct"] = medida.get("gordura_pct")

        resumo.append(linha)

    # A baseline usa o histórico inteiro, mas o brief só lê o passado recente.
    resumo = resumo[-JANELA_SAIDA:]

    # Peso: hoje contra a média dos dias anteriores (o gatilho do dia anti-inflamatório).
    pesos = [(l["data"], l["peso_kg"]) for l in resumo if l.get("peso_kg")]
    delta = None
    if len(pesos) >= 2:
        atual = pesos[-1][1]
        media_anterior = sum(p for _, p in pesos[:-1]) / len(pesos[:-1])
        delta = round(atual - media_anterior, 2)

    saida = {
        "gerado_em": dt.datetime.now().isoformat(timespec="seconds"),
        "fonte": {
            "garmin_gerado_em": garmin.get("gerado_em"),
            "garmin_sessao": garmin.get("sessao"),
            "garmin_dias_vazios": garmin.get("dias_vazios"),
            "garmin_erro": garmin.get("erro"),
            "renpho_gerado_em": renpho.get("gerado_em"),
            "renpho_erro": renpho.get("erro"),
        },
        "peso_delta_vs_media": delta,
        "dias": resumo,
    }

    destino = os.path.join(AQUI, "resumo_diario.json")
    with open(destino, "w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, indent=1)

    com_indice = sum(1 for l in resumo if l["indice_prontidao"] is not None)
    log(f"resumo_diario.json escrito: {len(resumo)} dias, {com_indice} com índice")
    return 0


if __name__ == "__main__":
    sys.exit(main())
