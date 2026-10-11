#!/usr/bin/env python3
"""Puxa métricas diárias do Garmin Connect e imprime JSON no stdout.

    python3 garmin_pull.py --days 7 > garmin_out.json

⚠️ REGRA CRÍTICA DE RATE LIMIT (achado 19/07/2026, custou uma semana de dados):
o Garmin limita LOGINS por IP, não requisições. Login mobile completo a cada run
dispara 429, e o 429 não falha limpo — ele degrada a sessão e ZERA os endpoints
ricos (Training Readiness, sono, HRV), deixando só passos/FC de repouso. O
sintoma no Telegram era "sem dados do Garmin".

Por isso este script SÓ faz `login(tokenstore=~/.garminconnect)`: retoma a sessão
do token salvo, sem tráfego de autenticação. O login completo (com e-mail/senha
do .env) só acontece quando o token expira, ~1x por ano.

NÃO rode este script em loop para "testar" — cada login conta para o limite.
E se a sessão retomar do token mas os dias vierem vazios, o problema é o RELÓGIO
não estar sincronizando com o Garmin Connect, não este código. Não rediagnostique.
"""

import argparse
import datetime as dt
import json
import os
import sys
import time

TOKENSTORE = os.path.expanduser("~/.garminconnect")


def log(msg):
    """Diagnóstico vai para stderr — o stdout é só o JSON."""
    print(msg, file=sys.stderr)


def conectar():
    """Retoma a sessão do token; só faz login completo se o token morreu."""
    from garminconnect import Garmin

    cliente = Garmin()
    try:
        cliente.login(tokenstore=TOKENSTORE)
        log("sessão retomada do token (sem login de rede)")
        return cliente, "token"
    except Exception as e:
        log(f"token indisponível ou expirado ({type(e).__name__}: {e})")

    email = os.environ.get("GARMIN_EMAIL")
    senha = os.environ.get("GARMIN_PASSWORD")
    if not (email and senha):
        raise SystemExit(
            "token expirado e GARMIN_EMAIL/GARMIN_PASSWORD ausentes do .env — "
            "sem credenciais não dá para renovar a sessão"
        )

    log("fazendo login completo (conta para o rate limit — deve ser raro)")
    os.makedirs(TOKENSTORE, exist_ok=True)
    cliente = Garmin(email=email, password=senha)
    # Com credenciais + tokenstore, a lib faz o login e persiste o token sozinha.
    cliente.login(tokenstore=TOKENSTORE)
    log(f"token renovado em {TOKENSTORE}")
    return cliente, "login"


def tentar(fn, *args):
    """Chama um endpoint sem deixar que a falha dele derrube o dia inteiro."""
    try:
        return fn(*args)
    except Exception as e:
        log(f"  {getattr(fn, '__name__', fn)} falhou: {type(e).__name__}: {e}")
        return None


def cavar(obj, *caminho, default=None):
    """Navega dicts/listas aninhados tolerando chave ausente ou tipo errado."""
    atual = obj
    for chave in caminho:
        if atual is None:
            return default
        try:
            if isinstance(chave, int):
                atual = atual[chave]
            else:
                atual = atual.get(chave)
        except (KeyError, IndexError, TypeError, AttributeError):
            return default
    return default if atual is None else atual


def horas(segundos):
    if not segundos:
        return None
    return round(segundos / 3600, 2)


def puxar_dia(cliente, data):
    """Uma linha de métricas para uma data (YYYY-MM-DD)."""
    iso = data.isoformat()
    d = {"data": iso}

    resumo = tentar(cliente.get_user_summary, iso) or {}
    d["passos"] = resumo.get("totalSteps")
    d["gasto_kcal"] = resumo.get("totalKilocalories")
    d["kcal_ativas"] = resumo.get("activeKilocalories")
    d["fc_repouso"] = resumo.get("restingHeartRate")
    d["estresse_medio"] = resumo.get("averageStressLevel")
    d["body_battery_max"] = resumo.get("bodyBatteryHighestValue")
    d["body_battery_min"] = resumo.get("bodyBatteryLowestValue")

    sono = tentar(cliente.get_sleep_data, iso) or {}
    dto = sono.get("dailySleepDTO") or {}
    d["sono_h"] = horas(dto.get("sleepTimeSeconds"))
    d["sono_profundo_h"] = horas(dto.get("deepSleepSeconds"))
    d["sono_rem_h"] = horas(dto.get("remSleepSeconds"))
    d["sono_score"] = cavar(dto, "sleepScores", "overall", "value")

    # Training Readiness: a prontidão do PRÓPRIO Garmin — sinal principal do brief.
    pront = tentar(cliente.get_training_readiness, iso)
    if isinstance(pront, list) and pront:
        pront = pront[0]
    if isinstance(pront, dict):
        d["prontidao"] = pront.get("score")
        d["prontidao_nivel"] = pront.get("level")
    else:
        d["prontidao"] = None
        d["prontidao_nivel"] = None

    hrv = tentar(cliente.get_hrv_data, iso) or {}
    d["hrv_ms"] = cavar(hrv, "hrvSummary", "lastNightAvg")
    d["hrv_status"] = cavar(hrv, "hrvSummary", "status")

    # VO2max: o Garmin só grava num dia em que houve CORRIDA COM GPS — esteira e futebol
    # não alimentam a estimativa. Por isso a série é esparsa (6 atualizações em 3 meses) e
    # cada corrida isolada pesa muito. Guardamos o valor do dia quando existir.
    vo2 = tentar(cliente.get_max_metrics, iso)
    if isinstance(vo2, list) and vo2:
        generico = (vo2[0] or {}).get("generic") or {}
        d["vo2max"] = generico.get("vo2MaxPreciseValue") or generico.get("vo2MaxValue")
    else:
        d["vo2max"] = None

    status = tentar(cliente.get_training_status, iso) or {}
    ts = None
    mapa = status.get("mostRecentTrainingStatus") or {}
    for _, corpo in (cavar(mapa, "latestTrainingStatusData", default={}) or {}).items():
        ts = ts or cavar(corpo, "trainingStatusFeedbackPhrase")
    d["training_status"] = ts

    # Um dia sem passos, sem FC de repouso e sem sono = relógio não sincronizou.
    d["vazio"] = not any(
        d.get(k) for k in ("passos", "fc_repouso", "sono_h", "prontidao")
    )
    return d


def puxar_atividades(cliente, inicio, fim):
    """Atividades do período (corrida, força, jogo...), com FC média e máxima.

    Uma chamada para a janela inteira, não uma por dia. Antes só vinha o resumo do dia, e por isso
    a corrida de 07/10 e o treino de força nunca apareciam como sessão. Para força o Garmin também
    conta séries e repetições sozinho, mas esse número é pouco confiável: o painel é a fonte de
    carga e série. A FC no pulso oscila na musculação (pegada e flexão do punho): tendência, não medida.
    """
    bruto = tentar(cliente.get_activities_by_date, inicio.isoformat(), fim.isoformat()) or []
    saida = []
    for a in bruto:
        zonas = [a.get(f"hrTimeInZone_{i}") for i in range(1, 6)]
        saida.append({
            "id": a.get("activityId"),
            "tipo": cavar(a, "activityType", "typeKey"),
            "nome": a.get("activityName"),
            "inicio_local": a.get("startTimeLocal"),
            "duracao_min": round(a["duration"] / 60, 1) if a.get("duration") else None,
            "distancia_km": round(a["distance"] / 1000, 2) if a.get("distance") else None,
            "fc_media": a.get("averageHR"),
            "fc_max": a.get("maxHR"),
            "kcal": a.get("calories"),
            "efeito_aerobico": a.get("aerobicTrainingEffect"),
            "efeito_anaerobico": a.get("anaerobicTrainingEffect"),
            "tempo_em_zona_s": [round(z) for z in zonas] if any(z is not None for z in zonas) else None,
            "series_garmin": a.get("totalSets"),
            "repeticoes_garmin": a.get("totalReps"),
        })
    return saida


def main():
    ap = argparse.ArgumentParser(description="Puxa métricas do Garmin Connect")
    ap.add_argument("--days", type=int, default=7, help="quantos dias até hoje")
    args = ap.parse_args()

    try:
        from dotenv import load_dotenv

        load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
    except ImportError:
        pass

    saida = {
        "gerado_em": dt.datetime.now().isoformat(timespec="seconds"),
        "sessao": None,
        "dias": [],
    }

    try:
        cliente, modo = conectar()
        saida["sessao"] = modo
    except SystemExit as e:
        log(str(e))
        saida["erro"] = str(e)
        print(json.dumps(saida, ensure_ascii=False, indent=1))
        return 1
    except Exception as e:
        msg = f"{type(e).__name__}: {e}"
        log(f"falha ao conectar: {msg}")
        saida["erro"] = msg
        print(json.dumps(saida, ensure_ascii=False, indent=1))
        return 1

    hoje = dt.date.today()
    for i in range(args.days - 1, -1, -1):
        data = hoje - dt.timedelta(days=i)
        log(f"puxando {data}")
        saida["dias"].append(puxar_dia(cliente, data))
        if i:
            time.sleep(0.3)  # gentileza com a API; o limite é de login, não disto

    saida["atividades"] = puxar_atividades(cliente, hoje - dt.timedelta(days=args.days - 1), hoje)
    log(f"atividades no período: {len(saida['atividades'])}")

    vazios = sum(1 for d in saida["dias"] if d["vazio"])
    if vazios == len(saida["dias"]):
        log("TODOS os dias vazios — o relógio provavelmente não está sincronizando")
    saida["dias_vazios"] = vazios

    print(json.dumps(saida, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
