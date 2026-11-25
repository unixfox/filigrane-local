import "./style.css";
import { isSupported, watermarkFiles, type WatermarkResult } from "./document";
import { applyTranslations, onLangChange, setLang, t, type Lang } from "./i18n";
import type { WatermarkOptions } from "./watermark";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const form = $<HTMLFormElement>("form");
const fileInput = $<HTMLInputElement>("file-upload");
const dropzone = $<HTMLLabelElement>("dropzone");
const fileList = $<HTMLUListElement>("file-list");
const filesError = $<HTMLParagraphElement>("files-error");
const textInput = $<HTMLInputElement>("text");
const textError = $<HTMLParagraphElement>("text-error");
const counter = $<HTMLParagraphElement>("counter");
const submit = $<HTMLButtonElement>("submit");
const status = $<HTMLParagraphElement>("status");
const result = $<HTMLElement>("result");
const download = $<HTMLAnchorElement>("download");
const resultInfo = $<HTMLParagraphElement>("result-info");
const previews = $<HTMLDivElement>("previews");

let files: File[] = [];
let objectUrls: string[] = [];
let lastResult: { res: WatermarkResult; base: string | null; seconds: string } | null = null;

// Error messages are stored as functions so they re-translate on language change.
let filesErrorMsg: (() => string) | null = null;
let textErrorMsg: (() => string) | null = null;
let statusMsg: (() => string) | null = null;

const formatSize = (n: number) =>
  n < 1024 * 1024
    ? t("size.kb", { n: Math.max(1, Math.round(n / 1024)) })
    : t("size.mb", { n: (n / 1024 / 1024).toFixed(1) });

function setMessage(el: HTMLElement, msg: (() => string) | null) {
  el.textContent = msg ? msg() : "";
  if (el !== status) el.hidden = !msg;
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
      remove.textContent = t("files.remove");
      remove.setAttribute("aria-label", t("files.removeLabel", { name: file.name }));
      remove.addEventListener("click", () => {
        files.splice(i, 1);
        renderFileList();
      });
      li.append(name, size, remove);
      return li;
    }),
  );
}

function renderCounter() {
  counter.textContent = t("text.counter", { count: textInput.value.length });
}

function renderResult() {
  if (!lastResult) return;
  const { res, base, seconds } = lastResult;
  const pages = t(res.pageCount > 1 ? "result.pages.other" : "result.pages.one", { n: res.pageCount });
  resultInfo.textContent = t("result.info", { pages, size: formatSize(res.pdf.size), seconds });
  download.download = t("result.filename", { base: base ?? t("result.defaultBase") });
  previews.querySelectorAll("img").forEach((img, i) => (img.alt = t("result.preview", { n: i + 1 })));
}

function renderDynamic() {
  renderFileList();
  renderCounter();
  renderResult();
  setMessage(filesError, filesErrorMsg);
  setMessage(textError, textErrorMsg);
  setMessage(status, statusMsg);
}

function addFiles(list: FileList | File[]) {
  const incoming = Array.from(list);
  const rejected = incoming.filter((f) => !isSupported(f));
  files.push(...incoming.filter(isSupported));
  const names = rejected.map((f) => f.name).join(", ");
  filesErrorMsg = rejected.length ? () => t("files.unsupported", { names }) : null;
  setMessage(filesError, filesErrorMsg);
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
  renderCounter();
  if (textInput.value.trim()) {
    textErrorMsg = null;
    setMessage(textError, null);
  }
});

const askPassword = async (fileName: string, retry: boolean) =>
  window.prompt((retry ? t("password.wrong") + "\n" : "") + t("password.prompt", { name: fileName }));

function resetResult() {
  objectUrls.forEach((u) => URL.revokeObjectURL(u));
  objectUrls = [];
  previews.replaceChildren();
  lastResult = null;
  result.hidden = true;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  filesErrorMsg = files.length ? null : () => t("files.required");
  textErrorMsg = text ? null : () => t("text.required");
  setMessage(filesError, filesErrorMsg);
  setMessage(textError, textErrorMsg);
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
    const res = await watermarkFiles(
      files,
      text,
      options,
      (msg) => setMessage(status, (statusMsg = msg)),
      askPassword,
    );
    const pdfUrl = URL.createObjectURL(res.pdf);
    objectUrls.push(pdfUrl, ...res.previews);

    download.href = pdfUrl;
    previews.replaceChildren(
      ...res.previews.map((src) => {
        const img = document.createElement("img");
        img.src = src;
        img.loading = "lazy";
        return img;
      }),
    );
    lastResult = {
      res,
      base: files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "") : null,
      seconds: ((performance.now() - started) / 1000).toFixed(1),
    };
    renderResult();
    result.hidden = false;
    setMessage(status, (statusMsg = null));
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error(err);
    status.classList.add("error");
    const message = (err as Error)?.message ?? String(err);
    setMessage(status, (statusMsg = () => t("error.prefix", { message })));
  } finally {
    submit.disabled = false;
    form.removeAttribute("aria-busy");
  }
});

document.querySelectorAll<HTMLButtonElement>("[data-lang]").forEach((btn) =>
  btn.addEventListener("click", () => setLang(btn.dataset.lang as Lang)),
);
onLangChange(renderDynamic);

applyTranslations();
renderDynamic();
