import { ACHIEVEMENTS, type AchievementId } from "@/constants/achievements";
import { gemsForRebirth, healingRate, rebirthMultiplier } from "@/constants/rebirth";
import { BACKGROUNDS } from "@/constants/backgrounds";
import { BOOSTS, LUCKY_MULT, boostMultiplier } from "@/constants/boosts";
import { LOSE_SECONDS, WIN_COINS, WIN_SECONDS } from "@/constants/patients";
import { GEM_ITEMS, GEM_LEVEL_COSTS, GEM_UPGRADES, gemBalance, gemLevel, type GemUpgradeId } from "@/constants/gems";
import { EMERGENCY_SECONDS, EMERGENCY_TAPS } from "@/constants/hospital";
import { REWARD_SECTIONS } from "@/constants/rewards";
import { ROOMS, ROOM_ITEMS, ZONES, isUnlocked, roomBonus, type RoomState } from "@/constants/room";
import { SHOP_ITEMS, TAP_RATE_BONUS, itemCost, perSecond, type ItemId } from "@/constants/items";

export type GameState = {
  /** Spendable balance, shown as "Patients Healed". */
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
  /** The sick patient waiting in the ward, if any. */
  patient: { id: string; arrivedAt: number } | null;
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
};

export type GameAction =
  | { type: "tap" }
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
  | { type: "patientArrives"; id: string }
  /** The patient was transferred (waited too long) or treated; `next` schedules the next arrival. */
  | { type: "patientLeaves"; next: number }
  | { type: "treat"; won: boolean; next: number }
  | { type: "setRoom"; room: string }
  | { type: "buyBackground"; id: string }
  | { type: "buyGemUpgrade"; id: string }
  | { type: "buyGemItem"; id: string }
  | { type: "equip"; slot: "skin" | "tap"; id: string | null }
  | { type: "unlockDevTools" }
  | { type: "unlockCodeEntry" }
  | { type: "revealAboutMedkit" }
  | { type: "claimPromo"; hash: string; kind: "medkits" | "coins" | "gems"; amount: number }
  | { type: "devRebirth" }
  | { type: "setFame"; fame: "sent" | "declined" }
  | { type: "minigameWon"; game: string }
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
  patient: null,
  nextPatientAt: Date.now() + 60_000,
  room: { current: ROOMS[0].id, placed: {} },
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
});

/** Multiplier from a gem upgrade: 1 + per-level step x level. */
const gemMult = (s: { gemUpgrades?: Record<string, number> }, id: GemUpgradeId, step: number) => 1 + step * gemLevel(s, id);

/** Patients per medkit tap, including the rebirth boost and (when passed) active boosts. */
export const tapValue = (s: { owned: Record<ItemId, number>; rebirths: number; boosts?: Record<string, number>; luckyTaps?: number; room?: RoomState; gemUpgrades?: Record<string, number> }) =>
  (1 + perSecond(s.owned) * TAP_RATE_BONUS) *
  rebirthMultiplier(s.rebirths) *
  gemMult(s, "steady_hands", 0.1) *
  (1 + roomBonus(s.room, "tap")) *
  boostMultiplier(s.boosts, "tap") *
  ((s.luckyTaps ?? 0) > 0 ? LUCKY_MULT : 1);

/** Care Coins: every unlocked achievement pays its reward. */
export const coinsEarned = (s: Pick<GameState, "achievements">) =>
  ACHIEVEMENTS.reduce((sum, a) => sum + (s.achievements[a.id] !== undefined ? a.coins : 0), 0);
export const coinBalance = (s: Pick<GameState, "achievements" | "coinsSpent" | "bonusCoins">) => coinsEarned(s) + s.bonusCoins - s.coinsSpent;

/** How many of these redemption times fall in the current calendar year. */
export const redeemedThisYear = (times: number[], now = Date.now()) => {
  const year = new Date(now).getFullYear();
  return times.filter((t) => new Date(t).getFullYear() === year).length;
};

/** Patients paid for treating a ward patient: minutes of production, with a floor early in the game. */
export const treatReward = (s: { owned: Record<ItemId, number>; rebirths: number; gemUpgrades?: Record<string, number> }, won: boolean) => {
  const base = { owned: s.owned, rebirths: s.rebirths };
  const amount = won ? Math.max(healingRate(base) * WIN_SECONDS, tapValue(base) * 50) : Math.max(healingRate(base) * LOSE_SECONDS, tapValue(base) * 5);
  return amount * gemMult(s, "bedside_manner", 0.2);
};

/** Patients admitted by tapping the emergency ambulance on the Hospital page. */
export const emergencyReward = (s: { owned: Record<ItemId, number>; rebirths: number; gemUpgrades?: Record<string, number> }) => {
  const base = { owned: s.owned, rebirths: s.rebirths };
  return Math.max(healingRate(base) * EMERGENCY_SECONDS, tapValue(base) * EMERGENCY_TAPS) * gemMult(s, "rapid_response", 0.25);
};

/** Offline earnings cap: 4 hours, plus 1 hour per Night Owl level. */
export const maxAwaySeconds = (s: { gemUpgrades?: Record<string, number> }) => (4 + gemLevel(s, "night_owl")) * 3600;

/** What the next unit of an item costs right now, including a running sale. */
export const priceOf = (s: Pick<GameState, "owned" | "boosts"> & { gemUpgrades?: Record<string, number> }, item: (typeof SHOP_ITEMS)[number]) =>
  Math.ceil(itemCost(item, s.owned[item.id]) * boostMultiplier(s.boosts, "price") * gemMult(s, "bulk_orders", -0.02));

/** What the next `count` units of an item cost together (each one priced as it would be when bought). */
export const bulkCost = (s: Pick<GameState, "owned" | "boosts"> & { gemUpgrades?: Record<string, number> }, item: (typeof SHOP_ITEMS)[number], count: number) => {
  let total = 0;
  for (let k = 0; k < count; k++) total += priceOf({ ...s, owned: { ...s.owned, [item.id]: s.owned[item.id] + k } }, item);
  return total;
};

export const totalOwned = (owned: Record<ItemId, number>) =>
  Object.values(owned).reduce((a, b) => a + b, 0);

const earn = (state: GameState, amount: number): GameState => ({
  ...state,
  healed: state.healed + amount,
  totalHealed: state.totalHealed + amount,
  runHealed: state.runHealed + amount,
});

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
    case "tap":
      return { ...earn(state, tapValue(state)), taps: state.taps + 1, luckyTaps: Math.max(0, state.luckyTaps - 1) };
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
    case "patientArrives":
      if (state.patient) return state;
      return { ...state, patient: { id: action.id, arrivedAt: Date.now() } };
    case "patientLeaves":
      return { ...state, patient: null, nextPatientAt: action.next };
    case "treat": {
      if (!state.patient) return state;
      const amount = treatReward(state, action.won);
      const done = { ...state, patient: null, nextPatientAt: action.next };
      return earn(action.won ? { ...done, treated: state.treated + 1, bonusCoins: state.bonusCoins + WIN_COINS } : done, amount);
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
      if (state.promoClaims.includes(action.hash) || !(action.amount > 0)) return state;
      const claimed = { ...state, promoClaims: [...state.promoClaims, action.hash] };
      if (action.kind === "coins") return { ...claimed, bonusCoins: state.bonusCoins + action.amount };
      if (action.kind === "gems") return { ...claimed, bonusGems: state.bonusGems + action.amount };
      return earn(claimed, action.amount);
    }
    case "minigameWon":
      return { ...state, minigameWins: { ...state.minigameWins, [action.game]: (state.minigameWins[action.game] ?? 0) + 1 } };
    case "setFame":
      return { ...state, fame: action.fame };
    case "devRebirth":
      // Dev tools: a rebirth without the patient requirement.
      return { ...state, healed: 0, runHealed: 0, owned: emptyOwned(), rebirths: state.rebirths + 1, rebirthPoints: state.rebirthPoints + 1 };
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
      if (here.length >= room.limit) return state;
      const zone = ZONES[item.place];
      const x = Math.min(0.95, Math.max(0.05, action.x));
      const y = Math.min(zone.maxY, Math.max(zone.minY, action.y));
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

/** Redemptions are real-world purchases: keep the longer history so resets and old saves can't refund them. */
const keepRewards = (from: GameState, into: GameState): GameState => {
  const redemptions = { ...into.redemptions };
  for (const [id, times] of Object.entries(from.redemptions)) {
    if (times.length > (redemptions[id]?.length ?? 0)) redemptions[id] = times;
  }
  const unlockedSections = [...new Set([...into.unlockedSections, ...from.unlockedSections])];
  return { ...into, redemptions, unlockedSections };
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  if (action.type === "reset") return keepRewards(state, newGame());
  if (action.type === "import") return withAchievements(keepRewards(state, action.state));
  return withAchievements(apply(state, action));
};

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
    patient: s.patient && typeof s.patient.id === "string" ? s.patient : null,
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
    room: s.room && typeof s.room.current === "string" ? { current: s.room.current, placed: { ...(s.room.placed ?? {}) } } : base.room,
  };
};
