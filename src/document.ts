import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument } from "pdf-lib";
import {
  A4,
  applyWatermark,
  fitImageToPage,
  pdfRenderScale,
  type Drawable,
  type WatermarkOptions,
} from "./watermark";
import { t } from "./i18n";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const ASSETS = new URL("pdfjs/", new URL(import.meta.env.BASE_URL, document.baseURI)).href;
const JPEG_QUALITY = 0.9;

export const ACCEPTED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "heic", "heif"];

/** Messages are thunks so the UI can re-translate them on language change. */
export type ProgressFn = (message: () => string) => void;
export type PasswordFn = (fileName: string, retry: boolean) => Promise<string | null>;

function extension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export function isSupported(file: File): boolean {
  return (
    ACCEPTED_EXTENSIONS.includes(extension(file)) ||
    /^(application\/pdf|image\/(jpeg|png|heic|heif))$/.test(file.type)
  );
}

function isPdf(file: File) {
  return file.type === "application/pdf" || extension(file) === "pdf";
}

function isHeic(file: File) {
  return /image\/hei[cf]/.test(file.type) || ["heic", "heif"].includes(extension(file));
}

/** Rasterise each PDF page (same resolution rule as the original: getScale × 2). */
async function pdfToCanvases(
  file: File,
  onProgress: ProgressFn,
  askPassword: PasswordFn,
): Promise<HTMLCanvasElement[]> {
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: ASSETS + "cmaps/",
    cMapPacked: true,
    standardFontDataUrl: ASSETS + "standard_fonts/",
    wasmUrl: ASSETS + "wasm/",
    iccUrl: ASSETS + "iccs/",
  });
  task.onPassword = async (update: (pw: string) => void, reason: number) => {
    const pw = await askPassword(file.name, reason === pdfjs.PasswordResponses.INCORRECT_PASSWORD);
    if (pw === null) {
      task.destroy();
    } else {
      update(pw);
    }
  };

  let pdf;
  try {
    pdf = await task.promise;
  } catch (e) {
    if ((e as Error)?.name === "PasswordException" || task.destroyed) {
      throw new Error(t("error.password", { name: file.name }));
    }
    throw e;
  }
  const pages: HTMLCanvasElement[] = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const n = pdf.numPages;
      onProgress(() => t("progress.readPage", { name: file.name, i, n }));
      const page = await pdf.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: pdfRenderScale(base.width, base.height) * 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      page.cleanup();
      pages.push(canvas);
    }
  } finally {
    await task.destroy();
  }
  return pages;
}

/** Decode an image honouring its EXIF orientation. */
async function imageToDrawable(blob: Blob): Promise<Drawable> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    // Fallback: <img> also applies EXIF orientation in modern browsers.
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      return c;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function heicToDrawable(file: File): Promise<Drawable> {
  // Safari decodes HEIC natively; other browsers need the converter.
  try {
    return await imageToDrawable(file);
  } catch {
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: file, toType: "image/png" });
    return imageToDrawable(Array.isArray(out) ? out[0] : out);
  }
}

async function fileToDrawables(
  file: File,
  onProgress: ProgressFn,
  askPassword: PasswordFn,
): Promise<Drawable[]> {
  if (isPdf(file)) return pdfToCanvases(file, onProgress, askPassword);
  onProgress(() => t("progress.read", { name: file.name }));
  if (isHeic(file)) return [await heicToDrawable(file)];
  return [await imageToDrawable(file)];
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error(t("error.jpeg")))),
      "image/jpeg",
      JPEG_QUALITY,
    ),
  );
}

export interface WatermarkResult {
  pdf: Blob;
  previews: string[]; // object URLs of the page JPEGs
  pageCount: number;
}

/** Full pipeline: files → pages → watermark → one A4 PDF with flattened JPEG pages. */
export async function watermarkFiles(
  files: File[],
  text: string,
  options: WatermarkOptions,
  onProgress: ProgressFn,
  askPassword: PasswordFn,
): Promise<WatermarkResult> {
  const out = await PDFDocument.create();
  const now = new Date();
  out.setCreator("Filigrane local");
  out.setProducer("Filigrane local (traitement 100 % navigateur)");
  out.setCreationDate(now);
  out.setModificationDate(now);

  const previews: string[] = [];
  let pageIndex = 0;

  for (const file of files) {
    const drawables = await fileToDrawables(file, onProgress, askPassword);
    for (const d of drawables) {
      pageIndex++;
      const n = pageIndex;
      onProgress(() => t("progress.watermark", { n }));
      // Let the UI repaint between heavy canvas operations.
      await new Promise((r) => setTimeout(r, 0));
      const page = fitImageToPage(d);
      if ("close" in d && typeof d.close === "function") d.close();
      await applyWatermark(page, text, options);

      const jpeg = await canvasToJpeg(page);
      previews.push(URL.createObjectURL(jpeg));
      const img = await out.embedJpg(await jpeg.arrayBuffer());
      const pdfPage = out.addPage([A4.width, A4.height]);
      pdfPage.drawImage(img, {
        x: 0,
        y: 0,
        width: A4.width,
        height: (page.height * A4.width) / page.width,
      });
      page.width = page.height = 0; // release memory early
    }
  }

  if (pageIndex === 0) throw new Error(t("error.noPages"));

  onProgress(() => t("progress.pdf"));
  const bytes = await out.save();
  return {
    pdf: new Blob([bytes as BlobPart], { type: "application/pdf" }),
    previews,
    pageCount: pageIndex,
  };
}
