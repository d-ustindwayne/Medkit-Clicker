<script setup lang="ts">
import { GAME } from "@/lib/content";
import { LINKS } from "@/lib/links";
</script>

<template>
  <footer class="site-footer">
    <div class="page-wrap columns">
      <div class="column is-5">
        <p class="footer-title">Credits</p>
        <p>Made by {{ GAME.author }}.</p>
        <p>Original soundtrack composed for the game in BeepBox.</p>
      </div>
      <div class="column is-4 is-offset-1">
        <p class="footer-title">Links</p>
        <p><RouterLink to="/docs">How to play</RouterLink></p>
        <p><RouterLink to="/contact#support">Get help</RouterLink></p>
        <p><a :href="LINKS.github" rel="noopener">GitHub profile</a></p>
      </div>
      <div class="column is-2">
        <p class="footer-title">&copy; {{ GAME.year }}</p>
        <p>Code under the {{ GAME.license }}.</p>
      </div>
    </div>
  </footer>
</template>
