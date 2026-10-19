import { createContext, use, useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { AppState, type ImageSourcePropType } from "react-native";

import { ACHIEVEMENTS } from "@/constants/achievements";
import { healingRate } from "@/constants/rebirth";
import type { ThemeName } from "@/constants/theme";
import { formatCount, formatDuration } from "@/lib/format";
import { gameReducer, newGame, type GameAction, type GameState } from "@/lib/game";
import { DEFAULT_SETTINGS, clearGame, loadGame, loadSettings, saveGame, saveSettings, type Settings } from "@/lib/storage";

const TICK_MS = 100;
const AUTOSAVE_MS = 10_000;
/** Gaps longer than this (app closed, backgrounded, tab hidden) count as time away. */
const AWAY_THRESHOLD_S = 5;
const MAX_AWAY_S = 8 * 3600;

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
    // Two at most, at the bottom of the screen, so the counter and medkit stay visible.
    setToasts((t) => [...t.slice(-1), { ...toast, id }]);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const grantAway = useCallback(
    (seconds: number) => {
      const away = Math.min(seconds, MAX_AWAY_S);
      const earned = healingRate(stateRef.current) * away;
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
    Promise.all([loadGame(), loadSettings()]).then(([saved, loadedSettings]) => {
      if (cancelled) return;
      setSettings(loadedSettings);
      if (saved) {
        dispatch({ type: "load", state: saved.state });
        stateRef.current = saved.state;
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

  useEffect(() => {
    stateRef.current = state;
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
    }, TICK_MS);
    return () => clearInterval(id);
  }, [ready, grantAway]);

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

  // Toast newly unlocked achievements (not the ones that came from the save).
  useEffect(() => {
    if (!ready) return;
    const ids = Object.keys(state.achievements);
    if (!seenAchievements.current) {
      seenAchievements.current = new Set(ids);
      return;
    }
    for (const id of ids) {
      if (seenAchievements.current.has(id)) continue;
      seenAchievements.current.add(id);
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (a) pushToast({ kind: "achievement", title: a.name, body: a.description, image: a.image });
    }
  }, [ready, state.achievements, pushToast]);

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
          <StateContext value={state}>{children}</StateContext>
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

export function useGameActions() {
  const actions = use(ActionsContext);
  if (!actions) throw new Error("useGameActions must be used inside GameProvider");
  return actions;
}

export const useSettings = () => use(SettingsContext);
export const useToasts = () => use(ToastContext);
