export type Lang = "fr" | "en";
export const LANGS: Lang[] = ["fr", "en"];
const DEFAULT_LANG: Lang = "fr";
const STORAGE_KEY = "filigrane-lang";

const fr = {
  "meta.title": "Filigrane local",
  "meta.description":
    "Ajoutez un filigrane à vos documents (PDF, JPG, PNG, HEIC) directement dans votre navigateur. Aucun fichier n'est envoyé sur un serveur.",
  "header.badge": "100 % navigateur",
  "header.badgeTitle": "Aucun envoi réseau : tout est calculé sur votre appareil",
  "header.switchLabel": "Langue",
  "h1": "Ajoutez un filigrane à n'importe quel document",
  "lead":
    "L’ajout d’un filigrane sur vos documents est une bonne pratique : il limite la réutilisation frauduleuse de vos pièces justificatives. Certains organismes peuvent toutefois avoir besoin d’un document vierge (banques, services publics, etc.).",
  "notice.pdf": "Le fichier filigrané sera au format <strong>PDF</strong>.",
  "notice.local":
    "Vos fichiers <strong>ne quittent jamais votre appareil</strong> : tout le traitement est réalisé dans votre navigateur, sans serveur. La page fonctionne même hors connexion une fois chargée.",
  "notice.burned":
    "Le filigrane est incrusté dans l’image de chaque page : il ne peut pas être retiré en éditant le PDF.",
  "files.label": "Sélectionner des fichiers :",
  "files.hint": "Formats supportés : jpg, png, heic, pdf. Plusieurs fichiers = un seul PDF.",
  "files.drop": "<strong>Cliquez pour choisir</strong> ou déposez vos fichiers ici",
  "files.remove": "Retirer",
  "files.removeLabel": "Retirer {name}",
  "files.unsupported": "Format non supporté : {names}",
  "files.required": "Veuillez sélectionner au moins un fichier.",
  "text.label": "Indiquez le filigrane à insérer :",
  "text.placeholder": "Ex : Document exclusivement destiné à la location immobilière",
  "text.counter": "{count}/100 caractères",
  "text.required": "Veuillez indiquer le texte du filigrane.",
  "options.summary": "Options avancées",
  "options.colors": "Couleurs aléatoires (gris, bleu, rouge)",
  "options.distortion": "Déformation ondulée du texte (plus difficile à effacer)",
  "options.barcodes": "Préserver la lisibilité des QR codes (si le navigateur sait les détecter)",
  "submit": "Ajouter le filigrane",
  "result.title": "Votre document est prêt",
  "result.download": "Télécharger le document filigrané",
  "result.info": "{pages} · {size} · généré en {seconds} s sur votre appareil",
  "result.pages.one": "{n} page",
  "result.pages.other": "{n} pages",
  "result.preview": "Aperçu de la page {n}",
  "result.filename": "{base}-filigrane.pdf",
  "result.defaultBase": "documents",
  "footer":
    'Projet indépendant, non affilié à l’État. Algorithme de filigrane porté depuis <a href="https://github.com/MTES-MCT/dossierfacile-backend" rel="noopener noreferrer" target="_blank">FiligraneFacile / DossierFacile</a> (licence MIT) pour fonctionner entièrement côté client.',
  "footer.source": "Code source sur GitHub",
  "progress.readPage": "Lecture de « {name} » — page {i}/{n}",
  "progress.read": "Lecture de « {name} »",
  "progress.watermark": "Application du filigrane — page {n}",
  "progress.pdf": "Génération du PDF",
  "password.prompt": "« {name} » est protégé. Mot de passe :",
  "password.wrong": "Mot de passe incorrect.",
  "error.prefix": "Erreur : {message}",
  "error.password": "« {name} » est protégé par un mot de passe.",
  "error.noPages": "Aucune page n'a pu être lue dans les fichiers fournis.",
  "error.jpeg": "Échec de l'encodage JPEG.",
  "error.canvas": "Canvas 2D non disponible dans ce navigateur.",
  "size.kb": "{n} Ko",
  "size.mb": "{n} Mo",
};

type Key = keyof typeof fr;

const en: Record<Key, string> = {
  "meta.title": "Local Watermark",
  "meta.description":
    "Add a watermark to your documents (PDF, JPG, PNG, HEIC) right in your browser. No file is ever sent to a server.",
  "header.badge": "100% in-browser",
  "header.badgeTitle": "No network upload: everything is computed on your device",
  "header.switchLabel": "Language",
  "h1": "Add a watermark to any document",
  "lead":
    "Watermarking your documents is good practice: it limits fraudulent reuse of your supporting documents. Some organisations may however need an unmarked document (banks, public services, etc.).",
  "notice.pdf": "The watermarked file will be a <strong>PDF</strong>.",
  "notice.local":
    "Your files <strong>never leave your device</strong>: all processing happens in your browser, with no server. The page even works offline once loaded.",
  "notice.burned":
    "The watermark is burned into the image of each page: it cannot be removed by editing the PDF.",
  "files.label": "Select files:",
  "files.hint": "Supported formats: jpg, png, heic, pdf. Several files = a single PDF.",
  "files.drop": "<strong>Click to choose</strong> or drop your files here",
  "files.remove": "Remove",
  "files.removeLabel": "Remove {name}",
  "files.unsupported": "Unsupported format: {names}",
  "files.required": "Please select at least one file.",
  "text.label": "Watermark text:",
  "text.placeholder": "E.g. Document for rental application purposes only",
  "text.counter": "{count}/100 characters",
  "text.required": "Please enter the watermark text.",
  "options.summary": "Advanced options",
  "options.colors": "Random colours (grey, blue, red)",
  "options.distortion": "Wavy text distortion (harder to remove)",
  "options.barcodes": "Keep QR codes readable (if the browser can detect them)",
  "submit": "Add watermark",
  "result.title": "Your document is ready",
  "result.download": "Download the watermarked document",
  "result.info": "{pages} · {size} · generated in {seconds} s on your device",
  "result.pages.one": "{n} page",
  "result.pages.other": "{n} pages",
  "result.preview": "Preview of page {n}",
  "result.filename": "{base}-watermarked.pdf",
  "result.defaultBase": "documents",
  "footer":
    'Independent project, not affiliated with the French government. Watermark algorithm ported from <a href="https://github.com/MTES-MCT/dossierfacile-backend" rel="noopener noreferrer" target="_blank">FiligraneFacile / DossierFacile</a> (MIT licence) to run entirely client-side.',
  "footer.source": "Source code on GitHub",
  "progress.readPage": "Reading “{name}” — page {i}/{n}",
  "progress.read": "Reading “{name}”",
  "progress.watermark": "Applying watermark — page {n}",
  "progress.pdf": "Generating PDF",
  "password.prompt": "“{name}” is password-protected. Password:",
  "password.wrong": "Wrong password.",
  "error.prefix": "Error: {message}",
  "error.password": "“{name}” is password-protected.",
  "error.noPages": "No page could be read from the provided files.",
  "error.jpeg": "JPEG encoding failed.",
  "error.canvas": "Canvas 2D is not available in this browser.",
  "size.kb": "{n} KB",
  "size.mb": "{n} MB",
};

const dictionaries: Record<Lang, Record<Key, string>> = { fr, en };

function initialLang(): Lang {
  try {
    const fromUrl = new URLSearchParams(location.search).get("lang");
    if (fromUrl && (LANGS as string[]).includes(fromUrl)) return fromUrl as Lang;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (LANGS as string[]).includes(stored)) return stored as Lang;
  } catch {
    /* storage unavailable: fall back to browser detection */
  }
  // First supported language in the browser's preference list (e.g. ["de-DE", "en-US"] → en).
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of prefs) {
    const base = tag?.toLowerCase().split("-")[0];
    if ((LANGS as string[]).includes(base)) return base as Lang;
  }
  return DEFAULT_LANG;
}

let current: Lang = initialLang();
const listeners = new Set<(lang: Lang) => void>();

export const getLang = () => current;

export function t(key: Key, params: Record<string, string | number> = {}): string {
  return dictionaries[current][key].replace(/\{(\w+)\}/g, (_, k) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}

export function setLang(lang: Lang) {
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
  applyTranslations();
  listeners.forEach((fn) => fn(lang));
}

export function onLangChange(fn: (lang: Lang) => void) {
  listeners.add(fn);
}

/**
 * Translate static markup:
 *  data-i18n="key"            → textContent
 *  data-i18n-html="key"       → innerHTML (trusted strings from this file only)
 *  data-i18n-attr="attr:key;…" → attributes
 */
export function applyTranslations(root: ParentNode = document) {
  document.documentElement.lang = current;
  document.title = t("meta.title");
  document.querySelector('meta[name="description"]')?.setAttribute("content", t("meta.description"));

  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n as Key);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml as Key);
  });
  root.querySelectorAll<HTMLElement>("[data-i18n-attr]").forEach((el) => {
    for (const pair of el.dataset.i18nAttr!.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key as Key));
    }
  });
  document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === current));
  });
}
