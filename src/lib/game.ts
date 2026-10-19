import { ACHIEVEMENTS, type AchievementId } from "@/constants/achievements";
import { healingRate, rebirthMultiplier, rebirthPointsFor } from "@/constants/rebirth";
import { REWARD_SECTIONS } from "@/constants/rewards";
import { SHOP_ITEMS, TAP_RATE_BONUS, itemCost, perSecond, type ItemId } from "@/constants/items";

export type GameState = {
  /** Spendable balance, shown as "Patients Healed". */
  healed: number;
  /** Everything ever earned, across rebirths; drives achievements and shop reveals. */
  totalHealed: number;
  /** Earned since the last rebirth; decides rebirth points. */
  runHealed: number;
  rebirths: number;
  /** Prestige currency earned by rebirthing; never reset. */
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
};

export type GameAction =
  | { type: "tap" }
  | { type: "tick"; seconds: number }
  | { type: "buy"; item: ItemId }
  | { type: "earn"; amount: number }
  | { type: "heardPlaylist"; id: string }
  | { type: "switchedTheme" }
  | { type: "exported" }
  | { type: "unlockSection"; id: string }
  | { type: "rebirth" }
  | { type: "redeem"; rewardId: string }
  | { type: "load"; state: GameState }
  /** Like load, but never rolls back reward redemptions or unlocked sections. */
  | { type: "import"; state: GameState }
  | { type: "reset" }
  // Developer tools only (Settings, __DEV__ builds).
  | { type: "devAddItems"; count: number }
  | { type: "devUnlockAll" };

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
});

/** Patients per medkit tap, including the rebirth boost. */
export const tapValue = (s: { owned: Record<ItemId, number>; rebirths: number }) =>
  (1 + perSecond(s.owned) * TAP_RATE_BONUS) * rebirthMultiplier(s.rebirths);

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
      return { ...earn(state, tapValue(state)), taps: state.taps + 1 };
    case "tick": {
      const next = earn(state, healingRate(state) * action.seconds);
      return { ...next, playSeconds: state.playSeconds + action.seconds };
    }
    case "buy": {
      const item = SHOP_ITEMS.find((i) => i.id === action.item);
      if (!item) return state;
      const cost = itemCost(item, state.owned[item.id]);
      if (state.healed < cost) return state;
      return {
        ...state,
        healed: state.healed - cost,
        owned: { ...state.owned, [item.id]: state.owned[item.id] + 1 },
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
      const points = rebirthPointsFor(state.runHealed);
      if (points <= 0) return state;
      // A new run: patients and supplies reset; achievements, lifetime stats, rewards and settings stay.
      return {
        ...state,
        healed: 0,
        runHealed: 0,
        owned: emptyOwned(),
        rebirths: state.rebirths + 1,
        rebirthPoints: state.rebirthPoints + points,
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
      if (history.length >= reward.limit || state.healed < reward.cost) return state;
      return {
        ...state,
        healed: state.healed - reward.cost,
        redemptions: { ...state.redemptions, [reward.id]: [...history, Date.now()] },
      };
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
  };
};
