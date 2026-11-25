import "./style.css";
import { isSupported, watermarkFiles } from "./document";
import type { WatermarkOptions } from "./watermark";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const form = $<HTMLFormElement>("form");
const fileInput = $<HTMLInputElement>("file-upload");
const dropzone = $<HTMLLabelElement>("dropzone");
const fileList = $<HTMLUListElement>("file-list");
const filesError = $<HTMLParagraphElement>("files-error");
const textInput = $<HTMLInputElement>("text");
const textError = $<HTMLParagraphElement>("text-error");
const count = $<HTMLSpanElement>("count");
const submit = $<HTMLButtonElement>("submit");
const status = $<HTMLParagraphElement>("status");
const result = $<HTMLElement>("result");
const download = $<HTMLAnchorElement>("download");
const resultInfo = $<HTMLParagraphElement>("result-info");
const previews = $<HTMLDivElement>("previews");

let files: File[] = [];
let objectUrls: string[] = [];

const formatSize = (n: number) =>
  n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} Ko` : `${(n / 1024 / 1024).toFixed(1)} Mo`;

function showError(el: HTMLElement, message: string | null) {
  el.textContent = message ?? "";
  el.hidden = !message;
}

function renderFileList() {
  fileList.replaceChildren(
    ...files.map((file, i) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.className = "file-name";
      name.textContent = file.name;
      const size = document.createElement("span");
      size.className = "file-size";
      size.textContent = formatSize(file.size);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove";
      remove.textContent = "Retirer";
      remove.setAttribute("aria-label", `Retirer ${file.name}`);
      remove.addEventListener("click", () => {
        files.splice(i, 1);
        renderFileList();
      });
      li.append(name, size, remove);
      return li;
    }),
  );
}

function addFiles(list: FileList | File[]) {
  const incoming = Array.from(list);
  const rejected = incoming.filter((f) => !isSupported(f));
  files.push(...incoming.filter(isSupported));
  showError(
    filesError,
    rejected.length
      ? `Format non supporté : ${rejected.map((f) => f.name).join(", ")}`
      : null,
  );
  renderFileList();
}

fileInput.addEventListener("change", () => {
  if (fileInput.files) addFiles(fileInput.files);
  fileInput.value = ""; // allow re-selecting the same file
});

for (const type of ["dragenter", "dragover"]) {
  dropzone.addEventListener(type, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragging");
  });
}
for (const type of ["dragleave", "drop"]) {
  dropzone.addEventListener(type, () => dropzone.classList.remove("dragging"));
}
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  if (e.dataTransfer?.files) addFiles(e.dataTransfer.files);
});

textInput.addEventListener("input", () => {
  count.textContent = String(textInput.value.length);
  if (textInput.value.trim()) showError(textError, null);
});

const askPassword = async (fileName: string, retry: boolean) =>
  window.prompt(
    (retry ? "Mot de passe incorrect.\n" : "") + `« ${fileName} » est protégé. Mot de passe :`,
  );

function resetResult() {
  objectUrls.forEach((u) => URL.revokeObjectURL(u));
  objectUrls = [];
  previews.replaceChildren();
  result.hidden = true;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  showError(filesError, files.length ? null : "Veuillez sélectionner au moins un fichier.");
  showError(textError, text ? null : "Veuillez indiquer le texte du filigrane.");
  if (!files.length || !text) return;

  const options: WatermarkOptions = {
    colors: $<HTMLInputElement>("opt-colors").checked,
    distortion: $<HTMLInputElement>("opt-distortion").checked,
    protectBarcodes: $<HTMLInputElement>("opt-barcodes").checked,
  };

  resetResult();
  submit.disabled = true;
  form.setAttribute("aria-busy", "true");
  status.classList.remove("error");
  const started = performance.now();

  try {
    const res = await watermarkFiles(files, text, options, (m) => (status.textContent = m), askPassword);
    const pdfUrl = URL.createObjectURL(res.pdf);
    objectUrls.push(pdfUrl, ...res.previews);

    const base = files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "") : "documents";
    download.href = pdfUrl;
    download.download = `${base}-filigrane.pdf`;
    resultInfo.textContent = `${res.pageCount} page${res.pageCount > 1 ? "s" : ""} · ${formatSize(res.pdf.size)} · généré en ${((performance.now() - started) / 1000).toFixed(1)} s sur votre appareil`;
    previews.replaceChildren(
      ...res.previews.map((src, i) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = `Aperçu de la page ${i + 1}`;
        img.loading = "lazy";
        return img;
      }),
    );
    result.hidden = false;
    status.textContent = "";
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error(err);
    status.classList.add("error");
    status.textContent = `Erreur : ${(err as Error)?.message ?? err}`;
  } finally {
    submit.disabled = false;
    form.removeAttribute("aria-busy");
  }
});
