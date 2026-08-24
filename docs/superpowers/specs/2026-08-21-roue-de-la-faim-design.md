# La Roue de la Faim — Design v1

## Contexte

App web pour choisir un restaurant à Levallois-Perret par tirage aléatoire, sur une DA "espace" (identité visuelle de l'entreprise) plutôt qu'une roue de fortune classique. Build solo, hors du live du collègue, pour avoir un vrai outil réutilisable.

Sources de données déjà en place, hors scope de ce spec :
- Google Sheet "Resaurants" — catalogue de restos, synchronisé chaque semaine depuis OpenDataSoft/OSM via un workflow n8n.
- Google Sheet "Réponses au formulaire 1" — avis internes (auteur, note, commentaire), alimentée par un Google Form dont le menu déroulant "Restaurant" est resynchronisé automatiquement (Apps Script + trigger horaire) depuis la colonne `name` du catalogue.

## Architecture & stack

- **Vanilla JS + Vite**, build 100% statique. `npm run dev` en local, `npm run build` → `dist/`.
- Déploiement Netlify (comme le projet Equans), mais **sans serveur Node/Express** : contrairement à Equans, aucune donnée sensible à protéger côté serveur (pas de clé de service, l'écriture des avis passe par le Google Form, pas par l'app).
- Nouveau dossier `roue-de-la-faim/`, repo Git dédié, indépendant du projet Equans.

## Flux de données

- Les deux onglets Google Sheets sont publiés sur le web en CSV (Fichier → Partager → Publier sur le web) — deux URLs stables, `fetch()` client-side, aucune clé API, aucune authentification.
- Parsing CSV maison (pas de dépendance externe) — le CSV publié par Google est un format standard propre (champs entre guillemets gérés).
- Liste des tags cuisine : colonne `cuisine` du catalogue splittée sur les virgules, trim, dédoublonnée, triée alphabétiquement. Valeur vide/manquante classée sous "Non renseigné".
- Filtre : un resto est retenu si son champ `cuisine` (splitté) contient le tag sélectionné. Option "Tous" = pas de filtre.
- Jointure avis : sur la colonne `name` (exact match) — fiable car le Form ne propose que des noms directement recopiés depuis cette même colonne, donc chaîne garantie identique.
- **Limitation connue** : le dataset OSM n'a pas de champ adresse texte, seulement `meta_geo_point` (lat/lon) et `meta_osm_url`. Intégration carte (Google Maps ou autre) traitée dans un spec séparé, hors scope v1 — un simple lien "Voir sur la carte" généré depuis les coordonnées suffit pour ce v1.

## Parcours utilisateur

1. **Écran d'accueil** : menu déroulant "Type de cuisine" (peuplé dynamiquement + option "Tous"), bouton "Scanner".
2. **Clic sur Scanner** : le resto gagnant est tiré instantanément (`Math.random()` uniforme sur la liste filtrée — pas de pondération par note en v1). L'animation radar tourne ~2-3s pour l'effet suspense, puis se fige sur le résultat déjà déterminé.
3. **Écran résultat** : carte avec nom, tags cuisine, téléphone/site web si disponibles, horaires, lien "Voir sur la carte", et les avis collègues correspondants (auteur, note, commentaire) ou un message "Aucun avis pour l'instant" si la liste est vide pour ce resto.

## Animation radar

- Écran radar SVG : anneaux concentriques, spokes, faisceau en vrai secteur circulaire (deux bords tracés du centre vers le cercle — pas de bidouille CSS avec un carré qui pivote, cause de bug identifiée et corrigée en phase de maquettage visuel).
- Blips **purement décoratifs**, en nombre et position fixes (ne représentent pas les restos filtrés réels — le tirage se fait en coulisses, indépendamment de l'affichage).
- Chaque blip s'illumine quand le faisceau balaie sa position angulaire, puis s'estompe progressivement — comportement radar réaliste (intensité proportionnelle à la proximité angulaire avec l'angle courant du faisceau).

## Cas limites & erreurs

- Filtre sélectionné → 0 resto correspondant : bouton "Scanner" désactivé + message explicite.
- Échec de fetch d'un des deux CSV : message d'erreur visible + bouton "Réessayer" (pas d'écran blanc silencieux).
- Resto tiré sans avis associé : message "Aucun avis pour l'instant" plutôt qu'une carte vide ambiguë.

## Hors scope v1

- Pondération du tirage par les notes internes (juste affichage des avis, tirage reste uniforme).
- Intégration carte/geocoding pour une vraie adresse texte.
- Écriture d'avis directement depuis l'app (reste géré par le Google Form externe).
- Blips représentant dynamiquement les restos filtrés réels.

## Addendum — sélection multiple (proposition phare + alternatives)

Ajouté après le v1 initial, suite à un retour utilisateur pendant le test en conditions réelles.

- `pickSelection(restaurants, count = 5)` remplace `pickWinner` : tire jusqu'à 5 restos distincts (sans doublon, sans remise) dans la liste filtrée via un shuffle Fisher-Yates. Le tirage reste uniforme, cohérent avec le choix v1 de ne pas pondérer par les notes.
- Le 1er élément est la **proposition phare** (carte complète : détails + avis, comme avant). Les 3 suivants sont des **alternatives** affichées en dessous (nom + cuisine).
- Si le filtre donne moins de 5 restos, on affiche ce qu'il y a — pas de proposition inventée ou dupliquée pour compléter à 5.
- Cliquer une alternative permute sa position avec la proposition phare (échange dans le tableau de sélection) et ré-affiche les deux zones. Pas de nouveau spin du radar — c'est un changement de mise en avant, pas un nouveau tirage.

## Addendum — indicateur de distance

- `src/geo.js` : `haversineDistanceMeters` (formule standard, sphère de rayon 6371 km) + `formatDistance` (arrondi à la dizaine de mètres sous 1 km, km avec une décimale au-delà).
- Origine fixe codée dans `main.js` (coordonnées du point de départ, ex. bureau) : `48.892213, 2.29132`.
- Affiché uniquement sur la carte phare (pas sur la liste d'alternatives), juste sous le type de cuisine. Absent si le resto n'a pas de coordonnées valides (cf. limitation OSM déjà documentée).

## Addendum — retrait du téléphone, lien Google Maps

- Le numéro de téléphone n'est plus affiché sur la carte (souvent absent ou mal formaté dans les données OSM) — la donnée reste dans le modèle (`restaurant.phone`), seul l'affichage est retiré.
- Le lien carte pointe maintenant vers une recherche Google Maps combinant nom + coordonnées (`https://www.google.com/maps/search/?api=1&query=...`) plutôt qu'un simple pin sur les coordonnées (`?q=lat,lon`). C'est le format d'URL "Maps Search" de Google — public, documenté, sans clé API, sans rapport avec la limite Google Places API vue plus tôt (celle-ci concernait un appel d'API payant, pas un lien). Résultat généralement plus proche de la vraie fiche du resto (avis, photos, horaires Google) qu'un pin anonyme.

## Arbitrage — pas d'enrichissement Google Places (horaires, avis publics)

Décision explicite (à ne pas rejouer sans nouvelle info) : on reste sur les horaires OSM tels quels (incomplets par endroits, mais gratuits) et sur les avis internes des collègues, plutôt que d'ajouter Google Places API (Place Details) pour compléter les horaires manquants et récupérer des avis publics. Raisons : coût non vérifié pour les horaires, et pour les avis en plus un SKU plus cher (Enterprise + Atmosphere), une limite à ~5 avis par fiche, et des règles d'attribution/non-stockage prolongé dans les CGU Google. Introduirait une dépendance payante dans un projet jusqu'ici entièrement gratuit. À reconsidérer seulement si un vrai besoin se fait sentir.
