/**
 * Client-side port of the FiligraneFacile watermark algorithm
 * (MTES-MCT/dossierfacile-backend, BOPdfDocumentTemplate.java — MIT licence).
 *
 * Every step runs in the browser on <canvas>; nothing is uploaded.
 */

/** A4 at 150 dpi — maximum page width in pixels (PageDimension.A4150). */
export const MAX_PAGE_WIDTH = 1240;
/** A4 media box in PDF points. */
export const A4 = { width: 595.27563, height: 841.8898 };
const A4_RATIO = A4.height / A4.width;

/** Same palette as the original (alpha converted from 0-255 to 0-1). */
const COLORS = [
  "rgba(64, 64, 64, 1)",
  "rgba(32, 32, 32, 0.863)",
  "rgba(0, 0, 0, 0.431)",
  "rgba(0, 0, 91, 0.667)",
  "rgba(255, 0, 0, 0.667)",
];
const DARK_GRAY = "rgb(64, 64, 64)";

export interface WatermarkOptions {
  /** Pick a random colour per line (production behaviour). Otherwise dark grey. */
  colors: boolean;
  /** Apply the sinusoidal "lens" distortion (DFFilter) to the sharp text layer. */
  distortion: boolean;
  /** Leave QR codes / barcodes readable by clearing the watermark over them. */
  protectBarcodes: boolean;
}

export const DEFAULT_OPTIONS: WatermarkOptions = {
  colors: true,
  distortion: true,
  protectBarcodes: true,
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max));

export type Drawable = CanvasImageSource & { width: number; height: number };

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("Canvas 2D non disponible dans ce navigateur.");
  return ctx;
}

/**
 * Scale factor used when rasterising a PDF page (getScale in the original):
 * pages wider than A4@150dpi are scaled down, the renderer then doubles it.
 */
export function pdfRenderScale(pageWidthPt: number, pageHeightPt: number): number {
  const ratioImage = pageHeightPt / pageWidthPt;
  const dimWidth =
    ratioImage < A4_RATIO ? Math.trunc(pageWidthPt) : Math.trunc(pageHeightPt / A4_RATIO);
  return dimWidth < MAX_PAGE_WIDTH ? 1 : MAX_PAGE_WIDTH / pageWidthPt;
}

/**
 * Pad the image to the A4 ratio (white background, centred) and downscale it if
 * wider than A4@150dpi (fitImageToPage in the original).
 */
export function fitImageToPage(src: Drawable): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const ratioImage = h / w;
  const dim =
    ratioImage < A4_RATIO
      ? { width: w, height: Math.trunc(w * A4_RATIO) }
      : { width: Math.trunc(h / A4_RATIO), height: h };

  const scale = dim.width < MAX_PAGE_WIDTH ? 1 : MAX_PAGE_WIDTH / w;

  const out = createCanvas(Math.trunc(scale * dim.width), Math.trunc(scale * dim.height));
  const ctx = ctx2d(out);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate((scale * (dim.width - w)) / 2, (scale * (dim.height - h)) / 2);
  ctx.scale(scale, scale);
  ctx.drawImage(src, 0, 0);
  return out;
}

const supportsCanvasFilter = (() => {
  try {
    const c = document.createElement("canvas").getContext("2d");
    return !!c && "filter" in c;
  } catch {
    return false;
  }
})();

/** Gaussian blur of a whole canvas (sigma = radius / 3, as in the Java kernel). */
function gaussianBlur(src: HTMLCanvasElement, radius: number, alpha: number): HTMLCanvasElement {
  const out = createCanvas(src.width, src.height);
  const ctx = ctx2d(out);
  ctx.globalAlpha = alpha;
  const sigma = radius / 3;
  if (supportsCanvasFilter) {
    ctx.filter = `blur(${sigma}px)`;
    ctx.drawImage(src, 0, 0);
    ctx.filter = "none";
  } else {
    // Fallback (older Safari): down/up-sampling approximates a wide blur.
    const factor = Math.max(2, Math.round(sigma));
    const small = createCanvas(src.width / factor, src.height / factor);
    const sctx = ctx2d(small);
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(src, 0, 0, small.width, small.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(small, 0, 0, out.width, out.height);
  }
  return out;
}

/**
 * Sinusoidal distortion (DFFilter): each column is shifted vertically by
 * 28·sin(y·8/H)·sin²(x·12/W), sampled with linear interpolation.
 */
function distort(src: HTMLCanvasElement): HTMLCanvasElement {
  const { width: W, height: H } = src;
  const input = ctx2d(src).getImageData(0, 0, W, H);
  const out = createCanvas(W, H);
  const octx = ctx2d(out);
  const output = octx.createImageData(W, H);
  const s = input.data;
  const d = output.data;
  const xFrequency = 12;
  const yFrequency = 8;
  const maxDistortion = 28;

  const rr = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const r = Math.sin((x * xFrequency) / W);
    rr[x] = r * r;
  }
  for (let y = 0; y < H; y++) {
    const sy = Math.sin((y * yFrequency) / H) * maxDistortion;
    for (let x = 0; x < W; x++) {
      const srcY = y + sy * rr[x];
      const y0 = Math.floor(srcY);
      const fy = srcY - y0;
      const di = (y * W + x) * 4;
      // Edge action ZERO: outside pixels are transparent.
      const i0 = y0 >= 0 && y0 < H ? (y0 * W + x) * 4 : -1;
      const i1 = y0 + 1 >= 0 && y0 + 1 < H ? ((y0 + 1) * W + x) * 4 : -1;
      for (let k = 0; k < 4; k++) {
        const a = i0 >= 0 ? s[i0 + k] : 0;
        const b = i1 >= 0 ? s[i1 + k] : 0;
        d[di + k] = a + (b - a) * fy;
      }
    }
  }
  octx.putImageData(output, 0, 0);
  return out;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Locate QR codes / 2D barcodes with the native BarcodeDetector API when present. */
async function detectBarcodes(image: HTMLCanvasElement): Promise<Box[]> {
  const BD = (globalThis as any).BarcodeDetector;
  if (!BD) return [];
  try {
    const supported: string[] = await BD.getSupportedFormats();
    const wanted = ["qr_code", "data_matrix", "aztec", "pdf417"].filter((f) =>
      supported.includes(f),
    );
    if (!wanted.length) return [];
    const detector = new BD({ formats: wanted });
    const hits: { boundingBox: DOMRectReadOnly }[] = await detector.detect(image);
    return hits.map((h) => h.boundingBox);
  } catch {
    return [];
  }
}

/**
 * Draw the watermark onto `page` in place (applyWatermark in the original).
 * `page` must already have the A4 ratio (see fitImageToPage).
 */
export async function applyWatermark(
  page: HTMLCanvasElement,
  watermarkText: string,
  options: WatermarkOptions = DEFAULT_OPTIONS,
): Promise<HTMLCanvasElement> {
  const w = page.width;
  const h = page.height;
  const diagonal = Math.trunc(Math.sqrt(w * w + h * h));
  const text = watermarkText + "   ";

  // 1. Text layer: 10 lines of repeated text, random spacing / opacity / colours.
  const layer = createCanvas(diagonal, diagonal);
  const g = ctx2d(layer);
  const watermark = text.repeat(1 + Math.trunc(128 / text.length));
  g.globalAlpha = rand(0.52, 0.6);
  const spaceBetweenText = diagonal / rand(8, 10);
  const fontSize = Math.trunc((28 * w) / MAX_PAGE_WIDTH);
  g.font = `${fontSize}px Arial, "Liberation Sans", Helvetica, sans-serif`;
  g.textBaseline = "alphabetic";
  for (let i = 1; i < 11; i++) {
    g.fillStyle = options.colors ? COLORS[randInt(0, COLORS.length)] : DARK_GRAY;
    g.fillText(watermark, 0, i * spaceBetweenText);
  }

  // 2. Blurred copy of the text layer (makes the watermark hard to remove).
  const radius = randInt(45, 65);
  const blurred = gaussianBlur(layer, radius, rand(0.75, 0.95));

  // 3. Optional distortion of the sharp layer.
  const sharp = options.distortion ? distort(layer) : layer;

  // 4. Rotate both layers by -25° around the centre of the square.
  const rotated = createCanvas(diagonal, diagonal);
  const r = ctx2d(rotated);
  r.translate(diagonal / 2, diagonal / 2);
  r.rotate((-25 * Math.PI) / 180);
  r.translate(-diagonal / 2, -diagonal / 2);
  r.drawImage(sharp, 0, 0);
  r.drawImage(blurred, 0, 0);

  // 5. Crop the centre to page size.
  const ox = Math.trunc(diagonal / 2) - Math.trunc(w / 2);
  const oy = Math.trunc(diagonal / 2) - Math.trunc(h / 2);
  const cropped = createCanvas(w, h);
  const c = ctx2d(cropped);
  c.drawImage(rotated, -ox, -oy);

  // 6. Keep QR codes scannable.
  if (options.protectBarcodes) {
    const border = 20;
    for (const box of await detectBarcodes(page)) {
      const x = Math.max(Math.floor(box.x) - border, 0);
      const y = Math.max(Math.floor(box.y) - border, 0);
      const bw = Math.min(Math.ceil(box.width) + border * 2, w - x);
      const bh = Math.min(Math.ceil(box.height) + border * 2, h - y);
      c.clearRect(x, y, bw, bh);
    }
  }

  // 7. Merge onto the page.
  ctx2d(page).drawImage(cropped, 0, 0);
  return page;
}
