# La Roue de la Faim

App pour tirer au sort un restaurant à Levallois-Perret par type de cuisine, via une animation radar.

## Setup

```bash
npm install
cp .env.example .env
```

Renseigner dans `.env` les deux URLs de CSV publiés (voir "Sources de données" ci-dessous).

## Lancer en local

```bash
npm run dev
```

## Build de production

```bash
npm run build   # génère dist/
npm run preview # sert dist/ en local pour vérifier avant déploiement
```

## Tests

```bash
npm test
```

## Sources de données

Deux onglets Google Sheets publiés sur le web en CSV (`Fichier → Partager → Publier sur le web`) :

- `VITE_RESTOS_CSV_URL` — onglet "Resaurants" (catalogue, synchronisé depuis OpenDataSoft/OSM via n8n).
- `VITE_AVIS_CSV_URL` — onglet "Réponses au formulaire 1" (avis internes, alimenté par un Google Form).

## Déploiement

Netlify, branché sur ce repo : commande de build `npm run build`, dossier de publication `dist` (voir `netlify.toml`). Penser à définir `VITE_RESTOS_CSV_URL` et `VITE_AVIS_CSV_URL` dans les variables d'environnement Netlify — sans elles le build réussit mais l'app ne charge aucune donnée.

## Hors scope v1

- Pas de pondération du tirage par les notes (tirage uniforme).
- Pas d'intégration carte/geocoding pour une adresse texte (le dataset OSM n'a que des coordonnées).
- Pas d'écriture d'avis depuis l'app — ça reste géré par le Google Form.
