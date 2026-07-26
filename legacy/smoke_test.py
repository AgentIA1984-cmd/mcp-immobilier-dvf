"""
Test rapide SANS Node : appelle directement les outils du serveur.
Réseau requis (interroge les API ouvertes data.gouv.fr / Etalab).

Lancement (dans le dossier du projet, environnement installé) :
    python smoke_test.py
"""

import json
import server


def show(titre, obj):
    print("\n=== " + titre + " ===")
    print(json.dumps(obj, ensure_ascii=False, indent=2)[:900])


if __name__ == "__main__":
    show("rechercher_commune('Lyon')", server.rechercher_commune("Lyon"))
    show("prix_immobilier('Lyon', type_bien='Appartement')",
         server.prix_immobilier("Lyon", type_bien="Appartement"))
    show("tendance_prix('Lyon', 'Appartement', 4)",
         server.tendance_prix("Lyon", "Appartement", 4))
    print("\nSi tu vois des chiffres ci-dessus, le serveur fonctionne. ✅")
