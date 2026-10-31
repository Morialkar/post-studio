# Studio de publications

Outil web 100 % statique qui génère une publication Instagram 1080×1080 à partir d'un produit
d'une boutique Shopify : on choisit un produit, l'outil remplit le visuel, on ajuste, on exporte en PNG.

- **Zéro coût** : aucun serveur, aucun abonnement, seulement des paliers gratuits.
- **Set and forget** : hébergé sur GitHub Pages, déployé par GitHub Actions à chaque push sur `main`.
- **Indépendant** : pas de Canva, pas d'app Shopify. Le site est générique ; un fichier de connexion le branche à une boutique.
- **Tout dans le navigateur** : catalogue, rendu, détourage et appel IA se font côté client.

## Fichier de connexion

Le site ne contient aucune configuration. Au premier usage sur un poste, on lui donne un fichier JSON
(voir [`connexion.exemple.json`](connexion.exemple.json)) ; il est gardé dans le navigateur.

Pour essayer sans boutique ni clé : [`connexion.demo.json`](connexion.demo.json) branche l'outil à
`hydrogen-preview.myshopify.com`, la boutique de démonstration publique de Shopify, sans IA.

| Champ | Obligatoire | Rôle |
|---|---|---|
| `format`, `version` | Oui | Reconnaître le fichier, migrer le format plus tard |
| `store.domain` | Oui | Domaine `.myshopify.com` de la boutique |
| `store.language`, `store.country` | Non (FR, CA) | Titres en français, prix en CAD |
| `ai` | Non | Sans clé, l'outil marche et les points forts se tapent à la main |
| `ai.model` | Non | Modèle Gemini ; le changer ici si Google renomme un modèle |

Le vrai fichier contient une clé Gemini : il ne va **jamais** dans ce dépôt. La clé est restreinte au
domaine GitHub Pages dans Google Cloud, sur un projet sans facturation : le pire cas est un quota gratuit
épuisé, jamais une facture.

« Déconnecter » efface tout ce que l'outil a gardé sur le poste ; « Exporter » régénère le fichier pour une collègue.

## Développement

```bash
npm install
npm run dev
```

`npm test` (Vitest), `npm run lint` (oxlint), `npm run build` (vérification TypeScript puis build Vite).

## Organisation

```
src/
  connection/   fichier de connexion : schéma Zod, sauvegarde, export
  shopify/      Storefront API sans token (version épinglée)
  product/      NormalizedProduct : le modèle neutre que lisent les templates
  templates/    contrat TemplateDefinition et registre des templates
```

Chaque template est un module autonome qui respecte `TemplateDefinition` (`src/templates/types.ts`) :
il déclare ses champs (schéma Zod), les remplit à partir d'un `NormalizedProduct`, et les dessine en JSX.
Le même JSX sert à l'éditeur (DOM) et à l'export (Satori puis resvg, PNG).

## Phases

1. **Fondations et validation** : dépôt, déploiement Pages, fichier de connexion *(fait)* ; adaptateur
   Shopify et recherche, test CORS des images `cdn.shopify.com`, rendu Satori + resvg, template
   Crunchie Funny Bottle (titre, prix, photo, assets fixes).
2. **Template complet et IA** : bulles, vignettes de couleurs, éditeur en place, Gemini, détourage BiRefNet lite.
3. **Robustesse** : tests visuels en CI, cas limites, guide « Ajouter un template », veille des versions d'API.

## Mise en ligne

Dans les réglages du dépôt, **Settings → Pages → Source : GitHub Actions**. Chaque push sur `main` redéploie le site.
