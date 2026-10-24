import { createApp } from "vue";

import App from "@/App.vue";
import { router } from "@/router";
import "@/styles/main.scss";

// Pictures can't be dragged out of the page (Firefox ignores -webkit-user-drag in main.scss).
window.addEventListener(
  "dragstart",
  (e) => {
    if (e.target instanceof HTMLImageElement) e.preventDefault();
  },
  true,
);

createApp(App).use(router).mount("#app");
