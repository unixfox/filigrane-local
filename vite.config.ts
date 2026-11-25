import { defineConfig, type Plugin } from "vite";

// Strict Content-Security-Policy on the production build: the page may only talk to
// its own origin, so documents cannot be sent anywhere — enforced by the browser.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

const cspPlugin = (): Plugin => ({
  name: "inject-csp",
  apply: "build",
  transformIndexHtml: (html) =>
    html.replace(
      "<head>",
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`,
    ),
});

export default defineConfig({
  // Relative base so the build works on GitHub Pages under /<repo>/ and anywhere else.
  base: "./",
  plugins: [cspPlugin()],
  build: { target: "es2022" },
});
