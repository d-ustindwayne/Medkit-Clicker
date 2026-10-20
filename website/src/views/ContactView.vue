<script setup lang="ts">
import { GAME } from "@/lib/content";
import { LINKS } from "@/lib/links";
</script>

<template>
  <div class="page-wrap contact">
    <h1>Contact</h1>

    <div class="cards">
      <section id="contact" class="panel-card" aria-labelledby="contact-title">
        <h2 id="contact-title">Contact</h2>
        <p>Medkit Clicker is made by {{ GAME.author }}.</p>
        <div class="links">
          <a v-if="LINKS.email" class="button pixel-button" :href="`mailto:${LINKS.email}`">Email {{ LINKS.email }}</a>
          <a class="button pixel-button" :href="LINKS.github" rel="noopener">GitHub profile</a>
        </div>
      </section>

      <section id="support" class="panel-card" aria-labelledby="support-title">
        <h2 id="support-title">Support</h2>
        <p>
          Found a bug or stuck on something? Check the <RouterLink to="/docs">guide</RouterLink> first. If it isn't
          answered there, open an issue with your phone model and what happened.
        </p>
        <div class="links">
          <a class="button pixel-button is-primary" :href="LINKS.support" rel="noopener">Open an issue</a>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.contact {
  padding-top: 4rem;
  padding-bottom: 6rem;
  h1 {
    font-size: clamp(2.5rem, 6vw, 4rem);
    color: var(--primary);
    text-shadow: 0.06em 0.06em 0 var(--text-shadow);
    margin-bottom: 2.5rem;
  }
}
[data-theme="dark"] .contact h1 {
  color: #ff4d5e;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 2rem;
  align-items: start;
}
section {
  scroll-margin-top: 6rem;
}
h2 {
  font-size: 1.75rem;
  margin-bottom: 1rem;
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
