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
- ~~Le lien carte pointe vers une recherche Google Maps combinant nom + coordonnées~~ — abandonné : échoue purement et simplement quand Google n'arrive pas à recouper le nom avec un lieu proche de ces coordonnées (constaté en usage réel sur "Itto" : "Impossible de trouver Itto 48.89...,2.29... dans Google Maps"). Remplacé par un lien d'itinéraire basé uniquement sur les coordonnées (`https://www.google.com/maps/dir/?api=1&destination=lat,lon`) — fonctionne toujours (pas de dépendance au matching par nom) et donne directement l'itinéraire plutôt qu'un résultat de recherche. Toujours le format d'URL "Maps URLs" de Google — public, documenté, sans clé API, sans rapport avec la limite Google Places API vue plus tôt.

## Addendum — charte graphique Yuri&Neil

Couleurs extraites par échantillonnage pixel précis (pas à l'œil) sur la charte graphique de l'entreprise (Google Slides) :
- Fond quasi-noir `#0e0e0e` avec halo violet sombre `#291f36` (dégradé radial).
- Accent jaune pâle : `#fbf192` (CTA, contours) et `#fff8be` (texte secondaire, cuisine).
- Texte blanc pur.
- Remplace l'ancienne palette cyan/teal (`#2dd4bf`) qui ne faisait pas partie de la charte.

Blips radar remplacés par 4 icônes ligne fine reprenant le style des pictogrammes espace de la charte (trouvés slide 88, motif de fond répété) : planète à anneaux, planète à lignes ondulées, planète à 4 cratères pleins, planète à cratères creux — cyclées sur les positions fixes. La variante "planète souriante" (visage aux yeux fermés) a été écartée par choix.

Bouton "Scanner" traité comme CTA plein (fond accent, texte sombre), cohérent avec le traitement des boutons d'action dans la charte (ex. "SATELLISEZ VOTRE MARQUE").

## Addendum — dispersion organique + radar toujours animé

- Les 6 planètes ne sont plus alignées sur un même rayon : angle *et* distance au centre tirés aléatoirement à chaque création du radar (une fois par chargement de page), pour un rendu plus organique. Pas de logique anti-chevauchement entre les 6 points (`ponytail:` documenté dans le code) — à ajouter seulement si ça se révèle visuellement gênant en pratique.
- Le faisceau tourne en continu même hors scan (rotation lente, ~9s/tour), avec le même effet de luminosité des planètes au passage qu'en mode scan. Au clic sur "Scanner", transition sans à-coup depuis l'angle courant vers le balayage rapide existant (3 tours, 2.6s, vitesse inchangée) ; une fois le résultat révélé, le radar reprend sa rotation lente depuis l'angle final — jamais de saut brusque d'angle entre les deux modes.

## Addendum — refonte typographique du haut de l'app

Exploration à 3 directions (panneau structuré, masthead éditorial, hero centré avec halo), chacune avec sa propre police via Google Fonts — comparées visuellement avant implémentation. Retenu : le titre + les contrôles en pilule de la direction "hero centré" (police Outfit, halo lumineux derrière le titre), avec le sous-titre de la direction "masthead éditorial" ("Où manger à Levallois quand on n'a pas d'idée"), unifié en Outfit plutôt que mélanger deux polices.

- Police Outfit (Google Fonts) remplace `system-ui` comme police principale.
- Dropdown et bouton "Scanner" alignés à la même hauteur (bug d'alignement du screenshot initial corrigé) — regroupés dans une rangée `.control-row` sous le label, lui-même redessiné en petit label discret (majuscules, espacé) plutôt que texte brut.
- Contrôles en forme de pilule (`border-radius: 999px`) plutôt que rectangulaires, cohérent avec l'esthétique arrondie de la charte.

## Addendum — filtrage des restos sans nom

Bug remonté en usage réel : la catégorie "Kebab" affichait une entrée dont le nom apparaissait comme "- kebab" dans la liste d'alternatives. Vérifié sur la vraie donnée : ce n'est pas un nom littéral, c'est un nom vide (`name: ""`) affiché via le gabarit `${nom} — ${cuisine}` de `renderAlternates`. Fix à la source plutôt qu'en affichage : `fetchRestaurants` (data.js) filtre désormais les lignes à nom vide après normalisation — exclu de partout (dropdown, tirage, alternatives) en un seul endroit. Sur la donnée réelle, ça retire 6 fiches sans nom sur 223 (217 restants).

## Addendum — exclusion des restos probablement fermés

Demande : ne garder que les restos probablement encore ouverts, avec uniquement des données gratuites/ouvertes (pas d'API Google payante).

Piste écartée : croisement SIRET ↔ registre SIRENE (INSEE, gratuit officiel) pour vérifier le statut actif. Vérifié : seulement 2 restos sur 223 ont un SIRET renseigné dans les données OSM — trop rare pour être une solution générale. Une recherche par nom dans SIRENE serait possible mais fragile (rapprochement nom-commercial ↔ nom-légal-de-société non fiable) — non retenu.

Piste retenue : `isLikelyStillOpen` (data.js) exclut les restos dont `meta_last_update` (dernière édition OSM) date de 5 ans ou plus — seul signal gratuit disponible. Heuristique imprécise par nature (un resto stable jamais corrigé peut être encore ouvert sans avoir été édité), documentée comme telle dans le code. Sur la donnée réelle : 44 restos sur 223 non touchés depuis 5+ ans. Combiné au filtre des noms vides : 174 restos restants sur 223 (~22% exclus au total) — à surveiller si ça s'avère trop agressif en usage réel.

## Arbitrage — pas d'enrichissement Google Places (horaires, avis publics)

Décision explicite (à ne pas rejouer sans nouvelle info) : on reste sur les horaires OSM tels quels (incomplets par endroits, mais gratuits) et sur les avis internes des collègues, plutôt que d'ajouter Google Places API (Place Details) pour compléter les horaires manquants et récupérer des avis publics. Raisons : coût non vérifié pour les horaires, et pour les avis en plus un SKU plus cher (Enterprise + Atmosphere), une limite à ~5 avis par fiche, et des règles d'attribution/non-stockage prolongé dans les CGU Google. Introduirait une dépendance payante dans un projet jusqu'ici entièrement gratuit. À reconsidérer seulement si un vrai besoin se fait sentir.
