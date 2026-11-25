// Copies pdf.js runtime assets (cMaps, standard fonts, wasm decoders, ICC profiles)
// into public/pdfjs so they are served from the same origin — no CDN, no third party.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pdfjsRoot = dirname(require.resolve("pdfjs-dist/package.json"));
const dest = join(process.cwd(), "public", "pdfjs");

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  cpSync(join(pdfjsRoot, dir), join(dest, dir), { recursive: true });
}
console.log("pdf.js assets copied to", dest);
