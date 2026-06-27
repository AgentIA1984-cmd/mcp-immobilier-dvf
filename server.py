"""
Serveur MCP « Immobilier France (DVF) » — AgentIA.

Donne à un agent IA l'accès aux prix et transactions immobilières RÉELS en France,
à partir des données ouvertes officielles (géo-DVF / Etalab), gratuites et sans clé.

Sources (open data, sans authentification) :
  - Transactions   : https://files.data.gouv.fr/geo-dvf/latest/csv/{annee}/communes/{dep}/{insee}.csv
  - Communes       : https://geo.api.gouv.fr/communes
  - Géocodage (BAN): https://api-adresse.data.gouv.fr/search

Transports :
  - local  : stdio (par défaut)        ->  python server.py
  - distant: streamable-http / sse     ->  MCP_TRANSPORT=streamable-http python server.py
"""

from __future__ import annotations

import datetime as _dt
from functools import lru_cache
from typing import Optional

import httpx
from mcp.server.fastmcp import FastMCP

import dvf_core as core

GEO_DVF_BASE = "https://files.data.gouv.fr/geo-dvf/latest/csv"
GEO_API = "https://geo.api.gouv.fr"
BAN_API = "https://api-adresse.data.gouv.fr"
USER_AGENT = "AgentIA-MCP-Immobilier-DVF/1.0 (+https://agentia)"
TIMEOUT = 30.0

mcp = FastMCP("immobilier-dvf")

_client = httpx.Client(
    timeout=TIMEOUT, follow_redirects=True, headers={"User-Agent": USER_AGENT}
)


def _annee_par_defaut() -> int:
    # géo-DVF « latest » couvre jusqu'à l'année civile précédente complète.
    return _dt.date.today().year - 1


@lru_cache(maxsize=256)
def _telecharger_csv(insee: str, annee: int) -> str:
    """Télécharge (et met en cache) le CSV géo-DVF d'une commune pour une année.
    Renvoie '' si la ressource n'existe pas (404)."""
    dep = core.departement_depuis_insee(insee)
    url = f"{GEO_DVF_BASE}/{annee}/communes/{dep}/{insee}.csv"
    r = _client.get(url)
    if r.status_code == 404:
        return ""
    r.raise_for_status()
    return r.text


def _mutations(insee: str, annee: int) -> list[dict]:
    return core.aggreger_mutations(core.parse_csv(_telecharger_csv(insee, annee)))


@lru_cache(maxsize=512)
def _resoudre_commune(commune: str) -> Optional[tuple[str, str, str]]:
    """Résout un nom de commune OU un code INSEE en (code_insee, nom, departement).
    Renvoie None si introuvable."""
    commune = commune.strip()
    if (commune.isdigit() and len(commune) == 5) or commune[:2] in ("2A", "2B"):
        r = _client.get(f"{GEO_API}/communes/{commune}", params={"fields": "code,nom,codeDepartement"})
        if r.status_code == 200 and r.json():
            d = r.json()
            return (d["code"], d["nom"], d.get("codeDepartement", ""))
    r = _client.get(
        f"{GEO_API}/communes",
        params={"nom": commune, "fields": "code,nom,codeDepartement,population",
                "boost": "population", "limit": 1},
    )
    data = r.json() if r.status_code == 200 else []
    if data:
        d = data[0]
        return (d["code"], d["nom"], d.get("codeDepartement", ""))
    return None


def _geocoder(adresse: str) -> Optional[dict]:
    """Géocode une adresse via la BAN. Renvoie {lat, lon, label, citycode} ou None."""
    r = _client.get(f"{BAN_API}/search/", params={"q": adresse, "limit": 1, "autocomplete": 0})
    if r.status_code != 200:
        return None
    feats = (r.json() or {}).get("features") or []
    if not feats:
        return None
    f = feats[0]
    lon, lat = f["geometry"]["coordinates"]
    p = f.get("properties", {})
    return {"lat": lat, "lon": lon, "label": p.get("label", adresse), "citycode": p.get("citycode")}


# --------------------------------------------------------------------------- #
# Outils MCP
# --------------------------------------------------------------------------- #

@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": True})
def rechercher_commune(nom: str) -> dict:
    """Trouve le code commune INSEE à partir d'un nom de ville (ou vérifie un code).

    Utile en premier quand on ne connaît pas le code INSEE d'une commune.

    Args:
        nom: Nom de la commune (ex. « Lyon ») ou code INSEE à 5 caractères.

    Returns:
        Les communes correspondantes avec leur code INSEE, nom, département et population.
    """
    r = _client.get(
        f"{GEO_API}/communes",
        params={"nom": nom, "fields": "code,nom,codeDepartement,codesPostaux,population",
                "boost": "population", "limit": 8},
    )
    if r.status_code != 200:
        return {"erreur": "Service communes indisponible, réessayez plus tard."}
    data = r.json() or []
    if not data:
        return {"resultats": [], "message": f"Aucune commune trouvée pour « {nom} »."}
    return {
        "resultats": [
            {
                "code_insee": d["code"],
                "nom": d["nom"],
                "departement": d.get("codeDepartement"),
                "codes_postaux": d.get("codesPostaux", []),
                "population": d.get("population"),
            }
            for d in data
        ]
    }


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": True})
def prix_immobilier(commune: str, type_bien: Optional[str] = None, annee: Optional[int] = None) -> dict:
    """Prix de l'immobilier au m² dans une commune (transactions DVF réelles).

    Args:
        commune: Nom de la commune ou code INSEE.
        type_bien: 'Maison', 'Appartement', ou None pour les deux.
        annee: Année des ventes (par défaut : dernière année disponible).

    Returns:
        Statistiques de prix au m² : médiane, moyenne, quartiles, min/max, nombre de ventes.
    """
    resa = _resoudre_commune(commune)
    if not resa:
        return {"erreur": f"Commune « {commune} » introuvable. Utilisez rechercher_commune."}
    insee, nom, _dep = resa
    an = annee or _annee_par_defaut()
    muts = _mutations(insee, an)
    if not muts and annee is None:
        an -= 1
        muts = _mutations(insee, an)
    sel = core.filtrer(muts, type_bien=type_bien, avec_prix_m2=True)
    s = core.stats_prix_m2(sel)
    if not s:
        return {
            "commune": nom, "code_insee": insee, "annee": an, "type_bien": type_bien or "tous",
            "message": "Pas de ventes résidentielles exploitables pour ces critères.",
        }
    s.update({"commune": nom, "code_insee": insee, "annee": an, "type_bien": type_bien or "tous"})
    s["resume"] = (
        f"{nom} ({an}) — {type_bien or 'biens résidentiels'} : "
        f"prix médian {s['prix_m2_median']} €/m² "
        f"(50 % des ventes entre {s['prix_m2_p25']} et {s['prix_m2_p75']} €/m²), "
        f"sur {s['nb_ventes']} ventes."
    )
    return s


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": True})
def transactions(
    commune: str,
    type_bien: Optional[str] = None,
    annee: Optional[int] = None,
    limit: int = 20,
) -> dict:
    """Liste des transactions immobilières d'une commune (ventes DVF récentes).

    Args:
        commune: Nom de la commune ou code INSEE.
        type_bien: 'Maison', 'Appartement', ou None pour tous.
        annee: Année (par défaut : dernière disponible).
        limit: Nombre maximum de transactions renvoyées (1-100).

    Returns:
        Les ventes les plus récentes avec date, type, surface, pièces, prix et prix au m².
    """
    limit = max(1, min(100, limit))
    resa = _resoudre_commune(commune)
    if not resa:
        return {"erreur": f"Commune « {commune} » introuvable. Utilisez rechercher_commune."}
    insee, nom, _dep = resa
    an = annee or _annee_par_defaut()
    muts = _mutations(insee, an)
    if not muts and annee is None:
        an -= 1
        muts = _mutations(insee, an)
    sel = core.filtrer(muts, type_bien=type_bien, avec_prix_m2=True)
    sel.sort(key=lambda m: m.get("date") or "", reverse=True)
    rows = sel[:limit]
    return {
        "commune": nom, "code_insee": insee, "annee": an,
        "nb_total": len(sel), "nb_affiche": len(rows),
        "transactions": [
            {
                "date": m["date"], "type": m["type_bien"], "prix": m["valeur_fonciere"],
                "surface_m2": m["surface_bati"], "pieces": m["nombre_pieces"],
                "prix_m2": m["prix_m2"], "terrain_m2": m["surface_terrain"],
                "adresse": m["adresse"], "code_postal": m["code_postal"],
            }
            for m in rows
        ],
    }


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": True})
def transactions_autour_adresse(
    adresse: str,
    rayon_m: int = 500,
    type_bien: Optional[str] = None,
    annee: Optional[int] = None,
    limit: int = 20,
) -> dict:
    """Ventes immobilières comparables autour d'une adresse (rayon en mètres).

    Géocode l'adresse puis renvoie les transactions DVF les plus proches.

    Args:
        adresse: Adresse postale (ex. « 4 place Bellecour, Lyon »).
        rayon_m: Rayon de recherche en mètres (50-5000).
        type_bien: 'Maison', 'Appartement', ou None.
        annee: Année (par défaut : dernière disponible).
        limit: Nombre maximum de ventes renvoyées (1-100).

    Returns:
        Le point géocodé et les ventes proches, triées par distance, avec prix au m².
    """
    rayon_m = max(50, min(5000, rayon_m))
    limit = max(1, min(100, limit))
    g = _geocoder(adresse)
    if not g:
        return {"erreur": f"Adresse « {adresse} » non géocodable."}
    insee = g.get("citycode")
    if not insee:
        return {"erreur": "Impossible d'associer l'adresse à une commune."}
    an = annee or _annee_par_defaut()
    muts = _mutations(insee, an)
    if not muts and annee is None:
        an -= 1
        muts = _mutations(insee, an)
    sel = core.filtrer(muts, type_bien=type_bien, avec_prix_m2=True)
    proches = core.autour(sel, g["lat"], g["lon"], rayon_m)[:limit]
    return {
        "adresse_geocodee": g["label"], "code_insee": insee, "annee": an,
        "rayon_m": rayon_m, "nb_trouve": len(proches),
        "ventes": [
            {
                "distance_m": m["distance_m"], "date": m["date"], "type": m["type_bien"],
                "prix": m["valeur_fonciere"], "surface_m2": m["surface_bati"],
                "pieces": m["nombre_pieces"], "prix_m2": m["prix_m2"], "adresse": m["adresse"],
            }
            for m in proches
        ],
    }


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": True})
def estimer_bien(
    adresse: str,
    surface_m2: float,
    type_bien: str,
    rayon_m: int = 800,
    annee: Optional[int] = None,
) -> dict:
    """Estime la valeur d'un bien par comparaison avec les ventes réelles proches.

    Méthode transparente : prix au m² médian des ventes comparables (même type, dans
    le rayon) multiplié par la surface. La fiabilité dépend du nombre de comparables.

    Args:
        adresse: Adresse du bien à estimer.
        surface_m2: Surface habitable en m².
        type_bien: 'Maison' ou 'Appartement'.
        rayon_m: Rayon de recherche des comparables en mètres (100-5000).
        annee: Année des comparables (par défaut : dernière disponible).

    Returns:
        Fourchette d'estimation (basse/centrale/haute), prix au m² de référence,
        nombre de comparables et indice de fiabilité.
    """
    rayon_m = max(100, min(5000, rayon_m))
    g = _geocoder(adresse)
    if not g:
        return {"erreur": f"Adresse « {adresse} » non géocodable."}
    insee = g.get("citycode")
    an = annee or _annee_par_defaut()
    muts = _mutations(insee, an)
    if not muts and annee is None:
        an -= 1
        muts = _mutations(insee, an)
    sel = core.filtrer(muts, type_bien=type_bien, avec_prix_m2=True)
    comps = core.autour(sel, g["lat"], g["lon"], rayon_m)
    s = core.stats_prix_m2(comps)
    if not s:
        return {
            "adresse_geocodee": g["label"], "annee": an,
            "message": "Pas assez de ventes comparables dans le rayon. Élargissez rayon_m.",
        }
    n = s["nb_ventes"]
    fiabilite = "élevée" if n >= 15 else "moyenne" if n >= 5 else "faible"
    centrale = round(s["prix_m2_median"] * surface_m2)
    return {
        "adresse_geocodee": g["label"], "type_bien": type_bien, "surface_m2": surface_m2,
        "annee": an, "rayon_m": rayon_m, "nb_comparables": n, "fiabilite": fiabilite,
        "prix_m2_reference": s["prix_m2_median"],
        "estimation_basse": round(s["prix_m2_p25"] * surface_m2),
        "estimation_centrale": centrale,
        "estimation_haute": round(s["prix_m2_p75"] * surface_m2),
        "resume": (
            f"{type_bien} de {surface_m2:.0f} m² près de {g['label']} : "
            f"~{centrale:,} € ".replace(",", " ")
            + f"(réf. {s['prix_m2_median']} €/m², {n} comparables, fiabilité {fiabilite})."
        ),
        "avertissement": "Estimation indicative basée sur les ventes passées (DVF), "
                         "hors état/étage/prestations du bien. Ne remplace pas une expertise.",
    }


@mcp.tool(annotations={"readOnlyHint": True, "openWorldHint": True})
def tendance_prix(commune: str, type_bien: Optional[str] = None, nb_annees: int = 4) -> dict:
    """Évolution du prix au m² médian d'une commune sur plusieurs années.

    Args:
        commune: Nom de la commune ou code INSEE.
        type_bien: 'Maison', 'Appartement', ou None.
        nb_annees: Nombre d'années à comparer (2-6).

    Returns:
        Le prix au m² médian par année et la variation globale en %.
    """
    nb_annees = max(2, min(6, nb_annees))
    resa = _resoudre_commune(commune)
    if not resa:
        return {"erreur": f"Commune « {commune} » introuvable. Utilisez rechercher_commune."}
    insee, nom, _dep = resa
    fin = _annee_par_defaut()
    serie = []
    for an in range(fin - nb_annees + 1, fin + 1):
        sel = core.filtrer(_mutations(insee, an), type_bien=type_bien, avec_prix_m2=True)
        s = core.stats_prix_m2(sel)
        if s:
            serie.append({"annee": an, "prix_m2_median": s["prix_m2_median"], "nb_ventes": s["nb_ventes"]})
    if len(serie) < 2:
        return {"commune": nom, "code_insee": insee,
                "message": "Données insuffisantes pour établir une tendance."}
    debut, dernier = serie[0], serie[-1]
    variation = round((dernier["prix_m2_median"] - debut["prix_m2_median"]) / debut["prix_m2_median"] * 100, 1)
    return {
        "commune": nom, "code_insee": insee, "type_bien": type_bien or "tous",
        "serie": serie, "variation_pct": variation,
        "resume": (
            f"{nom} : {debut['prix_m2_median']} €/m² en {debut['annee']} → "
            f"{dernier['prix_m2_median']} €/m² en {dernier['annee']} "
            f"({'+' if variation >= 0 else ''}{variation} %)."
        ),
    }


if __name__ == "__main__":
    import os

    transport = os.environ.get("MCP_TRANSPORT", "stdio")
    if transport == "stdio":
        # Mode local (Claude Desktop, Cursor, Claude Code…).
        mcp.run()
    else:
        # Mode hébergé / distant : l'acheteur se connecte par URL, rien à installer.
        # transport = "streamable-http" (recommandé) ou "sse".
        try:
            mcp.settings.host = "0.0.0.0"
            mcp.settings.port = int(os.environ.get("PORT", "8000"))
        except Exception:
            pass
        mcp.run(transport=transport)
