import { createRouter, createWebHistory } from "vue-router";

import HomeView from "@/views/HomeView.vue";

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/docs", name: "docs", component: () => import("@/views/DocsView.vue"), meta: { title: "Guide" } },
    { path: "/contact", name: "contact", component: () => import("@/views/ContactView.vue"), meta: { title: "Contact" } },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved;
    // Pages load lazily, so wait a moment for the section to exist before scrolling to it.
    if (to.hash) return new Promise((resolve) => setTimeout(() => resolve({ el: to.hash, top: 96 }), 150));
    return { top: 0 };
  },
});

router.afterEach((to) => {
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} · Medkit Clicker` : "Medkit Clicker";
});
