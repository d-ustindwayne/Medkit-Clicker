<script setup lang="ts">
import { ref, watch } from "vue";
import { useRoute } from "vue-router";

import PixelIcon from "@/components/PixelIcon.vue";
import { useTheme } from "@/composables/useTheme";
import { SPRITES } from "@/lib/content";

const { theme, toggle } = useTheme();
const open = ref(false);
const route = useRoute();

watch(
  () => route.fullPath,
  () => {
    open.value = false;
  },
);
</script>

<template>
  <nav class="navbar site-nav" aria-label="Main">
    <div class="navbar-brand">
      <RouterLink to="/" class="navbar-item brand" aria-label="Medkit Clicker home">
        <img class="pixel" :src="SPRITES.medkit" width="36" height="36" alt="" />
        <span class="brand-name">Medkit Clicker</span>
      </RouterLink>
      <button
        type="button"
        class="navbar-burger"
        :class="{ 'is-active': open }"
        :aria-expanded="open"
        aria-controls="site-menu"
        aria-label="Menu"
        @click="open = !open"
      >
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </button>
    </div>

    <div id="site-menu" class="navbar-menu" :class="{ 'is-active': open }">
      <div class="navbar-end">
        <RouterLink to="/docs" class="navbar-item">Documentation</RouterLink>
        <RouterLink to="/contact" class="navbar-item">Contact</RouterLink>
        <div class="navbar-item">
          <button
            type="button"
            class="theme-toggle"
            :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            :aria-pressed="theme === 'dark'"
            @click="toggle"
          >
            <PixelIcon :name="theme === 'dark' ? 'sun' : 'moon'" :size="18" />
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.navbar-brand img {
  max-height: none;
}
@media screen and (max-width: 1023px) {
  .navbar-end {
    padding: 0.5rem 0 1rem;
  }
}
</style>
<style lang="scss">
.navbar.site-nav .navbar-item.brand {
  color: var(--ink);
}
</style>
