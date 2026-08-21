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
