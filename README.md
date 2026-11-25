# Filigrane local

Ajoutez un filigrane à vos documents (PDF, JPG, PNG, HEIC) **directement dans votre navigateur**.
Aucun fichier n'est envoyé sur un serveur.

Équivalent 100 % côté client de [FiligraneFacile](https://filigrane.beta.gouv.fr/) : même rendu,
mais sans téléversement.

## Fonctionnement

L'algorithme est un portage fidèle de `BOPdfDocumentTemplate.java` du dépôt
[MTES-MCT/dossierfacile-backend](https://github.com/MTES-MCT/dossierfacile-backend) (licence MIT) :

1. Chaque page PDF est rastérisée avec [pdf.js](https://mozilla.github.io/pdf.js/) ; les images sont
   décodées en respectant l'orientation EXIF (HEIC converti via `heic2any` si le navigateur ne le
   lit pas nativement).
2. L'image est complétée en blanc au ratio A4 et limitée à 1240 px de large (A4 à 150 dpi).
3. Le texte est répété sur 10 lignes (Arial, couleurs aléatoires, opacité 0,52–0,6, interligne
   aléatoire), dupliqué avec un flou gaussien (rayon 45–65 px), déformé par une ondulation
   sinusoïdale, puis tourné de −25°.
4. Les QR codes détectés (API `BarcodeDetector`, si disponible) sont laissés lisibles.
5. Chaque page est encodée en JPEG (qualité 0,9) et placée sur une page A4 d'un PDF unique
   généré avec [pdf-lib](https://pdf-lib.js.org/). Le filigrane est incrusté dans l'image : il ne
   peut pas être retiré en éditant le PDF.

Une Content-Security-Policy stricte (`connect-src 'self'`) interdit au navigateur d'envoyer des
données vers un autre domaine. Toutes les dépendances sont servies depuis la même origine (aucun CDN).

## Développement

```bash
pnpm install
pnpm dev       # serveur de développement
pnpm build     # build de production dans dist/
pnpm preview   # sert le build de production
```

Le site est déployé automatiquement sur GitHub Pages à chaque push sur `main`
(`.github/workflows/deploy.yml`).

## Avertissement

Projet indépendant, non affilié à l'État ni à DossierFacile.
