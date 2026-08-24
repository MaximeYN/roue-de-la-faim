# Carte de rues sur la fiche resto — Design

## Contexte

Ajout demandé pour le POC : sur la carte de la proposition phare, afficher un fond de carte au style de l'app — tracé des rues en jaune (accent existant), fond transparent, sur le modèle de la visualisation "Le genre des rues d'une ville" vue sur data.gouv.fr — avec une planète à anneaux (icône déjà utilisée sur le radar) positionnée à l'emplacement du resto.

Piste écartée en cours de route : Leaflet + tuiles de carte standard (raster). Rejeté après vérification — une tuile de carte classique est une image bitmap qui fusionne rues/bâtiments/fond en un seul PNG ; impossible d'en extraire "juste les rues en jaune sur fond transparent" par un filtre CSS. Ce rendu nécessite le tracé vectoriel des rues (coordonnées ligne par ligne), pas une image de carte.

## Architecture

**Aucun appel Overpass en direct depuis le navigateur.** Testé : le service public Overpass met jusqu'à 8s à répondre et peut renvoyer une erreur "trop occupé" sur des appels rapprochés — inacceptable au moment du reveal, surtout pendant une démo live. Le tracé des rues est donc pré-calculé une fois par semaine côté n8n (comme le catalogue restos et les avis) et mis en cache dans un 3ᵉ onglet Google Sheet ; l'app ne fait que lire ce cache déjà prêt, rendu 100% côté client, sans dépendance réseau externe au moment critique.

## Pipeline n8n (nouveau workflow séparé)

Workflow distinct du sync catalogue existant plutôt qu'une étape ajoutée dessus — la boucle par resto avec pause entre appels est un pattern de nœuds différent (Split in Batches + Wait) du pipeline linéaire actuel, plus simple à isoler qu'à greffer. Déclenchement hebdomadaire, décalé après le sync catalogue pour lire une liste à jour.

1. Lit la feuille "Resaurants" (catalogue actuel) et la feuille "Cartes" (cache existant, peut être vide au premier run).
2. Calcule le delta : restos présents dans "Resaurants" mais absents de "Cartes" (par `meta_osm_id`).
3. Pour chaque resto du delta, requête Overpass ciblée sur ses coordonnées :
   `way(around:1000,LAT,LON)["highway"~"^(primary|secondary|tertiary|residential|unclassified|primary_link|secondary_link|tertiary_link)$"];out geom;`
   Le filtre sur le type de route se fait côté serveur Overpass (pas de post-filtrage après coup) — élimine trottoirs/allées/chemins qui n'apportent rien au rendu. Vérifié : ce filtre fait passer un point dense de 2841 tronçons/13 800 points bruts à 529 tronçons/3 146 points (~49 Ko estimés).
4. Pause de 2-3s entre chaque appel Overpass (limite du service public constatée en test — 8s de latence et erreurs "trop occupé" sur appels rapprochés).
5. Coordonnées arrondies à 5 décimales (précision au mètre, largement suffisant à cette échelle) — réduit la taille sans perte visible.
6. Écrit une ligne par resto dans "Cartes" : `osm_id`, `geometry` (JSON — liste de tronçons, chaque tronçon une liste de points `[lat, lon]`).

Les runs suivants ne retraitent que les nouveaux restos apparus dans le catalogue depuis le dernier passage — rapide, pas de resollicitation inutile d'Overpass. Rayon de 1km, choix explicite de l'utilisateur (vue large, "on n'a pas peur de marcher").

## Côté app

- **Nouveau champ `osmId`** dans le modèle Restaurant (`normalizeRestaurant`, data.js) — actuellement absent, nécessaire pour joindre le cache "Cartes" de façon fiable (le nom seul n'est pas garanti unique).
- **Nouveau `src/streetmap.js`** :
  - `fetchStreetMaps(url)` — fetch + parse la 3ᵉ feuille CSV publiée, retourne une Map indexée par `osmId` → liste de tronçons (chaque tronçon une liste de points `{lat, lon}`).
  - Fonction de projection : convertit les points lat/lon en coordonnées SVG locales centrées sur le resto (approximation plane standard à cette échelle — 1km — avec correction de la longitude par le cosinus de la latitude du point central). Le resto lui-même tombe par construction au centre du repère (0,0).
  - Fonction de rendu : génère le SVG — tronçons en `<polyline>` couleur accent (`#fbf192`), fond transparent, icône planète à anneaux (réutilisée depuis `radar.js`, pas dupliquée — à extraire dans un endroit partagé) positionnée au centre.
- **Câblage** : `main.js` charge la 3ᵉ CSV en parallèle des deux autres au démarrage (même pattern que `fetchRestaurants`/`fetchAvis`) ; `renderSelection()` passe la géométrie du resto actuellement en position phare (par son `osmId`) à la fonction de rendu de `streetmap.js`.
- **Affichage** : uniquement sur la carte phare (premier tirage et après clic sur une alternative, jamais sur la liste d'alternatives elle-même) — cohérent avec le reste (distance, lien carte).
- **Absence gracieuse** : si le resto phare n'a pas encore d'entrée dans "Cartes" (ajouté au catalogue récemment, pas encore traité par n8n, ou zéro rue majeure trouvée à proximité), la zone carte reste simplement vide — pas de bannière d'erreur, cohérent avec le traitement des autres champs optionnels (téléphone, site web absent).

## Hors scope

- Pas de zoom/pan interactif — carte statique, taille fixe dans l'encart.
- Pas de mise à jour en cas de changement de rayon a posteriori — 1km fixé pour ce POC, à revoir si besoin.
- Pas de fallback vers un fetch Overpass en direct si l'entrée manque en cache — absence simple, cohérent avec le choix "fiabilité avant tout" pour la démo.
