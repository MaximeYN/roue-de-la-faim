# Carte de rues sur la fiche resto — Design

## Contexte

Ajout demandé pour le POC : sur la carte de la proposition phare, afficher un fond de carte au style de l'app — tracé des rues en jaune (accent existant), fond transparent — sur le modèle de la visualisation "Le genre des rues d'une ville" vue sur data.gouv.fr. Deux repères sur cette carte : un fixe sur le point de départ (coordonnées déjà utilisées pour la distance), un qui se déplace sur le resto actuellement en position phare.

## Itérations écartées avant ce design

- **Leaflet + tuiles de carte standard** : rejeté — une tuile de carte est une image bitmap qui fusionne rues/bâtiments/fond ; impossible d'en extraire "juste les rues en jaune sur fond transparent" par un filtre CSS. Nécessite le tracé vectoriel des rues, pas une image.
- **Une carte pré-calculée par resto (217 fetches Overpass, pipeline n8n avec cache par resto)** : rejeté après retour utilisateur — sur-complexifie le problème. Le tracé des rues ne dépend pas du resto : c'est la même ville pour tout le monde. Un seul fetch pour toute la commune suffit ; seul le repère resto bouge, avec des coordonnées déjà présentes dans le catalogue.

## Architecture (simplifiée)

**Un seul tracé de rues pour toute la commune, récupéré une fois, jamais en direct pendant l'usage.**

Testé en direct : requête Overpass bornée à la commune (`area["name"="Levallois-Perret"]["admin_level"="8"]`, filtrée sur les vraies rues) → 2,8s, 339 tronçons, ~2000 points de coordonnées, ~264 Ko brut (avec métadonnées Overpass). Une fois simplifié (juste les points, sans id/bounds/nodes), estimé à ~30 Ko — assez petit pour être un fichier statique embarqué avec l'app, pas besoin de passer par Sheets/n8n pour ça : la carte ne dépend pas du catalogue de restos et n'a aucune raison de changer tant que le réseau de rues de Levallois ne change pas.

- **Fichier statique** `src/levallois-streets.json` (généré une fois, committé dans le repo) : liste de tronçons, chaque tronçon une liste de points `[lat, lon]`. Coordonnées arrondies à 5 décimales.
- Vérifié : le point de départ (48.892213, 2.29132) tombe bien dans l'emprise des rues récupérées (48.886-48.903 lat, 2.272-2.301 lon) — les restos du catalogue, issus de la même zone OpenDataSoft, y tiennent aussi (marge de sécurité ajoutée dans la projection au cas où).

## Côté app

- **`src/streetmap.js`** :
  - Import direct de `levallois-streets.json` (fichier statique, pas de fetch réseau).
  - Fonction de projection : un seul repère fixe pour toute la carte, dérivé de l'emprise des rues (bounds min/max lat/lon + marge), converti en coordonnées SVG locales (correction de la longitude par le cosinus de la latitude moyenne).
  - Fonction de rendu de la carte : dessine tous les tronçons en `<polyline>` couleur accent (`#fbf192`), fond transparent — rendu **une seule fois**, la carte elle-même ne change jamais.
  - Repère fixe (point de départ) : rendu une fois avec la carte, à la position projetée du point d'origine déjà utilisé pour la distance (`main.js`).
  - Repère resto : élément séparé, repositionné (pas re-rendu) à chaque resto mis en phare — planète à anneaux (icône réutilisée depuis `radar.js`, pas dupliquée), pour la distinguer visuellement du repère de départ (autre style, à définir en implémentation — ex. un point simple).
- **Câblage** : la carte + le repère de départ sont rendus une fois à l'initialisation. `renderSelection()` (main.js) met juste à jour la position du repère resto avec les coordonnées déjà connues du resto en phare (`restaurant.lat`, `restaurant.lon`) — aucune nouvelle donnée à charger par resto.
- **Affichage** : dans l'encart de la carte résultat, visible dès qu'un resto est en phare (premier tirage et après clic sur une alternative) — cohérent avec le reste (distance, lien Maps).
- **Absence gracieuse** : si le resto phare n'a pas de coordonnées valides (cas déjà géré ailleurs dans l'app), le repère resto ne s'affiche simplement pas — la carte et le repère de départ restent visibles.

## Ce qui disparaît par rapport à l'itération précédente

Plus de pipeline n8n dédié, plus de nouvel onglet Google Sheet "Cartes", plus de champ `osmId` à ajouter au modèle Restaurant, plus de jointure par resto, plus de delta hebdomadaire, plus de boucle avec pause entre appels Overpass. Une seule ressource statique, générée une fois.

## Hors scope

- Pas de zoom/pan interactif — carte statique, taille fixe dans l'encart.
- Pas de mise à jour automatique si le réseau de rues de Levallois change un jour (peu probable à l'échelle de ce POC) — régénération manuelle du fichier statique si besoin.

## Implémenté

`src/streetmap.js` + `src/levallois-streets.json` (339 tronçons, généré une fois via la requête Overpass décrite plus haut). Repère de départ fixe, repère resto réutilisant l'icône planète à anneaux du radar (extraite en `RINGED_PLANET_ICON`, partagée plutôt que dupliquée). Vérifié en direct : origine et deux vraies coordonnées de restos se projettent correctement dans le canvas 300×300. Build : 14,9 Ko gzip au total.

## Addendum — encart à deux colonnes, masqué avant le premier scan

- L'encart résultat devient un seul bloc rectangulaire (`.result-layout`) contenant deux colonnes : infos texte à gauche (`#result-container`, layout inchangé), plan à droite (`#streetmap-container`, largeur fixe 160px, colonne empilée en dessous sur mobile).
- Masqué entièrement tant qu'aucun resto n'est en phare : `.result-layout:has(#result-container:empty) { display: none; }` — pure CSS, s'appuie sur le cycle `innerHTML = ""` / rempli déjà existant, pas de nouvel état JS à gérer.
- `main` élargi (480px → 640px) pour laisser respirer les deux colonnes.

## Addendum — mise à l'échelle + ligne décorative départ→resto

- `main` réélargi (640px → 960px, largeur fluide 94%) et colonne carte en `clamp(180px, 32%, 340px)` plutôt qu'une largeur fixe — s'adapte à la taille d'écran au lieu de rester cantonné à une bande étroite.
- Ligne pointillée décorative entre le repère de départ et le repère resto, mise à jour à chaque changement de resto phare. Purement esthétique — pas de tracé routier réel (tout se fait à pied, l'itinéraire précis reste sur le lien Google Maps).

## Addendum — le chemin suit vraiment les rues (pas à vol d'oiseau)

Retour utilisateur : la ligne droite ne convainc pas visuellement, il faut que le trait suive le tracé réel des rues. Nouveau `src/routing.js` : construit un graphe de marche à partir des mêmes tronçons déjà chargés (`levallois-streets.json`) — les points consécutifs d'une rue deviennent des nœuds reliés, et deux rues qui partagent une coordonnée exacte (une vraie intersection OSM) se retrouvent connectées à cet endroit, sans passe de détection séparée. Plus court chemin par Dijkstra (poids = distance haversine réelle), nœud de départ pré-calculé une fois (le point de départ ne bouge pas), nœud resto et chemin recalculés à chaque resto mis en phare.

Vérifié sur les vraies données : 1494 nœuds uniques, graphe construit en ~11ms, calcul du chemin en ~4,5ms — imperceptible au moment du reveal, pas de lag notable. `ponytail:` Dijkstra en O(V²) (scan de tableau plutôt que tas de priorité) — largement suffisant pour ~2000 nœuds, à revoir seulement si la carte couvre un jour une zone bien plus grande.

## Addendum — animation de zoom sur le trajet

Demande : ne pas afficher toute la commune en permanence, zoomer sur juste ce qui est utile (le trajet départ→resto) pour que les restos proches restent lisibles.

Point technique à gérer : zoomer bêtement tout le groupe SVG ferait grossir les traits de rue et l'icône planète avec le zoom — illisible à fort zoom. Séparation en deux couches :
- **`.streetmap-viewport`** (rues + trajet en surbrillance) : c'est ce groupe qui est zoomé/animé. Épaisseur de trait maintenue constante via `vector-effect="non-scaling-stroke"` (attribut SVG standard).
- **Repères (départ, resto)** : rendus *hors* du groupe zoomé, repositionnés (jamais mis à l'échelle) à chaque frame — taille de pin constante à l'écran quel que soit le niveau de zoom, comme sur une vraie carte.

`computeZoomTarget(points)` : cadre le trajet (ou juste départ+resto si aucun chemin trouvé), avec un facteur de marge (×1.5), une distance de vue minimale (jamais plus serré qu'un certain seuil, pour éviter un cadrage absurde sur un resto juste à côté) et un zoom maximal plafonné. Animation par interpolation (ease-out cubique, 700ms) via `requestAnimationFrame`, même pattern que le radar — pas de transition CSS sur `viewBox` (peu fiable en animation).

Vérifié sur de vraies données : resto proche (McDonald's) → zoom ×4,3 ; resto plus loin (B'bim) → zoom ×2,1. Comportement attendu confirmé.
