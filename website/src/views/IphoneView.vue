<script setup lang="ts">
import { ref } from "vue";

import { LINKS } from "@/lib/links";

const copied = ref(false);
async function copySource() {
  try {
    await navigator.clipboard.writeText(LINKS.altSource);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    // No clipboard (an old browser or a blocked permission): the address is on the page to copy by hand.
  }
}

const source = encodeURIComponent(LINKS.altSource);
</script>

<template>
  <div class="page-wrap iphone">
    <h1>Play on iPhone</h1>

    <div class="cards">
      <section class="panel-card" aria-labelledby="store-title">
        <h2 id="store-title">With AltStore or SideStore</h2>
        <p>
          Medkit Clicker isn't on the App Store. You can install it for free with <strong>AltStore</strong> or
          <strong>SideStore</strong>, which sign the app with your own Apple ID.
        </p>
        <ol>
          <li>
            Install AltStore (<a :href="LINKS.altStoreGuide" rel="noopener">AltStore guide</a>) or SideStore
            (<a :href="LINKS.sideStoreGuide" rel="noopener">SideStore guide</a>) on your iPhone.
          </li>
          <li>
            Add the Medkit Clicker source. Open its Sources tab, tap +, and paste this address:
            <code class="source">{{ LINKS.altSource }}</code>
          </li>
          <li>Find Medkit Clicker in the store and tap Install. Updates show up there too.</li>
        </ol>
        <div class="links">
          <button type="button" class="button pixel-button is-primary" @click="copySource">
            {{ copied ? "Copied!" : "Copy source address" }}
          </button>
          <a class="button pixel-button" :href="`altstore-classic://source?url=${source}`">Add to AltStore</a>
          <a class="button pixel-button" :href="`sidestore://source?url=${source}`">Add to SideStore</a>
        </div>
        <p class="note">
          A free Apple ID has two limits: the app must be refreshed every 7 days (AltStore and SideStore do it for you
          when they can), and you can have at most 3 apps installed this way.
        </p>
        <p class="note">
          Prefer to sideload it yourself? <a :href="LINKS.ipa" rel="noopener">Download the .ipa</a> (unsigned) and open
          it in AltStore or SideStore.
        </p>
      </section>

      <section class="panel-card" aria-labelledby="browser-title">
        <h2 id="browser-title">In Safari</h2>
        <p>
          No setup needed: <a :href="LINKS.play">play it in your browser</a>. To make it feel like an app, tap Share, then
          Add to Home Screen. Your progress is saved in that browser.
        </p>
        <div class="links">
          <a class="button pixel-button" :href="LINKS.play">Play in browser</a>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.iphone {
  padding-top: 4rem;
  padding-bottom: 6rem;
  h1 {
    font-size: clamp(2.5rem, 6vw, 4rem);
    color: var(--primary);
    text-shadow: 0.06em 0.06em 0 var(--text-shadow);
    margin-bottom: 2.5rem;
  }
}
[data-theme="dark"] .iphone h1 {
  color: #ff4d5e;
}
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 2rem;
  align-items: start;
}
h2 {
  font-size: 1.75rem;
  margin-bottom: 1rem;
}
ol {
  margin: 1rem 0 0 1.25rem;
  li + li {
    margin-top: 0.5rem;
  }
}
.source {
  display: block;
  margin-top: 0.4rem;
  overflow-wrap: anywhere;
  user-select: text;
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
.note {
  margin-top: 1.25rem;
  font-size: 0.95rem;
}
</style>
