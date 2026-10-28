// The site's pages and what search engines and link previews show for each. router.ts sets these
// in the browser, and scripts/route-pages.ts writes one HTML file per page at build time (GitHub
// Pages would otherwise serve /docs and the others through 404.html, with a 404 status) plus the
// sitemap. Kept free of Vue imports so the build script can load it.

export const SITE_URL = "https://medkit-clicker.dustindwayn.ee";

export const DEFAULT_TITLE = "Medkit Clicker: a cosy pixel-art hospital idle game";
export const DEFAULT_DESCRIPTION =
  "A cosy pixel-art idle game about running a hospital. Tap the medkit, heal patients, and grow a little clinic into a grand medical center.";

export type Page = { path: string; title?: string; description: string; priority: number };

export const PAGES: Page[] = [
  { path: "/", description: DEFAULT_DESCRIPTION, priority: 1 },
  {
    path: "/docs",
    title: "Guide",
    description: "How to play Medkit Clicker: supplies, emergencies, boosts, sick patients, My Room, rebirth, saves and credits.",
    priority: 0.8,
  },
  {
    path: "/iphone",
    title: "Play on iPhone",
    description: "Install Medkit Clicker on an iPhone for free with AltStore or SideStore, or play it in Safari.",
    priority: 0.7,
  },
  { path: "/contact", title: "Contact", description: "Contact the maker of Medkit Clicker, report a bug or ask for help.", priority: 0.5 },
];

export const pageTitle = (p: Pick<Page, "title"> | undefined) => (p?.title ? `${p.title} · Medkit Clicker` : DEFAULT_TITLE);
export const pageUrl = (path: string) => `${SITE_URL}${path}`;
