# Studio de publications

Outil web 100 % statique qui génère une publication Instagram 1080×1080 à partir d'un ou de plusieurs
produits d'une boutique Shopify. On choisit un produit, l'outil remplit le visuel, on ajuste directement
sur l'image, on exporte en PNG.

- **Zéro coût** : aucun serveur, aucun abonnement, seulement des paliers gratuits.
- **Set and forget** : hébergé sur GitHub Pages, déployé par GitHub Actions à chaque push sur `main`.
- **Indépendant** : pas de Canva, pas d'app Shopify. Le site est générique ; un fichier de connexion le branche à une boutique.
- **Tout dans le navigateur** : catalogue, rendu, détourage et appel IA se font côté client.

En ligne : <https://morialkar.github.io/post-studio/>

## Fichier de connexion

Le site ne contient aucune configuration. Au premier usage sur un poste, on lui donne un fichier JSON
(voir [`connexion.exemple.json`](connexion.exemple.json)) ; il est gardé dans le navigateur.

Sans fichier, on peut aussi taper l'adresse du site (le domaine public, ex. `www.ma-boutique.com`, ou le
`.myshopify.com`) : l'outil trouve le domaine `.myshopify.com` dans le `/meta.json` que publie toute
boutique Shopify. « Configurer avec une clé Gemini… » ouvre le formulaire complet (adresse, clé Gemini,
modèle, langue, pays), qui connecte l'outil ou **exporte le fichier de clé** à donner à une collègue.
Une fois connecté, « Réglages » rouvre ce formulaire.

| Champ | Obligatoire | Rôle |
|---|---|---|
| `format`, `version` | Oui | Reconnaître le fichier, migrer le format plus tard |
| `store.domain` | Oui | Domaine `.myshopify.com` de la boutique |
| `store.language`, `store.country` | Non (FR, CA) | Titres en français, prix en CAD |
| `ai` | Non | Sans clé, l'outil marche et les points forts se tapent directement dans les bulles |
| `ai.model` | Non | Modèle Gemini ; le changer ici si Google renomme un modèle |

Pour essayer sans boutique ni clé : [`connexion.demo.json`](connexion.demo.json) branche l'outil à
`hydrogen-preview.myshopify.com`, la boutique de démonstration publique de Shopify, sans IA.
C'est aussi la boutique de toutes les suites de tests.

Le vrai fichier contient une clé Gemini : il ne va **jamais** dans ce dépôt (`connexion*.json` est ignoré,
sauf l'exemple et la démo). La clé est restreinte au domaine GitHub Pages dans Google Cloud, sur un
projet sans facturation : le pire cas est un quota gratuit épuisé, jamais une facture.

« Déconnecter » efface tout ce que l'outil a gardé sur le poste ; « Exporter » régénère le fichier pour une collègue.

## Utilisation

1. Choisir le template, puis le ou les produits (un template déclare combien il en accepte).
2. L'outil remplit le visuel : titre, prix, prix barré, couleurs, photos, points forts (Gemini, ou vides sans clé).
3. Cliquer sur un élément du visuel :
   - un texte se tape directement dedans ;
   - une barre flottante offre la couleur, les images du produit, un fichier, « Relancer le détourage » ;
   - un élément modifié porte un point rose et peut revenir à la valeur Shopify (ou du template).
4. « Aperçu final » montre le rendu réel de l'export ; « Télécharger le PNG » exporte en 1080×1080.

Les modifications sont gardées dans le navigateur, par template et par produit. L'adresse, le pied de
page, le bandeau et le fond de boutique suivent le template d'un produit à l'autre.

**Détourage** : BiRefNet lite (licence MIT) dans le navigateur. Sur WebGPU (1024 px) quand le GPU a au
moins 11 tampons par shader, sinon en WASM (export 512 px du même modèle, sinon la mémoire manque).
Le premier détourage télécharge le modèle (environ 200 Mo) une fois, ensuite il reste en cache.
RMBG-2.0 de Bria est exclu : licence non commerciale.

## Développement

```bash
npm install
npm run dev
```

| Commande | Rôle |
|---|---|
| `npm test` | Tests unitaires et visuels, sans réseau, sur les fixtures de la boutique de démo |
| `npm run test:live` | Suite live : la vraie boutique de démo, branchée par `connexion.demo.json` |
| `npm run fixtures:record` | Réenregistre les fixtures depuis la boutique de démo |
| `npm run fixtures:cutouts` | Détoure les images des fixtures avec BiRefNet lite, comme l'outil (à relancer après `fixtures:record`) |
| `npm run test:update-visuals` | Régénère les images de référence des tests visuels (après un changement voulu) |
| `npm run lint`, `npm run build` | oxlint ; vérification TypeScript puis build Vite |

Les tests visuels rendent chaque template avec des produits de démo (deux couleurs, sans couleur,
33 couleurs), photos détourées comme dans l'outil, et comparent le PNG à `test/visual/`. En cas d'écart, la CI joint les rendus et les
images de différence (`test/output/`).

## Organisation

```
src/
  connection/   fichier de connexion : schéma Zod, sauvegarde, export
  shopify/      Storefront API sans token (version épinglée), normalisation
  product/      NormalizedProduct : le modèle neutre que lisent les templates
  templates/    contrat, champs typés, briques partagées, un dossier par template
  render/       rendu Satori (SVG) puis resvg (PNG), préparation des images
  editor/       primitives éditables, barre flottante, trois couches de valeurs
  ai/           Gemini : points forts, vision pour associer couleurs et images
  cutout/       détourage BiRefNet lite
  studio/       écran principal
test/           fixtures et références visuelles de la boutique de démo, suites unit et live
scripts/        enregistrement des fixtures, veille mensuelle
```

## Système de templates

Un template est un module autonome dans `src/templates/<id>/` qui respecte `TemplateDefinition`
(`src/templates/types.ts`) :

| Clé | Rôle |
|---|---|
| `id`, `name`, `source` | Identifiant, nom dans le sélecteur, lien du design d'origine |
| `size` | 1080×1080 ; d'autres formats (1080×1350, 1080×1920) sans changer le contrat |
| `fonts` | Polices chargées pour l'export (TTF, OTF ou WOFF) |
| `products` | `{ min, max }` : 1..1 pour une fiche, 2..4 pour une sélection |
| `fields` | Schéma Zod de champs typés : `text()`, `color()`, `image()` (avec `scope` et `cutout`) |
| `fromProducts(products, { shop, ai })` | Valeurs importées des produits ; un champ absent garde celle du template |
| `render(values, e)` | JSX pur (flexbox supporté par Satori) qui dessine via les primitives `e.text`, `e.image`, `e.region` |

Le type d'un champ choisit l'outil d'édition sur le visuel ; aucune interface d'édition à coder par
template. Le même JSX sert à l'éditeur (DOM) et à l'export (Satori) : les primitives deviennent
cliquables dans l'un, du texte et des images simples dans l'autre.

Briques partagées (`src/templates/shared/`) : titre multicolore, formes SVG recolorables (bulle,
étoile, bandeau), ajustement de taille de texte, formats (prix, phrase des couleurs, vignettes).

### Ajouter un template

1. Dupliquer `src/templates/crunchie-funny-bottle/` sous un nouvel `id`.
2. Déclarer les champs, `products` (combien de produits), les polices et `fromProducts`.
3. Écrire le JSX avec les primitives `e.text`, `e.image` et `e.region`, en positions absolues.
4. L'inscrire dans `src/templates/index.ts`.
5. `npm test` : les tests de contrat le vérifient, et les tests visuels créent ses images de référence
   (les relire dans `test/visual/` avant de les committer).
6. Pousser : GitHub Actions teste et redéploie le site.

### Depuis un design Canva

Le chemin prévu pour un nouveau visuel : donner le lien du design Canva à Claude, qui génère le template.

1. Claude lit le design par le connecteur Canva (`read-design`) : dimensions, et pour chaque élément sa
   position, sa taille, sa rotation, ses couleurs, sa police et ses textes.
2. Chaque élément variable devient un champ : textes du produit (`text`), photos (`image`, détourées au
   besoin), couleurs qu'on voudra changer (`color`). Le reste est fixe dans le JSX.
3. Les formes (bulles, étoiles, bandeaux) sont redessinées en SVG pour rester recolorables. Les photos
   fixes (fond de boutique) sont exportées pleine résolution depuis une copie du design réduite à cet
   élément (Canva n'exporte pas un asset seul), puis deviennent des champs image de portée `template`.
4. Les polices Canva sont remplacées par des polices libres proches (Google Fonts, paquets `@fontsource`).
5. Le template est rendu avec les produits de démo, comparé au design, ajusté, puis ses références
   visuelles sont enregistrées.

Un design pour plusieurs produits fonctionne pareil, avec `products: { min, max }` et `fromProducts`
qui reçoit la liste des produits choisis.

### Crunchie Funny Bottle

Refait d'après le design Canva « Publication Instagram Crunchie Funny Bottle » (positions, couleurs et
tailles relevées dans Canva). Polices Fredoka et Poppins (libres) à la place des polices Canva.

- Sans option couleur, la 3e bulle affiche un 3e point fort ; une bulle vide est cachée à l'export.
- Le fond de boutique vient du design Canva : une copie du design réduite au fond, exportée en 1080×1080
  (`assets/fond-boutique.jpg`). C'est un champ image de portée template : une autre photo choisie dans
  l'éditeur reste pour toutes les publications.

## Maintenance

Le seul entretien prévu est une mise à jour par année. Une GitHub Action de veille (le 1er du mois)
ouvre une issue avant que quelque chose brise :

- version épinglée de la Storefront API dans ses six derniers mois de support (ou retirée) ;
- modèle Gemini par défaut disparu (si le secret `GEMINI_API_KEY` est fourni au dépôt) ;
- suite live sur la boutique de démo en échec.

## Mise en ligne

Dans les réglages du dépôt, **Settings → Pages → Source : GitHub Actions**. Chaque push sur `main` redéploie le site.
