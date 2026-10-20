<script setup lang="ts">
import NavBar from "@/components/NavBar.vue";
import SiteFooter from "@/components/SiteFooter.vue";
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <NavBar />
  <main id="main">
    <RouterView />
  </main>
  <SiteFooter />
</template>

<style lang="scss">
.skip-link {
  position: absolute;
  left: 1rem;
  top: -4rem;
  z-index: 50;
  padding: 0.5rem 1rem;
  background: var(--surface);
  border: 3px solid var(--outline);
  &:focus {
    top: 1rem;
  }
}
</style>
