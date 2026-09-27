#!/usr/bin/env python3
"""Camada 0 do conselho: transforma os dados crus em FATOS, sem interpretação.

    python3 fatos.py > fatos.json

Regra do projeto: nenhum especialista (nem o copiloto) calcula número por conta
própria — todos citam este arquivo. Isso existe porque a classe de erro mais cara
da história do projeto não foi falta de dado, foi narrativa por cima de dado que
estava lá e não foi olhado (22/09: atribuí uma queda de peso à dieta quando era
o artefato do jogo da véspera).

Entradas: garmin_out.json, renpho_out.json, resumo_diario.json (synthesize.py) e
os registros do Notion via /api/registros do painel.
"""

import datetime as dt
import json
import os
import statistics as st
import sys
import subprocess

AQUI = os.path.dirname(os.path.abspath(__file__))
API_REGISTROS = "https://painel-xi-three.vercel.app/api/registros"
# Véspera com este gasto ativo ou mais deprime a pesagem da manhã seguinte em
# ~0,26 kg (n=46, jun–set/2026). Ver PROJETO_CHAT §5.
LIMIAR_DIA_INTENSO = 450
PALAVRAS = {
    "fritura": ["frit", "torresmo", "empanad", "milanesa", "pastel", "salgad", "airfryer"],
    "doce": ["chocolate", "sorvete", "doce", "nutella", "pudim", "brigadeiro", "bolo"],
    "buffet": ["buffet", "quilo", "self", "bufê"],
    "alcool": ["cerveja", "vinho", "chopp", "caipir", "whisky", "drink"],
    "proteina_clara": ["frango", "tilápia", "tilapia", "peixe", "carne", "ovo", "whey",
                       "iogurte", "patinho", "picanha", "sobrecoxa", "lombo", "rosbife"],
}


def log(m):
    print(m, file=sys.stderr)


def carregar(nome):
    try:
        with open(os.path.join(AQUI, nome), encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        log(f"{nome}: {type(e).__name__} — seguindo sem ele")
        return {}


def registros():
    # curl em vez de urllib: o ambiente do Fabio bloqueia urllib para hosts externos.
    try:
        bruto = subprocess.run(["curl", "-sS", "--max-time", "30", API_REGISTROS],
                               capture_output=True, text=True, check=True).stdout
        d = json.loads(bruto)
        return d if isinstance(d, list) else list(d.values())[0]
    except Exception as e:
        log(f"registros indisponíveis: {type(e).__name__}: {e}")
        return []


def media(v, casas=2):
    v = [x for x in v if x is not None]
    return round(st.mean(v), casas) if v else None


def dias_de_jogo(regs):
    """Jogo de campeonato não gera dado de relógio — o texto do Fabio é a fonte.

    Sem isto o detector de artefato erra justamente nos jogos que mais pesam:
    em 26/09/2026 o campeonato saiu com 397 kcal ativas (abaixo do limiar) porque
    o relógio não podia entrar em campo.
    """
    chaves = ("jogo", "futebol", "campeonato", "pelada", "partida")
    achados = set()
    for r in regs:
        texto = f"{r.get('texto') or ''}".lower()
        if r.get("data") and any(c in texto for c in chaves):
            achados.add(r["data"])
    return achados


def jogos_planejados(resumo):
    """O plano também é fonte: dia marcado como futebol/campeonato no painel que
    teve movimento de sobra (passos ou gasto) conta como jogo, mesmo sem o texto.
    Em 26/09/2026 o campeonato só apareceu assim."""
    try:
        with open(os.path.join(AQUI, "painel", "data", "semana.json"), encoding="utf-8") as f:
            plano = json.load(f)
    except Exception:
        return set()
    passos = {d["data"]: (d.get("passos") or 0) for d in resumo}
    achados = set()
    for dia in plano.get("dias", []):
        marca = f"{dia.get('tipo','')} {dia.get('treino',{}).get('foco','')}".lower()
        if not any(c in marca for c in ("futebol", "campeonato", "jogo")):
            continue
        try:
            d_, m_ = dia["data"].split("/")[:2]
            iso = f"2026-{int(m_):02d}-{int(d_):02d}"
        except Exception:
            continue
        if passos.get(iso, 0) >= 8000:
            achados.add(iso)
    return achados


def bloco_peso(resumo, garmin_hist, regs):
    """Peso com o artefato pós-esforço separado — nunca some os dois."""
    ativas = {d["data"]: d.get("kcal_ativas") for d in garmin_hist}
    jogos = dias_de_jogo(regs) | jogos_planejados(resumo)
    neutras, pos = [], []
    serie = []
    for d in resumo:
        if not d.get("peso_kg"):
            continue
        vespera = (dt.date.fromisoformat(d["data"]) - dt.timedelta(days=1)).isoformat()
        k = ativas.get(vespera)
        intenso = (k is not None and k >= LIMIAR_DIA_INTENSO) or vespera in jogos
        serie.append({"data": d["data"], "peso_kg": d["peso_kg"], "pos_esforco": intenso})
        (pos if intenso else neutras).append(d["peso_kg"])
    ult = serie[-14:]
    return {
        "ultima": serie[-1] if serie else None,
        "serie_14d": ult,
        "media_ultimas_7_leituras": media([x["peso_kg"] for x in serie[-7:]]),
        # "neutras dentro das últimas 7 leituras" — o n vai junto, porque já
        # chamamos de "média de 7" o que eram 5 (27/09/2026).
        "media_neutras_nas_ultimas_7": media([x["peso_kg"] for x in serie[-7:] if not x["pos_esforco"]]),
        "n_neutras_nas_ultimas_7": sum(1 for x in serie[-7:] if not x["pos_esforco"]),
        "media_7_neutras_de_verdade": media([x["peso_kg"] for x in serie if not x["pos_esforco"]][-7:]),
        "media_28d_neutras": media(neutras[-28:]),
        "n_leituras_pos_esforco_14d": sum(1 for x in ult if x["pos_esforco"]),
        "aviso": ("Leitura pós-esforço vem ~0,26 kg abaixo do nível real; compare dias "
                  "equivalentes ou use apenas as neutras."),
    }


def bloco_recuperacao(resumo):
    u7 = resumo[-7:]
    vermelhos = 0
    for d in reversed(resumo):
        if d.get("banda") == "r":
            vermelhos += 1
        else:
            break
    return {
        "indice_hoje": u7[-1].get("indice_prontidao") if u7 else None,
        "banda_hoje": u7[-1].get("banda") if u7 else None,
        "prontidao_garmin_hoje": u7[-1].get("prontidao_garmin") if u7 else None,
        "dias_vermelhos_seguidos": vermelhos,
        "indice_medio_7d": media([d.get("indice_prontidao") for d in u7], 0),
        "sono_medio_7d": media([d.get("sono_h") for d in u7]),
        "hrv_medio_7d": media([d.get("hrv_ms") for d in u7], 0),
        "hrv_medio_28d": media([d.get("hrv_ms") for d in resumo[-28:]], 0),
        "fc_repouso_7d": media([d.get("fc_repouso") for d in u7], 0),
        "fc_repouso_28d": media([d.get("fc_repouso") for d in resumo[-28:]], 0),
    }


def bloco_treino(resumo, garmin_hist, regs, desde):
    ativas = {d["data"]: d.get("kcal_ativas") for d in garmin_hist}
    dias = [d for d in resumo if d["data"] >= desde]
    ativos = [{"data": d["data"], "kcal_ativas": ativas.get(d["data"]), "passos": d.get("passos")}
              for d in dias if (ativas.get(d["data"]) or 0) >= 300]
    treinos_reg = [r for r in regs if r.get("tipo") == "Treino" and (r.get("data") or "") >= desde]
    return {
        "dias_com_gasto_ativo_300+": ativos,
        "registros_de_treino": [{"data": r["data"], "tem_foto": bool(r.get("foto")),
                                 "texto": (r.get("texto") or "")[:120]} for r in treinos_reg],
        "sessoes_registradas": len(treinos_reg),
        "aviso": ("Jogo de campeonato não gera dado de relógio (regra da competição) — "
                  "ausência de atividade não é ausência de esforço."),
    }


def bloco_alimentacao(regs, desde):
    refs = [r for r in regs if r.get("tipo") == "Refeição" and (r.get("data") or "") >= desde]
    obs = [r for r in regs if r.get("tipo") == "Observação" and (r.get("data") or "") >= desde]
    achados = {k: [] for k in PALAVRAS}
    for r in refs:
        t = (r.get("texto") or "").lower()
        for cat, chaves in PALAVRAS.items():
            if any(c in t for c in chaves):
                achados[cat].append({"data": r["data"], "refeicao": r.get("refeicao"),
                                     "texto": (r.get("texto") or "")[:90]})
    dias = sorted({r["data"] for r in refs})
    return {
        "dias_com_registro": dias,
        "n_refeicoes_registradas": len(refs),
        "por_dia": {d: sum(1 for r in refs if r["data"] == d) for d in dias},
        "ocorrencias": {k: v for k, v in achados.items()},
        "observacoes": [{"data": o["data"], "texto": (o.get("texto") or "")[:160]} for o in obs],
        "aviso": ("Registro é esparso e qualitativo: ausência de registro NÃO é ausência de "
                  "refeição. Não estime caloria da semana a partir daqui."),
    }


def main():
    hoje = dt.date.today()
    desde = (hoje - dt.timedelta(days=7)).isoformat()
    resumo = carregar("resumo_diario.json")
    resumo = resumo.get("dias", resumo) if isinstance(resumo, dict) else resumo
    hist = carregar("historico_garmin.json")
    hist = hist.get("dias", hist) if isinstance(hist, dict) else hist
    regs = registros()

    saida = {
        "gerado_em": dt.datetime.now().isoformat(timespec="seconds"),
        "janela": {"hoje": hoje.isoformat(), "dia_semana": hoje.strftime("%A"),
                   "semana_desde": desde},
        "peso": bloco_peso(resumo, hist, regs),
        "recuperacao": bloco_recuperacao(resumo),
        "treino_7d": bloco_treino(resumo, hist, regs, desde),
        "alimentacao_7d": bloco_alimentacao(regs, desde),
        "lacunas": [],
    }
    if not resumo:
        saida["lacunas"].append("resumo_diario.json ausente — rode synthesize.py")
    if not regs:
        saida["lacunas"].append("registros do Notion indisponíveis")
    # Um índice calculado com 1 ou 2 componentes é extrapolação, não medida: o
    # synthesize reescala pelos pesos usados, então um dia só com "estresse" vira
    # um número de escala cheia. Declarar isso é obrigatório — em 27/09/2026 o teto
    # de uma semana inteira quase se apoiou num índice de componente único.
    if resumo:
        comp = resumo[-1].get("componentes_z") or {}
        faltando = [k for k, v in comp.items() if v is None]
        if len(faltando) >= 2:
            saida["recuperacao"]["indice_hoje_confiavel"] = False
            saida["recuperacao"]["componentes_faltando_hoje"] = faltando
            saida["lacunas"].append(
                f"índice de hoje calculado sem {', '.join(faltando)} — use a média de 7 dias, "
                f"não o número de hoje")
        else:
            saida["recuperacao"]["indice_hoje_confiavel"] = True
    if saida["peso"]["ultima"] and saida["peso"]["ultima"]["data"] != hoje.isoformat():
        saida["lacunas"].append(f"sem pesagem hoje (última: {saida['peso']['ultima']['data']})")
    print(json.dumps(saida, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
