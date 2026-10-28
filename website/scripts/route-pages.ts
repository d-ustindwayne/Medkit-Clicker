// After `vite build`: writes dist/<page>.html for every page in src/lib/pages.ts with that page's
// title, description, canonical link and share-card tags already in the HTML, plus dist/sitemap.xml.
// GitHub Pages serves /docs from docs.html with a 200 status, so search engines index each page
// (the 404.html fallback would answer with a 404). Run from website/: bun scripts/route-pages.ts
import { readFileSync, writeFileSync } from "node:fs";

import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, PAGES, pageTitle, pageUrl } from "../src/lib/pages";

const dist = new URL("../dist/", import.meta.url);
const home = readFileSync(new URL("index.html", dist), "utf8");
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

for (const page of PAGES) {
  if (page.path === "/") continue;
  const title = escape(pageTitle(page));
  const description = escape(page.description);
  const url = pageUrl(page.path);
  const html = home
    .replaceAll(`<title>${DEFAULT_TITLE}</title>`, `<title>${title}</title>`)
    .replaceAll(`content="${DEFAULT_TITLE}"`, `content="${title}"`)
    .replaceAll(`content="${DEFAULT_DESCRIPTION}"`, `content="${description}"`)
    .replace('<link rel="canonical" href="https://medkit-clicker.dustindwayn.ee/" />', `<link rel="canonical" href="${url}" />`)
    .replace('<meta property="og:url" content="https://medkit-clicker.dustindwayn.ee/" />', `<meta property="og:url" content="${url}" />`);
  if (!html.includes(`href="${url}"`)) throw new Error(`index.html changed: couldn't set the canonical link for ${page.path}`);
  writeFileSync(new URL(`${page.path.slice(1)}.html`, dist), html);
}

const urls = [...PAGES.map((p) => ({ loc: pageUrl(p.path), priority: p.priority })), { loc: pageUrl("/play/"), priority: 0.9 }];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority.toFixed(1)}</priority></url>`).join("\n")}
</urlset>
`;
writeFileSync(new URL("sitemap.xml", dist), sitemap);
console.log(`Wrote ${PAGES.length - 1} page files and sitemap.xml`);
