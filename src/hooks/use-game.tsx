import { createContext, use, useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { AppState, type ImageSourcePropType } from "react-native";

import { clearOldImageCache } from "@/components/ui/image";
import { ACHIEVEMENTS } from "@/constants/achievements";
import { PATIENT_WAIT_MS, SICK_PATIENTS, nextPatientDelay } from "@/constants/patients";
import { healingRate } from "@/constants/rebirth";
import type { ThemeName } from "@/constants/theme";
import { formatCount, formatDuration } from "@/lib/format";
import { gameReducer, maxAwaySeconds, newGame, type GameAction, type GameState } from "@/lib/game";
import { DEFAULT_SETTINGS, clearGame, loadGame, loadSettings, saveGame, saveSettings, type Settings } from "@/lib/storage";

// 5 updates a second: smooth enough for the counter, and half the work of 10.
const TICK_MS = 200;
/** Achievements unlocked in the first minute after launch wait, so their toasts aren't missed on start-up. */
const ACHIEVEMENT_QUIET_MS = 60_000;
const AUTOSAVE_MS = 10_000;
/** Gaps longer than this (app closed, backgrounded, tab hidden) count as time away. */
const AWAY_THRESHOLD_S = 5;

export type Toast = { id: number; title: string; body: string; kind: "achievement" | "info"; image?: ImageSourcePropType };

type GameActions = {
  dispatch: (action: GameAction) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setTheme: (theme: ThemeName) => void;
  replaceSave: (state: GameState) => void;
  resetProgress: () => Promise<void>;
  pushToast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  /** Developer tools: pretend the app was closed for this long. */
  simulateAway: (seconds: number) => void;
};

const StateContext = createContext<GameState | null>(null);
/** The same state as a subscribable store, for components that only need a slice of it. */
type Store = { get: () => GameState; subscribe: (listener: () => void) => () => void };
const StoreContext = createContext<Store | null>(null);
const SettingsContext = createContext<Settings>(DEFAULT_SETTINGS);
const ToastContext = createContext<Toast[]>([]);
const ActionsContext = createContext<GameActions | null>(null);

export function GameProvider({ children, onReady }: { children: ReactNode; onReady?: () => void }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, newGame);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ready, setReady] = useState(false);

  // Mirrors of state for timers and listeners, which shouldn't restart on every tick.
  const stateRef = useRef(state);
  const lastTick = useRef(0);
  const seenAchievements = useRef<Set<string> | null>(null);
  const toastId = useRef(0);

  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++toastId.current;
    // Two at most, stacked under the menu button.
    setToasts((t) => [...t.slice(-1), { ...toast, id }]);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const grantAway = useCallback(
    (seconds: number) => {
      // Boosts don't run while the app is closed.
      const { owned, rebirths, room } = stateRef.current;
      const away = Math.min(seconds, maxAwaySeconds(stateRef.current));
      const earned = healingRate({ owned, rebirths, room }) * away;
      if (earned < 1) return;
      dispatch({ type: "earn", amount: earned });
      pushToast({
        kind: "info",
        title: "Welcome back",
        body: `Your team healed ${formatCount(earned)} patients in ${formatDuration(away)}.`,
      });
    },
    [pushToast],
  );

  // Load the save, then credit the time the app was closed.
  useEffect(() => {
    let cancelled = false;
    clearOldImageCache();
    Promise.all([loadGame(), loadSettings()]).then(([saved, loadedSettings]) => {
      if (cancelled) return;
      setSettings(loadedSettings);
      if (saved) {
        dispatch({ type: "load", state: saved.state });
        stateRef.current = saved.state;
        // Achievements already in the save are not new; anything unlocked from here on gets a toast.
        seenAchievements.current = new Set(Object.keys(saved.state.achievements));
        lastTick.current = saved.savedAt;
      } else {
        lastTick.current = Date.now();
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The store: components using useGameSelector re-render only when their slice changes.
  const listeners = useRef(new Set<() => void>());
  const [store] = useState<Store>(() => ({
    get: () => stateRef.current,
    subscribe: (l) => {
      listeners.current.add(l);
      return () => listeners.current.delete(l);
    },
  }));
  useEffect(() => {
    stateRef.current = state;
    listeners.current.forEach((l) => l());
  }, [state]);

  useEffect(() => {
    if (ready) onReady?.();
  }, [ready, onReady]);

  // Game loop.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const now = Date.now();
      const seconds = (now - lastTick.current) / 1000;
      lastTick.current = now;
      if (seconds > AWAY_THRESHOLD_S) grantAway(seconds);
      else dispatch({ type: "tick", seconds });
      // A sick patient turns up in My Room now and then, and is transferred if nobody comes.
      const s = stateRef.current;
      if (!s.patient && now >= s.nextPatientAt) {
        const p = SICK_PATIENTS[Math.floor(Math.random() * SICK_PATIENTS.length)];
        dispatch({ type: "patientArrives", id: p.id });
        pushToast({ kind: "info", title: "A patient needs you", body: `${p.condition}! Swipe the medkit over to My Room to help.`, image: p.image });
      } else if (s.patient && now - s.patient.arrivedAt > PATIENT_WAIT_MS) {
        dispatch({ type: "patientLeaves", next: now + nextPatientDelay() });
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [ready, grantAway, pushToast]);

  // Autosave on a timer and whenever the app leaves the foreground.
  useEffect(() => {
    if (!ready) return;
    const save = () => saveGame(stateRef.current).catch(() => {});
    const id = setInterval(save, AUTOSAVE_MS);
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") save();
    });
    return () => {
      clearInterval(id);
      sub.remove();
      save();
    };
  }, [ready]);

  // Toast newly unlocked achievements (not the ones that came from the save). For the first minute
  // after launch they queue up, then show, so nothing is missed while the app is starting.
  const [launchedAt] = useState(() => Date.now());
  const [quiet, setQuiet] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setQuiet(false), Math.max(0, ACHIEVEMENT_QUIET_MS - (Date.now() - launchedAt)));
    return () => clearTimeout(id);
  }, [launchedAt]);
  useEffect(() => {
    if (!ready || quiet) return;
    const ids = Object.keys(state.achievements);
    seenAchievements.current ??= new Set();
    for (const id of ids) {
      if (seenAchievements.current.has(id)) continue;
      seenAchievements.current.add(id);
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) pushToast({ kind: "achievement", title: a.name, body: `${a.description} +${a.coins} Care ${a.coins === 1 ? "Coin" : "Coins"}`, image: a.image });
    }
  }, [ready, quiet, state.achievements, pushToast]);

  const actions = useMemo<GameActions>(() => {
    const updateSettings = (patch: Partial<Settings>) =>
      setSettings((s) => {
        const next = { ...s, ...patch };
        saveSettings(next).catch(() => {});
        return next;
      });
    return {
      dispatch,
      updateSettings,
      setTheme: (theme) => {
        updateSettings({ theme });
        dispatch({ type: "switchedTheme" });
      },
      replaceSave: (next) => {
        seenAchievements.current = new Set(Object.keys(next.achievements));
        dispatch({ type: "import", state: next });
        lastTick.current = Date.now();
      },
      resetProgress: async () => {
        seenAchievements.current = new Set();
        dispatch({ type: "reset" });
        lastTick.current = Date.now();
        await clearGame();
      },
      pushToast,
      dismissToast,
      simulateAway: grantAway,
    };
  }, [pushToast, dismissToast, grantAway]);

  return (
    <ActionsContext value={actions}>
      <SettingsContext value={settings}>
        <ToastContext value={toasts}>
          <StoreContext value={store}>
            <StateContext value={state}>{children}</StateContext>
          </StoreContext>
        </ToastContext>
      </SettingsContext>
    </ActionsContext>
  );
}

export function useGameState() {
  const state = use(StateContext);
  if (!state) throw new Error("useGameState must be used inside GameProvider");
  return state;
}

const shallowEqual = (a: unknown, b: unknown) => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
};

/**
 * Subscribes to part of the game state: the component re-renders only when the selected value
 * changes (compared shallowly, so a selector can return a small object of fields).
 */
export function useGameSelector<T>(select: (s: GameState) => T): T {
  const store = use(StoreContext);
  if (!store) throw new Error("useGameSelector must be used inside GameProvider");
  const [value, setValue] = useState(() => select(store.get()));
  const latest = useRef(select);
  useEffect(() => {
    latest.current = select;
  });
  useEffect(() => {
    const check = () =>
      setValue((prev) => {
        const next = latest.current(store.get());
        return shallowEqual(prev, next) ? prev : next;
      });
    check();
    return store.subscribe(check);
  }, [store]);
  return value;
}

/** The current state without subscribing, for event handlers. */
export function useGameStore() {
  const store = use(StoreContext);
  if (!store) throw new Error("useGameStore must be used inside GameProvider");
  return store;
}

export function useGameActions() {
  const actions = use(ActionsContext);
  if (!actions) throw new Error("useGameActions must be used inside GameProvider");
  return actions;
}

export const useSettings = () => use(SettingsContext);
export const useToasts = () => use(ToastContext);
