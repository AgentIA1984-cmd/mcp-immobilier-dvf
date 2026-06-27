# Texte de listing (à copier-coller sur les marketplaces)

## Nom
**MCP Immobilier France (DVF)** — *France Real Estate (DVF)*

## Accroche (tagline, ~1 ligne)
- FR : Prix et ventes immobilières **réelles partout en France**, depuis les données officielles DVF — gratuit, sans clé.
- EN : Real French real-estate prices & sales from official open data (DVF). Any town, any address.

## Description courte (2-3 lignes)
Donne à ton agent IA l'accès aux transactions immobilières réelles en France (open data DVF / Etalab). Prix au m², ventes récentes, comparables autour d'une adresse, estimation d'un bien et tendance sur plusieurs années. 100 % gratuit, sans clé d'API.

## Description longue
Ce serveur MCP transforme les **Demandes de Valeurs Foncières (DVF)** — la base officielle des ventes immobilières en France — en outils directement utilisables par un agent IA (Claude, Cursor, Codex…).

Couvre **toute la France** (métropole + DOM), n'importe quelle commune ou adresse. Aucune dépendance payante : tout repose sur des API publiques gratuites (géo-DVF, BAN, API Découpage administratif).

**Outils inclus :**
- `rechercher_commune` — trouver le code INSEE d'une ville
- `prix_immobilier` — prix au m² (médiane, quartiles, min/max, nb de ventes)
- `transactions` — ventes récentes d'une commune
- `transactions_autour_adresse` — ventes comparables autour d'une adresse (rayon)
- `estimer_bien` — estimation par comparaison (fourchette + fiabilité)
- `tendance_prix` — évolution du prix au m² sur plusieurs années

**Idéal pour :** agents immobiliers, courtiers, conseillers, assistants de prospection, outils d'estimation, chatbots immo.

## Exemples de prompts
- « Prix au m² des appartements à Lyon ? »
- « Estime une maison de 90 m² à Bordeaux, 12 rue Sainte-Catherine. »
- « Ventes comparables autour du 4 place Bellecour, rayon 800 m. »
- « Évolution des prix à Nantes sur 4 ans ? »

## Tags / mots-clés
`immobilier` `real-estate` `france` `dvf` `etalab` `open-data` `property-prices` `estimation` `mcp`

## Catégorie
Données / Immobilier (Data · Real estate)

## Idée de tarification (à toi de décider)
- **MCPize (à l'appel)** : palier gratuit (ex. 20 appels/mois) puis ~0,01–0,03 $/appel, ou abo ~5–9 $/mois.
- **Capafy / Agensi (skill)** : one-shot 3–9 $, ou abonnement mensuel.
- Argument de vente : **données officielles, gratuites en source, couverture nationale** — l'agent paie la **commodité** (outil prêt à l'emploi), pas la donnée.

## Avertissement (à inclure)
Estimations indicatives basées sur les ventes passées (DVF) ; ne remplacent pas une expertise. Données publiques fournies « en l'état ».
