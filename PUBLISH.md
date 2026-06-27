# Mode d'emploi — mettre le MCP en ligne

> Pré-requis : avoir confirmé que `python smoke_test.py` renvoie de vrais prix.
> Les étapes « finales » (valider, accepter les CGU, configurer un payout) sont à
> faire **toi-même** dans tes comptes — je ne peux pas accepter de CGU à ta place.

## 0) Socle commun : un dépôt GitHub public
La plupart des plateformes indexent ou déploient **depuis GitHub**. À faire une fois :
1. Crée un repo public, ex. `mcp-immobilier-dvf`.
2. Pousse le contenu du dossier (server.py, dvf_core.py, requirements.txt, pyproject.toml,
   smithery.yaml, README.md, LICENSE, smoke_test.py, test_dvf_core.py).
3. Vérifie que le README s'affiche bien (c'est ta vitrine).

## 1) Smithery (hébergement + découverte) — `smithery.yaml` déjà fourni
1. Va sur smithery.ai → connecte ton compte GitHub → « Add / Deploy server ».
2. Sélectionne le repo. Smithery lit `smithery.yaml` (transport stdio).
3. Lance le déploiement, puis teste un outil (`prix_immobilier`, commune="Lyon").
4. Renseigne la description (copie depuis `LISTING.md`) et publie.

## 2) MCPize (monétisation à l'appel)
1. Connecte le repo / l'endpoint du serveur.
2. Définis le modèle de facturation (per-call, freemium ou abo) — voir `LISTING.md`.
3. Renseigne titre + description + tags (depuis `LISTING.md`), puis publie.
4. Configure le payout (étape perso, dans ton compte).

## 3) Registres MCP (Glama, PulseMCP, mcp.so)
Ils référencent surtout des serveurs **publics sur GitHub**.
- Beaucoup indexent automatiquement les repos contenant un serveur MCP (laisse passer quelques jours).
- Sinon : sur chaque site, cherche « Submit / Add your server » et **colle l'URL du repo**.
- Pour le **registre MCP officiel** : ajouter un `server.json` et soumettre via leur procédure (PR / CLI). Optionnel au début.

## 4) Capafy / Agensi (en tant que skill/connecteur)
1. Crée une nouvelle entrée « skill / connecteur ».
2. Titre + description + exemples de prompts (depuis `LISTING.md`).
3. Lien vers le repo (ou package selon le format demandé), tags `immobilier / dvf / france`.
4. Prix (one-shot ou abo) puis publie.

## Après publication
- **Rafraîchis le listing chaque mois** (les marketplaces classent mieux les actifs).
- Mets à jour la **watchlist du Radar** : statut → « Publié » pour chaque plateforme.
- Réutilise ce moule pour le **2e MCP** (Élu/Collectivités, Agriculture…) : 90 % du code est commun.

## Besoin d'un coup de main sur les formulaires ?
Si tu connectes l'extension **Claude in Chrome**, je peux **naviguer et pré-remplir** les
champs avec toi (titre, description, tags) — tu gardes la main sur le **submit final** et les CGU.
