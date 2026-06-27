"""
dvf_core.py — Logique métier du serveur MCP Immobilier France (DVF).

Toutes les fonctions de calcul (agrégation des mutations, prix au m², distance,
statistiques) sont ici, SANS dépendance réseau, pour être testables hors-ligne.
Les appels réseau (téléchargement des CSV géo-DVF, géocodage) sont dans server.py.

Source de données : géo-DVF (Etalab / data.gouv.fr), open data, gratuit, sans clé.
Schéma CSV : https://files.data.gouv.fr/geo-dvf/latest/csv/
"""

from __future__ import annotations

import csv
import io
import math
import statistics
from typing import Iterable, Optional

# Types de biens résidentiels gérés
RESIDENTIEL = {"Maison", "Appartement"}

# Bornes de plausibilité du prix au m² (€/m²) pour écarter les valeurs aberrantes
PRIX_M2_MIN = 200.0
PRIX_M2_MAX = 30000.0


def departement_depuis_insee(code_insee: str) -> str:
    """Déduit le code département (dossier géo-DVF) depuis un code commune INSEE.

    - Corse : '2A'/'2B' (les communes 2Axxx / 2Bxxx).
    - Outre-mer (971..976, 98x) : 3 caractères.
    - Métropole : 2 caractères.
    """
    code_insee = (code_insee or "").strip()
    if code_insee[:2] in ("2A", "2B"):
        return code_insee[:2]
    if code_insee[:2] in ("97", "98"):
        return code_insee[:3]
    return code_insee[:2]


def _to_float(v: Optional[str]) -> Optional[float]:
    if v is None:
        return None
    v = v.strip()
    if not v:
        return None
    try:
        return float(v)
    except ValueError:
        return None


def _to_int(v: Optional[str]) -> Optional[int]:
    f = _to_float(v)
    return int(f) if f is not None else None


def parse_csv(text: str) -> list[dict]:
    """Parse le texte CSV géo-DVF en liste de dictionnaires (lignes brutes)."""
    if not text:
        return []
    reader = csv.DictReader(io.StringIO(text))
    return list(reader)


def aggreger_mutations(rows: Iterable[dict]) -> list[dict]:
    """Regroupe les lignes CSV par mutation (id_mutation) et calcule le prix au m².

    Une mutation peut comporter plusieurs lignes (plusieurs lots/parcelles). On
    additionne la surface bâtie résidentielle de la mutation et on rapporte la
    valeur foncière (unique pour la mutation) à cette surface.

    Renvoie une liste de mutations normalisées avec, quand c'est pertinent, la
    clé ``prix_m2`` (None si non calculable ou hors bornes de plausibilité).
    """
    groupes: dict[str, list[dict]] = {}
    for r in rows:
        idm = (r.get("id_mutation") or "").strip()
        if not idm:
            continue
        groupes.setdefault(idm, []).append(r)

    mutations: list[dict] = []
    for idm, grp in groupes.items():
        valeur = None
        for r in grp:
            valeur = _to_float(r.get("valeur_fonciere")) or valeur
        nature = (grp[0].get("nature_mutation") or "").strip()
        date = (grp[0].get("date_mutation") or "").strip()
        nom_commune = (grp[0].get("nom_commune") or "").strip()
        code_commune = (grp[0].get("code_commune") or "").strip()
        code_postal = (grp[0].get("code_postal") or "").strip()

        res_rows = [r for r in grp if (r.get("type_local") or "").strip() in RESIDENTIEL]
        types = {(r.get("type_local") or "").strip() for r in res_rows}
        surface_bati = sum(_to_float(r.get("surface_reelle_bati")) or 0.0 for r in res_rows)
        pieces = sum(_to_int(r.get("nombre_pieces_principales")) or 0 for r in res_rows)

        # surface terrain : somme des valeurs distinctes (évite les doublons de lignes)
        terrains = set()
        for r in grp:
            t = _to_float(r.get("surface_terrain"))
            if t:
                terrains.add(round(t, 2))
        surface_terrain = sum(terrains) if terrains else 0.0

        if not types:
            type_bien = None
        elif types == {"Maison"}:
            type_bien = "Maison"
        elif types == {"Appartement"}:
            type_bien = "Appartement"
        else:
            type_bien = "Mixte"

        # coordonnées et adresse : première ligne résidentielle si possible
        ref = res_rows[0] if res_rows else grp[0]
        lon = _to_float(ref.get("longitude"))
        lat = _to_float(ref.get("latitude"))
        numero = (ref.get("adresse_numero") or "").strip()
        voie = (ref.get("adresse_nom_voie") or "").strip()
        adresse = " ".join(p for p in [numero, voie] if p).strip()

        prix_m2 = None
        if (
            valeur
            and surface_bati > 0
            and type_bien in ("Maison", "Appartement", "Mixte")
            and nature == "Vente"
        ):
            pm2 = valeur / surface_bati
            if PRIX_M2_MIN <= pm2 <= PRIX_M2_MAX:
                prix_m2 = round(pm2, 0)

        mutations.append(
            {
                "id_mutation": idm,
                "date": date,
                "nature": nature,
                "valeur_fonciere": valeur,
                "type_bien": type_bien,
                "surface_bati": round(surface_bati, 1) if surface_bati else None,
                "nombre_pieces": pieces or None,
                "surface_terrain": round(surface_terrain, 1) if surface_terrain else None,
                "prix_m2": prix_m2,
                "adresse": adresse or None,
                "code_postal": code_postal or None,
                "nom_commune": nom_commune or None,
                "code_commune": code_commune or None,
                "longitude": lon,
                "latitude": lat,
            }
        )
    return mutations


def filtrer(
    mutations: list[dict],
    type_bien: Optional[str] = None,
    avec_prix_m2: bool = False,
    prix_min: Optional[float] = None,
    prix_max: Optional[float] = None,
) -> list[dict]:
    """Filtre des mutations par type de bien, présence d'un prix/m², bornes de prix."""
    out = []
    cible = type_bien.capitalize() if type_bien else None
    for m in mutations:
        if cible and m.get("type_bien") != cible:
            continue
        if avec_prix_m2 and not m.get("prix_m2"):
            continue
        v = m.get("valeur_fonciere")
        if prix_min is not None and (v is None or v < prix_min):
            continue
        if prix_max is not None and (v is None or v > prix_max):
            continue
        out.append(m)
    return out


def stats_prix_m2(mutations: list[dict]) -> Optional[dict]:
    """Statistiques de prix au m² sur des mutations (médiane, moyenne, quartiles…)."""
    vals = sorted(m["prix_m2"] for m in mutations if m.get("prix_m2"))
    if not vals:
        return None

    def pct(p: float) -> float:
        if len(vals) == 1:
            return vals[0]
        k = (len(vals) - 1) * p
        lo = math.floor(k)
        hi = math.ceil(k)
        if lo == hi:
            return vals[int(k)]
        return vals[lo] * (hi - k) + vals[hi] * (k - lo)

    return {
        "nb_ventes": len(vals),
        "prix_m2_median": round(statistics.median(vals)),
        "prix_m2_moyen": round(statistics.mean(vals)),
        "prix_m2_min": round(min(vals)),
        "prix_m2_max": round(max(vals)),
        "prix_m2_p25": round(pct(0.25)),
        "prix_m2_p75": round(pct(0.75)),
    }


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance en mètres entre deux points (lat/lon en degrés)."""
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(min(1.0, math.sqrt(a)))


def autour(
    mutations: list[dict],
    lat: float,
    lon: float,
    rayon_m: float,
) -> list[dict]:
    """Renvoie les mutations géolocalisées dans un rayon (m), triées par distance,
    chacune enrichie d'une clé ``distance_m``."""
    out = []
    for m in mutations:
        mlat, mlon = m.get("latitude"), m.get("longitude")
        if mlat is None or mlon is None:
            continue
        d = haversine_m(lat, lon, mlat, mlon)
        if d <= rayon_m:
            mm = dict(m)
            mm["distance_m"] = round(d)
            out.append(mm)
    out.sort(key=lambda x: x["distance_m"])
    return out
