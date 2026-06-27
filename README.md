# MCP Immobilier France (DVF)

[![MCPize](https://mcpize.com/badge/@contact.agentia1984/immobilier-france)](https://mcpize.com/mcp/immobilier-france)

> Serveur **MCP** qui donne à un agent IA (Claude, Cursor, Codex…) l'accès aux **prix et transactions immobilières réels en France**, à partir des **données ouvertes officielles DVF** (Demandes de Valeurs Foncières, Etalab / data.gouv.fr).

> 100 % open data, **gratuit, sans clé d'API, sans inscription**. Aucune dépendance payante.
>
> 🇫🇷 **Couvre toute la France** — n'importe quelle commune, n'importe quelle adresse (métropole + DOM). C'est un produit **national**, vendable partout. Les villes citées en exemple ne sont que des illustrations.

---

## 🔧 Les 6 outils

| Outil | Ce qu'il fait |
|---|---|
| `rechercher_commune` | Trouve le code INSEE d'une ville (à utiliser en premier si on ne le connaît pas). |
| `prix_immobilier` | Prix au m² d'une commune : médiane, moyenne, quartiles, min/max, nb de ventes. |
| `transactions` | Liste des ventes récentes (date, type, surface, pièces, prix, prix/m²). |
| `transactions_autour_adresse` | Ventes comparables autour d'une adresse (rayon en mètres). |
| `estimer_bien` | Estime un bien par comparaison avec les ventes proches (fourchette + fiabilité). |
| `tendance_prix` | Évolution du prix au m² médian sur plusieurs années (+ variation %). |

**Exemples de questions auxquelles l'agent saura répondre (partout en France) :**
- « Quel est le prix au m² des appartements à Lyon ? »
- « Estime une maison de 90 m² à Bordeaux, 12 rue Sainte-Catherine. »
- « Montre-moi les 10 dernières ventes autour du 4 place Bellecour à Lyon, rayon 800 m. »
- « Comment ont évolué les prix à Nantes sur 4 ans ? »

---

## 📦 Installation

Prérequis : **Python 3.10+**.

```bash
# avec uv (recommandé)
uv venv && uv pip install -r requirements.txt

# ou avec pip
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Connect via MCPize

Use this MCP server instantly with no local installation:

```bash
npx -y mcpize connect @contact.agentia1984/immobilier-france --client claude
```

Or connect at: **https://mcpize.com/mcp/immobilier-france**

## ▶️ Lancer le serveur

```bash
python server.py      # transport stdio
```

## 🔌 Brancher dans un client MCP

**Claude Desktop / Claude Code / Cursor** — ajouter dans la config MCP :

```json
{
  "mcpServers": {
    "immobilier-dvf": {
      "command": "python",
      "args": ["/chemin/absolu/vers/server.py"]
    }
  }
}
```

(Adapter `command` à `python3` ou au binaire de votre venv si besoin.)

## ✅ Tester

```bash
# tests de la logique (hors-ligne, sans réseau)
python test_dvf_core.py

# test réel SANS Node (recommandé) — appelle les outils en direct (réseau requis)
python smoke_test.py

# (option) via l'inspecteur MCP officiel — nécessite Node.js
npx @modelcontextprotocol/inspector python server.py
# Puis, DANS l'interface web de l'inspecteur (onglet « Tools »), choisir un outil
# et le lancer, par ex. prix_immobilier avec commune="Lyon".
# ⚠️ prix_immobilier(...) n'est PAS une commande à taper dans le terminal.
```

---

## 🛰️ Sources de données (toutes officielles et gratuites)

- **Transactions** : géo-DVF — `https://files.data.gouv.fr/geo-dvf/latest/csv/{année}/communes/{dep}/{insee}.csv`
- **Communes** (nom → INSEE) : `https://geo.api.gouv.fr/communes`
- **Géocodage d'adresse** (BAN) : `https://api-adresse.data.gouv.fr/search`

**Bon à savoir**
- Les données DVF couvrent les ventes jusqu'à l'**année civile précédente** (mise à jour ~2×/an). Le serveur prend par défaut la dernière année disponible.
- Le **prix au m²** est calculé en rapportant la valeur foncière de la mutation à la surface bâtie résidentielle, avec un filtre anti-aberrations (200–30 000 €/m²). C'est une mesure robuste mais **indicative** (une mutation peut mêler plusieurs lots/terrains).
- Couverture : France métropolitaine + DOM. L'**Alsace-Moselle (57, 67, 68)** et **Mayotte** ne sont pas dans DVF (cadastre/registre différent).

---

## 💰 Mettre en vente

- **Smithery** : `smithery.yaml` fourni (déploiement stdio). Pousser le dépôt et suivre smithery.ai/docs.
- **MCPize** : héberger le serveur et facturer à l'appel (per-call / abo).
- **Capafy / Agensi** : packager comme skill « connecteur immobilier ».
- Pensez à un **listing soigné** (titre, description, exemples de prompts ci-dessus) et à le **rafraîchir mensuellement** (les marketplaces classent mieux les listings actifs).

## ⚠️ Avertissement

Données publiques fournies « en l'état ». Les estimations sont **indicatives**, basées sur des ventes passées, et ne tiennent pas compte de l'état, de l'étage ou des prestations du bien. Elles ne remplacent pas une expertise immobilière.

## 📄 Licence

MIT — réutilisation libre. Données DVF sous Licence Ouverte (Etalab).