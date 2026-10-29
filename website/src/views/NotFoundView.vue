<script setup lang="ts">
import PixelIcon from "@/components/PixelIcon.vue";
import { STREET } from "@/lib/content";
import { LINKS } from "@/lib/links";
</script>

<template>
  <div class="not-found">
    <div class="page-wrap message">
      <p class="code" aria-hidden="true">404</p>
      <h1>This page has been discharged</h1>
      <p class="lead">We looked in every ward, but there's nothing here. It may have moved, or the link has a typo.</p>
      <div class="actions">
        <RouterLink class="button pixel-button is-primary" to="/">
          <PixelIcon name="home" :size="16" />
          Back home
        </RouterLink>
        <a class="button pixel-button" :href="LINKS.play">
          <PixelIcon name="play" :size="16" />
          Play in browser
        </a>
      </div>
    </div>

    <!-- A bit of life: the road above the footer, with the ambulance on a call that never ends. -->
    <div class="road" aria-hidden="true">
      <div class="ambulance">
        <img class="pixel" :src="STREET.ambulance" alt="" width="96" height="96" />
        <span class="siren"></span>
      </div>
      <div class="lane-line"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.not-found {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 10rem);
}
.message {
  flex: 1;
  padding-top: 3rem;
  padding-bottom: 2rem;
  text-align: center;
}
.code {
  margin: 0;
  font-family: "Silkscreen", monospace;
  font-size: clamp(4rem, 18vw, 9rem);
  line-height: 1;
  color: var(--primary);
  text-shadow: 6px 6px 0 var(--outline);
}
h1 {
  margin-top: 1.5rem;
}
.lead {
  max-width: 34rem;
  margin: 0.75rem auto 1.75rem;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
}

// The road: asphalt with a dashed centre line, the width of the page, sitting on the footer.
.road {
  position: relative;
  height: 5.5rem;
  margin-top: 2rem;
  overflow: hidden;
  background: #4a4f57;
  border-top: 4px solid #2f3339;
}
.lane-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 58%;
  height: 4px;
  background: repeating-linear-gradient(to right, #f2e9c9 0 28px, transparent 28px 56px);
}
.ambulance {
  position: absolute;
  bottom: 0.4rem;
  left: -120px;
  z-index: 1;
  width: 96px;
  height: 96px;
  animation: drive 9s linear infinite;
  img {
    display: block;
    width: 100%;
    height: 100%;
    animation: bump 0.45s steps(2) infinite;
  }
}
// The light bar on the roof flashes red and blue (art pixels 10-13 on row 7 of the 32px sprite).
.siren {
  position: absolute;
  left: 28%;
  top: 17%;
  width: 18%;
  height: 9%;
  border-radius: 999px;
  animation: siren 0.5s steps(1) infinite;
}
@keyframes drive {
  from {
    left: -120px;
  }
  to {
    left: 100%;
  }
}
@keyframes bump {
  50% {
    transform: translateY(-2px);
  }
}
@keyframes siren {
  0% {
    background: rgba(255, 70, 70, 0.85);
    box-shadow: 0 0 14px 6px rgba(255, 70, 70, 0.55);
  }
  50% {
    background: rgba(80, 140, 255, 0.85);
    box-shadow: 0 0 14px 6px rgba(80, 140, 255, 0.55);
  }
}
@media (prefers-reduced-motion: reduce) {
  .ambulance {
    left: auto;
    right: 1.5rem;
    animation: none;
    img,
    .siren {
      animation: none;
    }
  }
}
</style>
