"""
Tests hors-ligne de la logique métier (dvf_core), sans réseau.
Lancement : python test_dvf_core.py
"""

import dvf_core as core

# CSV factice au format géo-DVF (colonnes utiles uniquement, ordre libre).
MOCK_CSV = """id_mutation,date_mutation,nature_mutation,valeur_fonciere,adresse_numero,adresse_nom_voie,code_postal,code_commune,nom_commune,type_local,surface_reelle_bati,nombre_pieces_principales,surface_terrain,longitude,latitude
M1,2024-03-10,Vente,250000,12,RUE DE MEAUX,77410,77118,Claye-Souilly,Appartement,50,2,,2.6905,48.9505
M2,2024-05-20,Vente,400000,5,RUE DU PARC,77410,77118,Claye-Souilly,Maison,100,4,300,2.6920,48.9520
M3,2024-06-01,Vente,300000,8,AVENUE GARE,77410,77118,Claye-Souilly,Appartement,60,3,,2.7000,48.9600
M4,2024-07-15,Vente,50000000,1,RUE CHATEAU,77410,77118,Claye-Souilly,Appartement,40,2,,2.6900,48.9500
M5,2024-08-01,Vente,600000,20,RUE LONGUE,77410,77118,Claye-Souilly,Maison,80,3,400,2.6910,48.9510
M5,2024-08-01,Vente,600000,20,RUE LONGUE,77410,77118,Claye-Souilly,Maison,40,2,,2.6910,48.9510
M6,2024-09-01,Echange,200000,3,RUE COURTE,77410,77118,Claye-Souilly,Appartement,50,2,,2.6900,48.9500
"""


def approx(a, b, tol=1.0):
    return abs(a - b) <= tol


def run():
    rows = core.parse_csv(MOCK_CSV)
    assert len(rows) == 7, f"attendu 7 lignes, obtenu {len(rows)}"

    muts = {m["id_mutation"]: m for m in core.aggreger_mutations(rows)}
    assert len(muts) == 6, f"attendu 6 mutations, obtenu {len(muts)}"

    # prix au m² simples
    assert muts["M1"]["prix_m2"] == 5000, muts["M1"]["prix_m2"]
    assert muts["M2"]["prix_m2"] == 4000, muts["M2"]["prix_m2"]
    # valeur aberrante -> écartée (hors bornes)
    assert muts["M4"]["prix_m2"] is None, "M4 aurait dû être écarté (prix/m² aberrant)"
    # échange -> pas de prix/m²
    assert muts["M6"]["prix_m2"] is None, "M6 (Echange) ne doit pas avoir de prix/m²"
    # mutation multi-lignes : surfaces additionnées (80+40=120), 600000/120=5000
    assert approx(muts["M5"]["surface_bati"], 120.0), muts["M5"]["surface_bati"]
    assert muts["M5"]["prix_m2"] == 5000, muts["M5"]["prix_m2"]
    assert muts["M5"]["type_bien"] == "Maison"

    # filtre par type
    maisons = core.filtrer(list(muts.values()), type_bien="Maison", avec_prix_m2=True)
    assert {m["id_mutation"] for m in maisons} == {"M2", "M5"}, maisons

    # stats prix/m² (M1=5000, M2=4000, M3=5000, M5=5000) médiane=5000
    sel = core.filtrer(list(muts.values()), avec_prix_m2=True)
    s = core.stats_prix_m2(sel)
    assert s["nb_ventes"] == 4, s
    assert s["prix_m2_median"] == 5000, s
    assert s["prix_m2_min"] == 4000 and s["prix_m2_max"] == 5000, s

    # département depuis INSEE
    assert core.departement_depuis_insee("77118") == "77"
    assert core.departement_depuis_insee("2A004") == "2A"
    assert core.departement_depuis_insee("97411") == "974"
    assert core.departement_depuis_insee("75056") == "75"

    # haversine : ~1 degré de latitude ≈ 111 km
    d = core.haversine_m(48.0, 2.0, 49.0, 2.0)
    assert 110000 < d < 112000, d

    # autour : rayon 500 m autour du point base -> M1, M2, M5 (M3 ~1.3 km exclu)
    proches = core.autour(sel, 48.9500, 2.6900, 500)
    ids = [m["id_mutation"] for m in proches]
    assert "M3" not in ids, ids
    assert set(ids) == {"M1", "M2", "M5"}, ids
    # tri par distance croissante
    dists = [m["distance_m"] for m in proches]
    assert dists == sorted(dists), dists

    print("OK — tous les tests passent.")
    print(f"  mutations: {len(muts)} | ventes avec prix/m²: {s['nb_ventes']} | "
          f"médiane: {s['prix_m2_median']} €/m² | comparables <500m: {len(proches)}")


if __name__ == "__main__":
    run()
