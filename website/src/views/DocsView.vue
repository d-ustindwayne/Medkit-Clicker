<script setup lang="ts">
import { BOOSTS, GAME, HOSPITAL_TIERS, MINIGAMES, ROOMS, SPRITES, SUPPLIES } from "@/lib/content";
import { LINKS } from "@/lib/links";

const TOC = [
  { id: "install", label: "Install" },
  { id: "basics", label: "The basics" },
  { id: "supplies", label: "Supplies" },
  { id: "emergencies", label: "Emergencies" },
  { id: "achievements", label: "Achievements" },
  { id: "boosts", label: "Boosts" },
  { id: "patients", label: "Sick patients" },
  { id: "room", label: "My Room" },
  { id: "rebirth", label: "Rebirth" },
  { id: "music", label: "Music and settings" },
  { id: "saves", label: "Saves" },
  { id: "credits", label: "Credits" },
];
</script>

<template>
  <div class="page-wrap docs">
    <header class="docs-head">
      <h1>How to play</h1>
      <p class="lede">Everything in Medkit Clicker, from your first tap to the Grand Haven Medical Center.</p>
    </header>

    <div class="docs-body">
      <nav class="toc" aria-label="On this page">
        <p class="toc-title">On this page</p>
        <ol>
          <li v-for="t in TOC" :key="t.id"><a :href="`#${t.id}`">{{ t.label }}</a></li>
        </ol>
      </nav>

      <article class="content panel-card">
        <h2 id="install">Install</h2>
        <p>
          Medkit Clicker runs on Android. <a :href="LINKS.download" rel="noopener">Download the APK</a> on your phone and
          open it (release notes and older versions are on <a :href="LINKS.releases" rel="noopener">GitHub Releases</a>). If Android asks, allow installs from your browser or file manager, then tap Install.
          On an iPhone, install it for free with AltStore or SideStore (<RouterLink to="/iphone">see how</RouterLink>).
          On any device, you can also <a :href="LINKS.play">play it in your browser</a>; your progress is saved in that
          browser.
        </p>

        <h2 id="basics">The basics</h2>
        <p>
          Tap the medkit to heal patients. Healed patients are your main currency: spend them on supplies that heal for
          you. Three currencies show in the top-right corner:
        </p>
        <ul>
          <li><strong>Patients</strong> (the medkit), from tapping and supplies.</li>
          <li><strong>Care Coins</strong>, from achievements and treating sick patients.</li>
          <li><strong>Natal Gems</strong>, one for each rebirth.</li>
        </ul>
        <p>
          Your team keeps working for up to {{ GAME.offlineHours }} hours while the app is closed, and you collect what
          they healed when you come back. Swipe sideways on the main screen to reach My Room next to the medkit, and the
          outside of the hospital next to the shop.
        </p>

        <h2 id="supplies">Supplies</h2>
        <p>
          Supplies heal patients every second. There are 13, listed here from cheapest to most expensive. Each purchase
          raises the next price by 14%.
        </p>
        <ol class="supply-list">
          <li v-for="s in SUPPLIES" :key="s.name">
            <img class="pixel" :src="s.img" alt="" width="32" height="32" loading="lazy" />
            {{ s.name }}
          </li>
        </ol>

        <h2 id="emergencies">Emergencies</h2>
        <p>
          On the Hospital page, cars pass and visitors walk in. When an ambulance pulls up at the door, tap it to admit the
          patient for a burst of healing.
        </p>

        <h2 id="achievements">Achievements</h2>
        <p>
          There are {{ GAME.achievements }} achievements, from "First Aid" to healing a vigintillion patients. Each shows
          its progress, a few are secret, and every one pays Care Coins.
        </p>

        <h2 id="boosts">Boosts</h2>
        <p>
          Spend Care Coins in the shop's Boosts tab. Boosts running at the same time add up instead of multiplying: a 2x
          and a 3x per-second boost together make 5x.
        </p>
        <div class="table-wrap">
          <table class="table is-fullwidth">
            <thead>
              <tr>
                <th scope="col">Boost</th>
                <th scope="col">What it does</th>
                <th scope="col" class="cost-col">
                  <img class="pixel" :src="SPRITES.coin" width="16" height="16" alt="" /> Cost
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in BOOSTS" :key="b.name">
                <td><strong>{{ b.name }}</strong></td>
                <td>{{ b.description }}</td>
                <td class="cost-col">{{ b.cost }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 id="patients">Sick patients</h2>
        <p>
          Sick patients turn up in your room at random. Treat them in a quick minigame to earn patients and coins; the games get harder (and pay more) as your hospital grows, and each one gains new twists along the way. The minigames are:
        </p>
        <ul>
          <li v-for="g in MINIGAMES" :key="g">{{ g }}</li>
        </ul>

        <h2 id="room">My Room</h2>
        <p>
          Decorate {{ ROOMS.length }} hospital rooms ({{ ROOMS.join(", ") }}) with 14 pixel-art hospital items you unlock
          by playing. Each placed item gives a small permanent bonus, and nurses and the doctor walk around while you
          play.
        </p>

        <h2 id="rebirth">Rebirth</h2>
        <p>
          On the Hospital page, start a new run for a Natal Gem and a small permanent healing boost. Your hospital grows
          with it:
        </p>
        <div class="table-wrap">
          <table class="table is-fullwidth">
            <thead>
              <tr>
                <th scope="col">Hospital</th>
                <th scope="col">Rebirths</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in HOSPITAL_TIERS" :key="t.name">
                <td>{{ t.name }}</td>
                <td>{{ t.rebirths }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 id="music">Music and settings</h2>
        <p>
          The music player plays the original soundtrack, with play and pause, track skipping and seeking. Sound effects
          have their own volume, and phones vibrate on taps (you can turn that off). Pick a light or dark theme and one of
          seven backgrounds. Tilting the phone moves the background a little. Under Accessibility, Reduce motion calms
          the screen, and Colour labels put a letter on each pill colour in the minigames.
        </p>

        <h2 id="saves">Saves</h2>
        <p>
          The game saves every 10 seconds and whenever you leave the app. You can export a save to a folder you choose,
          or import one, as JSON or CSV. A save also carries your settings and app icon.
        </p>

        <h2 id="credits">Credits</h2>
        <p>Made by {{ GAME.author }}, with an original soundtrack composed for the game in BeepBox.</p>
        <p>Fonts, both under the SIL Open Font License 1.1:</p>
        <ul>
          <li><strong>Silkscreen</strong> by Jason Kottke</li>
          <li><strong>Nunito</strong> by Vernon Adams</li>
        </ul>
      </article>
    </div>
  </div>
</template>

<style scoped lang="scss">
.docs {
  padding-top: 4rem;
  padding-bottom: 6rem;
}
.docs-head {
  max-width: 44rem;
  margin-bottom: 3rem;
  h1 {
    font-size: clamp(2.5rem, 6vw, 4rem);
    color: var(--primary);
    text-shadow: 0.06em 0.06em 0 var(--text-shadow);
  }
}
[data-theme="dark"] .docs-head h1 {
  color: #ff4d5e;
}
.lede {
  margin-top: 1rem;
  font-size: 1.25rem;
}
.docs-body {
  display: grid;
  grid-template-columns: 14rem minmax(0, 1fr);
  gap: 3rem;
  align-items: start;
}
.toc {
  position: sticky;
  top: 6rem;
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    border-left: 3px solid var(--outline);
  }
  a {
    display: block;
    padding: 0.3rem 0 0.3rem 1rem;
    color: var(--ink);
    text-decoration: none;
    &:hover {
      color: var(--primary);
      box-shadow: inset 4px 0 0 var(--primary);
    }
  }
}
:global([data-theme]) .toc a:not(:hover) {
  color: var(--ink);
}
.toc-title {
  font-family: "Silkscreen", monospace;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}
.content {
  max-width: 46rem;
  h2 {
    scroll-margin-top: 6rem;
  }
  h2:first-child {
    margin-top: 0;
  }
}
.supply-list {
  columns: 2;
  li {
    break-inside: avoid;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}
.table-wrap {
  overflow-x: auto;
  margin-bottom: 1.5rem;
}
.cost-col {
  white-space: nowrap;
  text-align: right !important;
  img {
    vertical-align: -2px;
  }
}
@media (max-width: 900px) {
  .docs-body {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  .toc {
    position: static;
    ol {
      columns: 2;
    }
  }
  .supply-list {
    columns: 1;
  }
}
</style>
