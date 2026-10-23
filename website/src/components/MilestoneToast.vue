<script setup lang="ts">
import { ref } from "vue";

import PixelIcon from "@/components/PixelIcon.vue";
import { SPRITES } from "@/lib/content";
import { LINKS } from "@/lib/links";

// Pops up like an achievement in the game: once a visitor has healed enough patients on the site,
// or (with `code`) with a promo code to enter in the game.
const props = withDefaults(defineProps<{ kicker?: string; title: string; text: string; image?: string; code?: string }>(), {
  kicker: "Achievement unlocked",
  image: undefined,
  code: undefined,
});
const emit = defineEmits<{ close: [] }>();

const copied = ref(false);
async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.code!);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1800);
  } catch {
    // Clipboard blocked: the code is on screen to type in.
  }
}
</script>

<template>
  <aside class="milestone" role="status" aria-live="polite">
    <div class="badge" aria-hidden="true">
      <img class="pixel trophy" :src="image ?? SPRITES.trophy" width="64" height="64" alt="" />
    </div>
    <div class="body">
      <p class="kicker">{{ kicker }}</p>
      <p class="title">{{ title }}</p>
      <p class="text">{{ text }}</p>
      <div class="actions">
        <button v-if="code" type="button" class="button pixel-button is-small code" @click="copyCode">{{ copied ? "Copied!" : `Copy ${code}` }}</button>
        <a v-if="!code" class="button pixel-button is-primary is-small" :href="LINKS.download" rel="noopener">
          <PixelIcon name="download" :size="14" />
          Download for Android
        </a>
        <a class="button pixel-button is-small" :href="LINKS.play">
          <PixelIcon name="play" :size="14" />
          Play
        </a>
        <button type="button" class="later" @click="emit('close')">Not now</button>
      </div>
    </div>
    <button type="button" class="close" aria-label="Close" @click="emit('close')">&times;</button>
  </aside>
</template>

<style scoped lang="scss">
.milestone {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 45;
  width: min(26rem, calc(100vw - 2rem));
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
  padding: 1.1rem 1.25rem 1.2rem;
  background: var(--surface);
  color: var(--ink);
  border: 3px solid var(--outline);
  box-shadow: 8px 8px 0 var(--shadow);
  animation: drop-in 700ms steps(14, end) both;
}
// A red strip across the top, like the game's toast header.
.milestone::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 6px;
  background: var(--primary);
}
.badge {
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  background: var(--accent);
  border: 3px solid var(--outline);
  margin-top: 0.4rem;
}
.trophy {
  animation: hop 1.2s steps(6, end) 700ms infinite;
}
.kicker {
  font-family: "Silkscreen", monospace;
  font-size: 0.75rem;
  color: var(--primary);
  margin-top: 0.3rem;
}
[data-theme="dark"] .kicker {
  color: #ff8a96;
}
.title {
  font-family: "Silkscreen", monospace;
  font-size: 1.25rem;
  line-height: 1.2;
  margin-top: 0.2rem;
}
.text {
  font-size: 0.9375rem;
  line-height: 1.5;
  margin-top: 0.4rem;
  color: var(--muted);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.9rem;
  margin-top: 0.9rem;
}
.code {
  font-family: "Silkscreen", monospace;
  letter-spacing: 0.04em;
}
.later {
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 700;
  background: none;
  border: 0;
  padding: 0;
  color: var(--muted);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.close {
  position: absolute;
  top: 0.55rem;
  right: 0.6rem;
  width: 1.75rem;
  height: 1.75rem;
  font-size: 1.25rem;
  line-height: 1;
  background: none;
  border: 0;
  color: var(--ink);
  cursor: pointer;
}

@keyframes drop-in {
  0% {
    transform: translateY(140%) rotate(-3deg);
    opacity: 0;
  }
  60% {
    transform: translateY(-10%) rotate(1deg);
    opacity: 1;
  }
  80% {
    transform: translateY(3%);
  }
  100% {
    transform: none;
    opacity: 1;
  }
}
@keyframes hop {
  0%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-8px) rotate(-6deg);
  }
  60% {
    transform: translateY(0) rotate(4deg);
  }
}

@media (max-width: 600px) {
  .milestone {
    right: 1rem;
    left: 1rem;
    bottom: 1rem;
    width: auto;
  }
  .badge {
    width: 56px;
    height: 56px;
    img {
      width: 48px;
      height: 48px;
    }
  }
}
@media (prefers-reduced-motion: reduce) {
  .milestone {
    animation: fade-in 300ms linear both;
  }
  .trophy {
    animation: none;
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }
}
</style>
