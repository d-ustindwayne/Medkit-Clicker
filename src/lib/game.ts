import { ACHIEVEMENTS, type AchievementId } from "@/constants/achievements";
import { gemsForRebirth, healingRate, rebirthMultiplier } from "@/constants/rebirth";
import { BACKGROUNDS } from "@/constants/backgrounds";
import { BOOSTS, LUCKY_MULT, boostMultiplier } from "@/constants/boosts";
import { LOSE_SECONDS, LOSE_TAPS, WIN_SECONDS, WIN_TAPS, minigameLevel, minigameTuning, winCoins } from "@/constants/patients";
import { GEM_ITEMS, GEM_LEVEL_COSTS, GEM_UPGRADES, gemBalance, gemLevel, type GemUpgradeId } from "@/constants/gems";
import { EMERGENCY_SECONDS, EMERGENCY_TAPS } from "@/constants/hospital";
import { REWARD_SECTIONS } from "@/constants/rewards";
import { ROOMS, ROOM_ITEMS, STAFF_PER_ROOM, fromOldArt, isUnlocked, roomBonus, snapPlacement, spotFor, type RoomState } from "@/constants/room";
import { SHOP_ITEMS, baseTap, itemCost, perSecond, type ItemId } from "@/constants/items";
import { todaysGift, type DailyState } from "@/lib/daily";
import { COINS_PER_KM, MEDKIT_SECONDS, addReading, newWalk, type StepReading, type WalkState } from "@/lib/walk";

export type GameState = {
  /** Spendable balance: medkits, the currency (saved under its old name). */
  healed: number;
  /** Everything ever earned, across rebirths; drives achievements and shop reveals. */
  totalHealed: number;
  /** Earned since the last rebirth; rebirth needs enough of it. */
  runHealed: number;
  rebirths: number;
  /** Natal Gems: the prestige currency, one per rebirth; never reset. (Saved under its old name.) */
  rebirthPoints: number;
  taps: number;
  owned: Record<ItemId, number>;
  /** Achievement id -> unlock time (ms since epoch). */
  achievements: Partial<Record<AchievementId, number>>;
  playSeconds: number;
  playlistsHeard: string[];
  themeSwitches: number;
  exports: number;
  startedAt: number;
  /** Reward sections opened with a redeem code. */
  unlockedSections: string[];
  /** Reward id -> times it was redeemed (ms since epoch). */
  redemptions: Record<string, number[]>;
  /** Care Coins spent on boosts. The balance is coins earned from achievements minus this. */
  coinsSpent: number;
  /** Timed boost id -> when it ends (ms since epoch). */
  boosts: Record<string, number>;
  /** Medkit taps left on the Lucky Stethoscope. */
  luckyTaps: number;
  /** Care Coins won by treating ward patients (on top of achievement coins). */
  bonusCoins: number;
  /** Ward patients treated successfully. */
  treated: number;
  /** Sick patients waiting in My Room (up to MAX_PATIENTS), oldest first. `arrivedAt` identifies each. */
  patients: { id: string; arrivedAt: number }[];
  /** When the next patient arrives (ms since epoch). */
  nextPatientAt: number;
  /** My Room: which room is shown, and the items placed in each. */
  room: RoomState;
  /** Paid backgrounds bought with Care Coins or Natal Gems (ids). Kept through rebirth. */
  ownedBackgrounds: string[];
  /** Natal Gems spent in the Gem Shop. The balance is rebirthPoints minus this. */
  gemsSpent: number;
  /** Gem upgrade id -> level (0-5). */
  gemUpgrades: Record<string, number>;
  /** Gem Shop cosmetics owned (ids from GEM_ITEMS). */
  gemItems: string[];
  /** Equipped medkit skin and tap effect (gem item ids), or null for the originals. */
  medkitSkin: string | null;
  tapEffect: string | null;
  /** Developer tools turned on with the dev code. */
  devTools: boolean;
  /** Code entry unlocked from the About page (tap the icon 5 times); then one tap opens it. */
  codeEntry: boolean;
  /** The About icon has been tapped and turned into the medkit. */
  aboutMedkit: boolean;
  /** Natal Gems from promo codes (on top of one per rebirth). */
  bonusGems: number;
  /** Promo codes already claimed on this phone (SHA-256 hashes). */
  promoClaims: string[];
  /** Rebirth 50 hall of fame: sent, declined, or not answered yet. */
  fame: "none" | "sent" | "declined";
  /** Minigame id -> times won (for the minigame achievements). */
  minigameWins: Record<string, number>;
  /** Minigame id -> times won without a mistake. */
  minigamePerfect: Record<string, number>;
  /** Minigames won in a row (a loss resets it), and the best run of wins. */
  minigameStreak: number;
  minigameBestStreak: number;
  /** An app icon chosen but not applied yet ("default" for the original); applied when the app is left. */
  pendingIcon: string | null;
  /** The how-to-play intro has been seen (shown once, on the first launch). */
  introSeen: boolean;
  /** Daily login streak. */
  daily: DailyState;
  /** The most medkits held at once this run (prices the custom background). */
  runPeak: number;
  /** Times the custom background photo was set; the first is free. */
  customBgChanges: number;
  /** Walking rewards (Android step counter). */
  walk: WalkState;
};

export type GameAction =
  /** `count` taps at once (fast taps are batched; default 1). */
  | { type: "tap"; count?: number }
  | { type: "tick"; seconds: number }
  | { type: "buy"; item: ItemId; count?: number }
  | { type: "earn"; amount: number }
  | { type: "heardPlaylist"; id: string }
  | { type: "switchedTheme" }
  | { type: "exported" }
  | { type: "unlockSection"; id: string }
  | { type: "rebirth" }
  | { type: "redeem"; rewardId: string }
  /** Server history (reward id -> times); keeps whichever history is longer, never refunds. */
  | { type: "syncRedemptions"; history: Record<string, number[]> }
  | { type: "useBoost"; id: string }
  | { type: "patientArrives"; id: string; next: number }
  /** The patient was transferred (waited too long) or treated; `next` schedules the next arrival. */
  | { type: "patientLeaves"; arrivedAt: number }
  | { type: "treat"; won: boolean; arrivedAt: number }
  | { type: "setRoom"; room: string }
  | { type: "buyBackground"; id: string }
  | { type: "buyGemUpgrade"; id: string }
  | { type: "buyGemItem"; id: string }
  | { type: "equip"; slot: "skin" | "tap"; id: string | null }
  | { type: "unlockDevTools" }
  | { type: "unlockCodeEntry" }
  | { type: "revealAboutMedkit" }
  | { type: "claimPromo"; hash: string; rewards: PromoItem[] }
  | { type: "devRebirth" }
  | { type: "setFame"; fame: "none" | "sent" | "declined" }
  | { type: "minigameWon"; game: string; perfect?: boolean }
  | { type: "minigameLost" }
  | { type: "setPendingIcon"; icon: string | null }
  | { type: "setIntroSeen"; seen: boolean }
  /** A new custom background photo was picked: free the first time, then CUSTOM_BG_COINS and customBgPrice. */
  | { type: "changeCustomBg" }
  /** Walking rewards on or off (turning on starts counting from the next reading). */
  | { type: "setWalk"; on: boolean }
  /** A step counter reading; pays any 500 m and 1 km rewards it completes. */
  | { type: "walkReading"; reading: StepReading; today: string }
  /** Claim today's daily gift (`today` is the local date, YYYY-MM-DD). */
  | { type: "claimDaily"; today: string }
  /** Place an item (or move it, including from another room) at x, y: fractions of the room art. */
  | { type: "placeItem"; room: string; item: string; x: number; y: number }
  | { type: "removeItem"; room: string; item: string }
  | { type: "load"; state: GameState }
  /** Like load, but never rolls back reward redemptions or unlocked sections. */
  | { type: "import"; state: GameState }
  | { type: "reset" }
  // Developer tools only (Settings, __DEV__ builds).
  | { type: "devAddItems"; count: number }
  | { type: "devUnlockAll" }
  | { type: "devAddCoins"; count: number };

/**
 * One part of a promo code's reward (codes are set up with scripts/add-promo.ts): medkits, Care
 * Coins or Natal Gems; a paid background unlocked for free; or `seconds` of healing at the current rate.
 */
export type PromoItem = { kind: "medkits" | "coins" | "gems" | "seconds"; amount: number } | { kind: "background"; id: string };

export const emptyOwned = (): Record<ItemId, number> =>
  Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, 0])) as Record<ItemId, number>;

export const newGame = (): GameState => ({
  healed: 0,
  totalHealed: 0,
  runHealed: 0,
  rebirths: 0,
  rebirthPoints: 0,
  taps: 0,
  owned: emptyOwned(),
  achievements: {},
  playSeconds: 0,
  playlistsHeard: [],
  themeSwitches: 0,
  exports: 0,
  startedAt: Date.now(),
  unlockedSections: [],
  redemptions: {},
  coinsSpent: 0,
  boosts: {},
  luckyTaps: 0,
  bonusCoins: 0,
  treated: 0,
  patients: [],
  nextPatientAt: Date.now() + 60_000,
  room: { current: ROOMS[0].id, placed: {}, layout: 2 },
  ownedBackgrounds: [],
  gemsSpent: 0,
  gemUpgrades: {},
  gemItems: [],
  medkitSkin: null,
  tapEffect: null,
  devTools: false,
  codeEntry: false,
  aboutMedkit: false,
  bonusGems: 0,
  promoClaims: [],
  fame: "none",
  minigameWins: {},
  minigamePerfect: {},
  minigameStreak: 0,
  minigameBestStreak: 0,
  pendingIcon: null,
  introSeen: false,
  daily: { streak: 0, last: null },
  runPeak: 0,
  customBgChanges: 0,
  walk: newWalk(),
});

/** Multiplier from a gem upgrade: 1 + per-level step x level. */
const gemMult = (s: { gemUpgrades?: Record<string, number> }, id: GemUpgradeId, step: number) => 1 + step * gemLevel(s, id);

/** Patients per medkit tap, including tap growth, the rebirth boost and (when passed) active boosts. */
export const tapValue = (s: { owned: Record<ItemId, number>; rebirths: number; taps?: number; boosts?: Record<string, number>; luckyTaps?: number; room?: RoomState; gemUpgrades?: Record<string, number> }) =>
  baseTap(perSecond(s.owned), s.taps) *
  rebirthMultiplier(s.rebirths) *
  gemMult(s, "steady_hands", 0.1) *
  (1 + roomBonus(s.room, "tap")) *
  boostMultiplier(s.boosts, "tap", Date.now(), (s.luckyTaps ?? 0) > 0 ? [LUCKY_MULT] : []);

/** Care Coins: every unlocked achievement pays its reward. */
export const coinsEarned = (s: Pick<GameState, "achievements">) =>
  ACHIEVEMENTS.reduce((sum, a) => sum + (s.achievements[a.id] !== undefined ? a.coins : 0), 0);
export const coinBalance = (s: Pick<GameState, "achievements" | "coinsSpent" | "bonusCoins">) => coinsEarned(s) + s.bonusCoins - s.coinsSpent;

/** Milliseconds until a reward can be redeemed again (0 = ready). */
export const cooldownLeft = (reward: { cooldownHours?: number }, times: number[], now = Date.now()) => {
  if (!reward.cooldownHours || times.length === 0) return 0;
  return Math.max(0, Math.max(...times) + reward.cooldownHours * 3_600_000 - now);
};

/** How many of these redemption times fall in the current calendar year. */
export const redeemedThisYear = (times: number[], now = Date.now()) => {
  const year = new Date(now).getFullYear();
  return times.filter((t) => new Date(t).getFullYear() === year).length;
};

/** At most this many sick patients wait in My Room at once. */
export const MAX_PATIENTS = 3;

type TreatState = { owned: Record<ItemId, number>; rebirths: number; treated: number; gemUpgrades?: Record<string, number> };

/** How hard this player's minigames are (0-1); the treat modal and the rewards both use it. */
export const wardLevel = (s: TreatState) => minigameLevel(s.treated, healingRate({ owned: s.owned, rebirths: s.rebirths }));

/**
 * Patients paid for treating a ward patient: minutes of production (more for harder games), with a
 * floor early in the game. A loss still pays a little.
 */
export const treatReward = (s: TreatState, won: boolean) => {
  const base = { owned: s.owned, rebirths: s.rebirths };
  const amount = won
    ? Math.max(healingRate(base) * WIN_SECONDS, tapValue(base) * WIN_TAPS) * minigameTuning(wardLevel(s)).rewardMult
    : Math.max(healingRate(base) * LOSE_SECONDS, tapValue(base) * LOSE_TAPS);
  return amount * gemMult(s, "bedside_manner", 0.2);
};

/** Care Coins for a ward win. */
export const treatCoins = (s: TreatState) => winCoins(wardLevel(s));

/** Patients admitted by tapping the emergency ambulance on the Hospital page. */
export const emergencyReward = (s: { owned: Record<ItemId, number>; rebirths: number; gemUpgrades?: Record<string, number> }) => {
  const base = { owned: s.owned, rebirths: s.rebirths };
  return Math.max(healingRate(base) * EMERGENCY_SECONDS, tapValue(base) * EMERGENCY_TAPS) * gemMult(s, "rapid_response", 0.25);
};

/** The flying heart's medkit burst: 90 seconds of production, at least 300 taps (boosts left out). */
export const flyingReward = (s: { owned: Record<ItemId, number>; rebirths: number; taps?: number; room?: RoomState; gemUpgrades?: Record<string, number> }) => {
  const base = { owned: s.owned, rebirths: s.rebirths, room: s.room };
  return Math.max(healingRate(base) * 90, tapValue({ ...base, taps: s.taps, gemUpgrades: s.gemUpgrades }) * 300);
};

/** Medkits for `seconds` of a daily gift: that much production at the unboosted rate, at least 10 taps a minute. */
export const dailyAmount = (s: { owned: Record<ItemId, number>; rebirths: number; room?: RoomState }, seconds: number) => {
  const base = { owned: s.owned, rebirths: s.rebirths, room: s.room };
  return Math.max(healingRate(base) * seconds, tapValue(base) * Math.max(10, seconds / 6));
};

/** Rounded down to its first digit: 213,532 -> 200,000; 413,131,411 -> 400,000,000. */
export const roundDownToLeading = (n: number) => {
  if (!(n >= 1)) return 0;
  const p = 10 ** Math.floor(Math.log10(n));
  return Math.floor(n / p) * p;
};
/** Changing the custom background photo (after the first): Care Coins, plus 20% of the run's highest balance. */
export const CUSTOM_BG_COINS = 20;
export const customBgPrice = (runPeak: number) => roundDownToLeading(runPeak * 0.2);

/** Offline earnings cap: 4 hours, plus 1 hour per Night Owl level. */
export const maxAwaySeconds = (s: { gemUpgrades?: Record<string, number> }) => (4 + gemLevel(s, "night_owl")) * 3600;

/** What the next unit of an item costs right now, including a running sale. */
export const priceOf = (s: Pick<GameState, "owned" | "boosts"> & { gemUpgrades?: Record<string, number> }, item: (typeof SHOP_ITEMS)[number]) =>
  Math.ceil(itemCost(item, s.owned[item.id]) * boostMultiplier(s.boosts, "price") * gemMult(s, "bulk_orders", -0.02));

/** What the next `count` units of an item cost together (each one priced as priceOf would when bought). */
export const bulkCost = (s: Pick<GameState, "owned" | "boosts"> & { gemUpgrades?: Record<string, number> }, item: (typeof SHOP_ITEMS)[number], count: number) => {
  const mult = boostMultiplier(s.boosts, "price") * gemMult(s, "bulk_orders", -0.02);
  let total = 0;
  for (let k = 0; k < count; k++) total += Math.ceil(itemCost(item, s.owned[item.id] + k) * mult);
  return total;
};

export const totalOwned = (owned: Record<ItemId, number>) =>
  Object.values(owned).reduce((a, b) => a + b, 0);

/** Adds without ever overflowing to Infinity: an endless grind tops out at the largest number. */
const capped = (a: number, b: number) => Math.min(Number.MAX_VALUE, a + (Number.isFinite(b) ? b : Number.MAX_VALUE));
const earn = (state: GameState, amount: number): GameState => {
  const healed = capped(state.healed, amount);
  return {
    ...state,
    healed,
    totalHealed: capped(state.totalHealed, amount),
    runHealed: capped(state.runHealed, amount),
    runPeak: Math.max(state.runPeak, healed),
  };
};

const withAchievements = (state: GameState): GameState => {
  let unlocked: GameState["achievements"] | null = null;
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id] === undefined && a.check(state)) {
      unlocked ??= { ...state.achievements };
      unlocked[a.id] = Date.now();
    }
  }
  return unlocked ? { ...state, achievements: unlocked } : state;
};

const apply = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "tap": {
      const count = Math.max(1, Math.floor(action.count ?? 1));
      // Lucky Stethoscope taps are used up first; the rest heal the normal amount.
      const lucky = Math.min(count, state.luckyTaps);
      // Each kind of tap is worth what tapValue shows for it (Lucky adds to other tap boosts, like they add up).
      const amount = tapValue({ ...state, luckyTaps: 0 }) * (count - lucky) + tapValue({ ...state, luckyTaps: 1 }) * lucky;
      return { ...earn(state, amount), taps: state.taps + count, luckyTaps: state.luckyTaps - lucky };
    }
    case "tick": {
      const next = earn(state, healingRate(state) * action.seconds);
      return { ...next, playSeconds: state.playSeconds + action.seconds };
    }
    case "buy": {
      const item = SHOP_ITEMS.find((i) => i.id === action.item);
      if (!item) return state;
      // x1 / x10 / x100: all or nothing, so the bundle is only bought when every unit is affordable.
      const count = Math.max(1, Math.floor(action.count ?? 1));
      const cost = bulkCost(state, item, count);
      if (state.healed < cost) return state;
      return {
        ...state,
        healed: state.healed - cost,
        owned: { ...state.owned, [item.id]: state.owned[item.id] + count },
      };
    }
    case "earn":
      return earn(state, action.amount);
    case "heardPlaylist":
      if (state.playlistsHeard.includes(action.id)) return state;
      return { ...state, playlistsHeard: [...state.playlistsHeard, action.id] };
    case "switchedTheme":
      return { ...state, themeSwitches: state.themeSwitches + 1 };
    case "exported":
      return { ...state, exports: state.exports + 1 };
    case "rebirth": {
      const gems = gemsForRebirth(state.runHealed, state.rebirths);
      if (gems <= 0) return state;
      // A new run: patients and supplies reset; achievements, lifetime stats, rewards and settings stay.
      return {
        ...state,
        healed: 0,
        runHealed: 0,
        runPeak: 0,
        // Head Start: each level gives 10 bandages and 5 gloves to begin with.
        owned: { ...emptyOwned(), bandage: 10 * gemLevel(state, "head_start"), gloves: 5 * gemLevel(state, "head_start") },
        rebirths: state.rebirths + 1,
        rebirthPoints: state.rebirthPoints + gems,
      };
    }
    case "unlockSection":
      if (state.unlockedSections.includes(action.id)) return state;
      return { ...state, unlockedSections: [...state.unlockedSections, action.id] };
    case "redeem": {
      const section = REWARD_SECTIONS.find((s) => s.rewards.some((r) => r.id === action.rewardId));
      const reward = section?.rewards.find((r) => r.id === action.rewardId);
      if (!section || !reward || !state.unlockedSections.includes(section.id)) return state;
      const history = state.redemptions[reward.id] ?? [];
      if ((reward.limit !== null && history.length >= reward.limit) || state.healed < reward.cost) return state;
      if (reward.minRebirths && state.rebirths < reward.minRebirths) return state;
      if (reward.perYear !== undefined && redeemedThisYear(history) >= reward.perYear) return state;
      if (cooldownLeft(reward, history) > 0) return state;
      return {
        ...state,
        healed: state.healed - reward.cost,
        redemptions: { ...state.redemptions, [reward.id]: [...history, Date.now()] },
      };
    }
    case "syncRedemptions": {
      const redemptions = { ...state.redemptions };
      let changed = false;
      for (const [id, times] of Object.entries(action.history)) {
        if (times.length > (redemptions[id]?.length ?? 0)) {
          redemptions[id] = times;
          changed = true;
        }
      }
      return changed ? { ...state, redemptions } : state;
    }
    case "useBoost": {
      const boost = BOOSTS.find((b) => b.id === action.id);
      if (!boost || coinBalance(state) < boost.cost) return state;
      const paid = { ...state, coinsSpent: state.coinsSpent + boost.cost };
      const e = boost.effect;
      if (e.kind === "timed") {
        const now = Date.now();
        return { ...paid, boosts: { ...state.boosts, [boost.id]: Math.max(now, state.boosts[boost.id] ?? 0) + e.seconds * 1000 } };
      }
      if (e.kind === "charges") return { ...paid, luckyTaps: state.luckyTaps + e.taps };
      // Instant: based on the unboosted rate, and never less than 10 taps early in the game.
      const base = { owned: state.owned, rebirths: state.rebirths };
      const amount = e.rateSeconds ? Math.max(healingRate(base) * e.rateSeconds, tapValue(base) * 10) : tapValue(base) * (e.taps ?? 0);
      return earn(paid, amount);
    }
    case "patientArrives": {
      if (state.patients.length >= MAX_PATIENTS) return state;
      // Arrival times must differ: they tell patients apart.
      const at = Math.max(Date.now(), (state.patients.at(-1)?.arrivedAt ?? 0) + 1);
      return { ...state, patients: [...state.patients, { id: action.id, arrivedAt: at }], nextPatientAt: action.next };
    }
    case "patientLeaves":
      return { ...state, patients: state.patients.filter((p) => p.arrivedAt !== action.arrivedAt) };
    case "treat": {
      if (!state.patients.some((p) => p.arrivedAt === action.arrivedAt)) return state;
      const amount = treatReward(state, action.won);
      const done = { ...state, patients: state.patients.filter((p) => p.arrivedAt !== action.arrivedAt) };
      return earn(action.won ? { ...done, treated: state.treated + 1, bonusCoins: state.bonusCoins + treatCoins(state) } : done, amount);
    }
    case "buyBackground": {
      const bg = BACKGROUNDS.find((b) => b.id === action.id);
      if (!bg?.price || state.ownedBackgrounds.includes(bg.id) || coinBalance(state) < bg.price) return state;
      return { ...state, coinsSpent: state.coinsSpent + bg.price, ownedBackgrounds: [...state.ownedBackgrounds, bg.id] };
    }
    case "buyGemUpgrade": {
      if (!GEM_UPGRADES.some((u) => u.id === action.id)) return state;
      const level = state.gemUpgrades[action.id] ?? 0;
      const cost = GEM_LEVEL_COSTS[level];
      if (cost === undefined || gemBalance(state) < cost) return state;
      return { ...state, gemsSpent: state.gemsSpent + cost, gemUpgrades: { ...state.gemUpgrades, [action.id]: level + 1 } };
    }
    case "buyGemItem": {
      const item = GEM_ITEMS.find((i) => i.id === action.id);
      if (!item || state.gemItems.includes(item.id) || state.rebirths < item.rebirths || gemBalance(state) < item.cost) return state;
      if (item.section && !state.unlockedSections.includes(item.section)) return state;
      return {
        ...state,
        gemsSpent: state.gemsSpent + item.cost,
        gemItems: [...state.gemItems, item.id],
        // Backgrounds join the backgrounds list; skins and tap effects are put on straight away.
        ownedBackgrounds: item.kind === "background" ? [...state.ownedBackgrounds, item.id] : state.ownedBackgrounds,
        medkitSkin: item.kind === "skin" ? item.id : state.medkitSkin,
        tapEffect: item.kind === "tap" ? item.id : state.tapEffect,
      };
    }
    case "equip": {
      if (action.id !== null && !state.gemItems.includes(action.id)) return state;
      return action.slot === "skin" ? { ...state, medkitSkin: action.id } : { ...state, tapEffect: action.id };
    }
    case "unlockDevTools":
      return state.devTools ? state : { ...state, devTools: true };
    case "unlockCodeEntry":
      return state.codeEntry ? state : { ...state, codeEntry: true };
    case "revealAboutMedkit":
      return state.aboutMedkit ? state : { ...state, aboutMedkit: true };
    case "claimPromo": {
      if (state.promoClaims.includes(action.hash) || action.rewards.length === 0) return state;
      let next: GameState = { ...state, promoClaims: [...state.promoClaims, action.hash] };
      for (const r of action.rewards) {
        if (r.kind === "background") {
          if (BACKGROUNDS.some((b) => b.id === r.id) && !next.ownedBackgrounds.includes(r.id)) next = { ...next, ownedBackgrounds: [...next.ownedBackgrounds, r.id] };
          continue;
        }
        if (!(r.amount > 0)) continue;
        if (r.kind === "coins") next = { ...next, bonusCoins: next.bonusCoins + r.amount };
        else if (r.kind === "gems") next = { ...next, bonusGems: next.bonusGems + r.amount };
        else if (r.kind === "medkits") next = earn(next, r.amount);
        else {
          // Seconds of healing, like Emergency Funding: the unboosted rate, and never less than 10 taps.
          const base = { owned: next.owned, rebirths: next.rebirths };
          next = earn(next, Math.max(healingRate(base) * r.amount, tapValue(base) * 10));
        }
      }
      return next;
    }
    case "setPendingIcon":
      return { ...state, pendingIcon: action.icon };
    case "changeCustomBg": {
      if (!state.ownedBackgrounds.includes("custom")) return state;
      if (state.customBgChanges === 0) return { ...state, customBgChanges: 1 };
      const price = customBgPrice(state.runPeak);
      if (coinBalance(state) < CUSTOM_BG_COINS || state.healed < price) return state;
      return { ...state, coinsSpent: state.coinsSpent + CUSTOM_BG_COINS, healed: state.healed - price, customBgChanges: state.customBgChanges + 1 };
    }
    case "setWalk":
      return { ...state, walk: { ...state.walk, on: action.on, last: action.on ? state.walk.last : null } };
    case "walkReading": {
      if (!state.walk.on) return state;
      const { walk, due500, due1k } = addReading(state.walk, action.reading, action.today);
      let next: GameState = { ...state, walk };
      if (due1k > 0) next = { ...next, bonusCoins: next.bonusCoins + due1k * COINS_PER_KM };
      if (due500 > 0) next = earn(next, dailyAmount(next, MEDKIT_SECONDS * due500));
      return next;
    }
    case "claimDaily": {
      const gift = todaysGift(state.daily, action.today);
      if (!gift) return state;
      let next: GameState = { ...state, daily: { streak: gift.day, last: action.today } };
      if (gift.coins) next = { ...next, bonusCoins: next.bonusCoins + gift.coins };
      if (gift.gems) next = { ...next, bonusGems: next.bonusGems + gift.gems };
      if (gift.seconds) next = earn(next, dailyAmount(next, gift.seconds));
      return next;
    }
    case "setIntroSeen":
      return state.introSeen === action.seen ? state : { ...state, introSeen: action.seen };
    case "minigameWon": {
      const streak = state.minigameStreak + 1;
      return {
        ...state,
        minigameWins: { ...state.minigameWins, [action.game]: (state.minigameWins[action.game] ?? 0) + 1 },
        minigamePerfect: action.perfect ? { ...state.minigamePerfect, [action.game]: (state.minigamePerfect[action.game] ?? 0) + 1 } : state.minigamePerfect,
        minigameStreak: streak,
        minigameBestStreak: Math.max(state.minigameBestStreak, streak),
      };
    }
    case "minigameLost":
      return state.minigameStreak === 0 ? state : { ...state, minigameStreak: 0 };
    case "setFame":
      return { ...state, fame: action.fame };
    case "devRebirth":
      // Dev tools: a rebirth without the patient requirement.
      return { ...state, healed: 0, runHealed: 0, runPeak: 0, owned: emptyOwned(), rebirths: state.rebirths + 1, rebirthPoints: state.rebirthPoints + 1 };
    case "setRoom": {
      const room = ROOMS.find((r) => r.id === action.room);
      if (!room || !isUnlocked(room.unlock, state)) return state;
      return { ...state, room: { ...state.room, current: room.id } };
    }
    case "placeItem": {
      const room = ROOMS.find((r) => r.id === action.room);
      const item = ROOM_ITEMS.find((i) => i.id === action.item);
      if (!room || !item || !isUnlocked(item.unlock, state)) return state;
      // One of each item: take it out of wherever it is first.
      const placed = Object.fromEntries(Object.entries(state.room.placed).map(([k, v]) => [k, v.filter((p) => p.item !== item.id)]));
      const here = placed[room.id] ?? [];
      if (roomCount(here, !!item.staff) >= (item.staff ? STAFF_PER_ROOM : room.limit)) return state;
      // Kept inside its zone, off the room's signs, windows and furniture, and (on the wall) off the
      // other wall items: it snaps to the nearest free spot, or stays put if the wall is full.
      const spot = spotFor(room, here, item, action.x, action.y);
      if (!spot) return state;
      const { x, y } = spot;
      return { ...state, room: { ...state.room, placed: { ...placed, [room.id]: [...here, { item: item.id, x, y }] } } };
    }
    case "removeItem": {
      const here = state.room.placed[action.room] ?? [];
      return { ...state, room: { ...state.room, placed: { ...state.room.placed, [action.room]: here.filter((p) => p.item !== action.item) } } };
    }
    case "load":
    case "import":
      return action.state;
    case "devAddItems":
      return {
        ...state,
        owned: Object.fromEntries(Object.entries(state.owned).map(([k, v]) => [k, v + action.count])) as GameState["owned"],
      };
    case "devUnlockAll":
      return { ...state, achievements: Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, state.achievements[a.id] ?? Date.now()])) };
    case "devAddCoins":
      return { ...state, coinsSpent: state.coinsSpent - action.count };
    case "reset":
      return newGame();
  }
};

/** Placed staff, or placed items that aren't staff (staff have their own limit). */
export const roomCount = (here: { item: string }[], staff: boolean) => here.filter((p) => !!ROOM_ITEMS.find((i) => i.id === p.item)?.staff === staff).length;

/** Redemptions are real-world purchases: keep the longer history so importing an old save can't refund them. */
const keepRewards = (from: GameState, into: GameState): GameState => {
  const redemptions = { ...into.redemptions };
  for (const [id, times] of Object.entries(from.redemptions)) {
    if (times.length > (redemptions[id]?.length ?? 0)) redemptions[id] = times;
  }
  const unlockedSections = [...new Set([...into.unlockedSections, ...from.unlockedSections])];
  return { ...into, redemptions, unlockedSections };
};

/**
 * Puts away room items that are locked again (a rebirth resets supplies, which some items need),
 * so My Room only shows items the player has.
 */
function putAwayLocked(s: GameState): GameState {
  const ok = (id: string) => {
    const item = ROOM_ITEMS.find((i) => i.id === id);
    return !!item && isUnlocked(item.unlock, s);
  };
  const lists = Object.entries(s.room.placed);
  if (lists.every(([, list]) => list.every((p) => ok(p.item)))) return s;
  return { ...s, room: { ...s.room, placed: Object.fromEntries(lists.map(([k, list]) => [k, list.filter((p) => ok(p.item))])) } };
}

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  // Deleting progress starts over completely, code unlocks included; the server still remembers
  // what was redeemed, so the limits hold.
  if (action.type === "reset") return newGame();
  if (action.type === "import") return putAwayLocked(withAchievements(keepRewards(state, action.state)));
  const next = withAchievements(apply(state, action));
  return action.type === "rebirth" || action.type === "devRebirth" || action.type === "load" ? putAwayLocked(next) : next;
};

/** Saves from the 320x180 rooms: each placed item moves with the art, then onto a free spot. */
function upgradeRoom(room: RoomState): RoomState {
  if (room.layout === 2) return room;
  const placed = Object.fromEntries(
    Object.entries(room.placed).map(([id, list]) => {
      const r = ROOMS.find((x) => x.id === id);
      return [id, list.map((p) => {
        const item = ROOM_ITEMS.find((i) => i.id === p.item);
        const y = fromOldArt(p.y);
        return r && item ? { ...p, ...snapPlacement(r, item.place, p.x, y) } : { ...p, y };
      })];
    }),
  );
  return { ...room, placed, layout: 2 };
}

/** Fills in fields missing from older or hand-edited saves. */
export const normalizeSave = (raw: unknown): GameState | null => {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<GameState>;
  if (typeof s.healed !== "number" || !Number.isFinite(s.healed)) return null;
  const base = newGame();
  return {
    ...base,
    ...s,
    owned: { ...base.owned, ...(s.owned ?? {}) },
    achievements: { ...(s.achievements ?? {}) },
    playlistsHeard: Array.isArray(s.playlistsHeard) ? s.playlistsHeard : [],
    // Saves from before rebirth existed: the whole history counts as the current run.
    runHealed: typeof s.runHealed === "number" ? s.runHealed : (s.totalHealed ?? 0),
    unlockedSections: Array.isArray(s.unlockedSections) ? s.unlockedSections : [],
    redemptions: { ...(s.redemptions ?? {}) },
    coinsSpent: typeof s.coinsSpent === "number" ? s.coinsSpent : 0,
    boosts: { ...(s.boosts ?? {}) },
    luckyTaps: typeof s.luckyTaps === "number" ? s.luckyTaps : 0,
    bonusCoins: typeof s.bonusCoins === "number" ? s.bonusCoins : 0,
    treated: typeof s.treated === "number" ? s.treated : 0,
    // Older saves had one waiting patient.
    patients: Array.isArray(s.patients) ? s.patients.slice(0, MAX_PATIENTS) : (s as { patient?: { id: string; arrivedAt: number } | null }).patient ? [(s as { patient: { id: string; arrivedAt: number } }).patient] : [],
    nextPatientAt: typeof s.nextPatientAt === "number" ? s.nextPatientAt : base.nextPatientAt,
    // Natal Gems are one per rebirth; older saves had cube-root rebirth points, so cap them at the rebirth count.
    rebirthPoints: Math.min(typeof s.rebirthPoints === "number" ? s.rebirthPoints : 0, typeof s.rebirths === "number" ? s.rebirths : 0),
    ownedBackgrounds: Array.isArray(s.ownedBackgrounds) ? s.ownedBackgrounds : [],
    gemsSpent: typeof s.gemsSpent === "number" ? s.gemsSpent : 0,
    gemUpgrades: { ...(s.gemUpgrades ?? {}) },
    gemItems: Array.isArray(s.gemItems) ? s.gemItems : [],
    medkitSkin: typeof s.medkitSkin === "string" ? s.medkitSkin : null,
    tapEffect: typeof s.tapEffect === "string" ? s.tapEffect : null,
    devTools: s.devTools === true,
    codeEntry: s.codeEntry === true,
    aboutMedkit: s.aboutMedkit === true,
    bonusGems: typeof s.bonusGems === "number" ? s.bonusGems : 0,
    promoClaims: Array.isArray(s.promoClaims) ? s.promoClaims : [],
    fame: s.fame === "sent" || s.fame === "declined" ? s.fame : "none",
    minigameWins: { ...(s.minigameWins ?? {}) },
    minigamePerfect: { ...(s.minigamePerfect ?? {}) },
    minigameStreak: typeof s.minigameStreak === "number" ? s.minigameStreak : 0,
    minigameBestStreak: typeof s.minigameBestStreak === "number" ? s.minigameBestStreak : 0,
    pendingIcon: typeof s.pendingIcon === "string" ? s.pendingIcon : null,
    // Saves from before the intro existed belong to players who already know the game.
    runPeak: typeof s.runPeak === "number" ? s.runPeak : s.healed,
    walk: s.walk && typeof s.walk.meters === "number" ? { ...newWalk(), ...s.walk } : newWalk(),
    customBgChanges: typeof s.customBgChanges === "number" ? s.customBgChanges : 0,
    daily: s.daily && typeof s.daily.streak === "number" ? { streak: s.daily.streak, last: typeof s.daily.last === "string" ? s.daily.last : null } : base.daily,
    introSeen: s.introSeen === true || (typeof s.introSeen !== "boolean" && (s.taps ?? 0) > 0),
    room: s.room && typeof s.room.current === "string" ? upgradeRoom({ current: s.room.current, placed: { ...(s.room.placed ?? {}) }, layout: s.room.layout }) : base.room,
  };
};
