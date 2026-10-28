import { createRouter, createWebHistory } from "vue-router";

import { DEFAULT_DESCRIPTION, PAGES, pageTitle, pageUrl } from "@/lib/pages";
import HomeView from "@/views/HomeView.vue";

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/docs", name: "docs", component: () => import("@/views/DocsView.vue") },
    { path: "/iphone", name: "iphone", component: () => import("@/views/IphoneView.vue") },
    { path: "/contact", name: "contact", component: () => import("@/views/ContactView.vue") },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved;
    // Pages load lazily, so wait a moment for the section to exist before scrolling to it.
    if (to.hash) return new Promise((resolve) => setTimeout(() => resolve({ el: to.hash, top: 96 }), 150));
    return { top: 0 };
  },
});

/** Sets the content (or href) of a head tag that index.html already has. */
function setHead(selector: string, attr: "content" | "href", value: string) {
  document.head.querySelector(selector)?.setAttribute(attr, value);
}

// Title, description, canonical link and share-card tags follow the page (see lib/pages.ts).
router.afterEach((to) => {
  const page = PAGES.find((p) => p.path === to.path);
  const title = pageTitle(page);
  const description = page?.description ?? DEFAULT_DESCRIPTION;
  const url = pageUrl(to.path);
  document.title = title;
  setHead('link[rel="canonical"]', "href", url);
  setHead('meta[name="description"]', "content", description);
  setHead('meta[property="og:url"]', "content", url);
  setHead('meta[property="og:title"]', "content", title);
  setHead('meta[property="og:description"]', "content", description);
  setHead('meta[name="twitter:title"]', "content", title);
  setHead('meta[name="twitter:description"]', "content", description);
});
