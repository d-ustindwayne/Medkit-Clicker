import { FlexWidget, ImageWidget, TextWidget } from "react-native-android-widget";

import { healingRate } from "@/constants/rebirth";
import { formatShort } from "@/lib/format";
import { maxAwaySeconds, type GameState } from "@/lib/game";

/** The widget's name in app.json (the react-native-android-widget plugin). */
export const WIDGET_NAME = "Progress";

const MEDKIT = require("@/imgs/medkit.png");

/** What the widget shows, worked out from a save. */
export type WidgetData = { medkits: number; perSecond: number; rebirths: number; gems: number };

/**
 * The save's numbers, plus what the team has made since it was saved (the same offline earnings the
 * game pays on return: no boosts, capped at the offline limit), so the widget keeps counting up.
 */
export function widgetData(state: GameState, savedAt: number, now = Date.now()): WidgetData {
  const perSecond = healingRate({ owned: state.owned, rebirths: state.rebirths, room: state.room });
  const away = Math.min(Math.max(0, (now - savedAt) / 1000), maxAwaySeconds(state));
  return { medkits: state.healed + perSecond * away, perSecond, rebirths: state.rebirths, gems: state.rebirthPoints + state.bonusGems - state.gemsSpent };
}

const COLORS = {
  light: { bg: "#f9e8e8", card: "#ffffff", ink: "#1d2e33", soft: "#5f6b7b", border: "#1d2e33" },
  dark: { bg: "#0f1c24", card: "#1d2e33", ink: "#f4f1ea", soft: "#a9b4c2", border: "#f4f1ea" },
} as const;

/** The home-screen widget: medkits, per second, gems and rebirths. Tapping it opens the game. */
export function ProgressWidget({ data, theme = "light" }: { data: WidgetData | null; theme?: "light" | "dark" }) {
  const c = COLORS[theme];
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: "match_parent", width: "match_parent", backgroundColor: c.bg, borderRadius: 16, borderWidth: 2, borderColor: c.border, padding: 12, flexDirection: "column", justifyContent: "center" }}
    >
      <FlexWidget style={{ flexDirection: "row", alignItems: "center", width: "match_parent" }}>
        <ImageWidget image={MEDKIT} imageWidth={40} imageHeight={40} />
        <FlexWidget style={{ flexDirection: "column", marginLeft: 10 }}>
          <TextWidget text={data ? formatShort(data.medkits) : "Medkit Clicker"} style={{ fontSize: 24, fontWeight: "bold", color: c.ink }} maxLines={1} />
          <TextWidget text={data ? "medkits" : "Open the game to start"} style={{ fontSize: 12, color: c.soft }} maxLines={1} />
        </FlexWidget>
      </FlexWidget>
      {data && (
        <FlexWidget style={{ flexDirection: "row", width: "match_parent", marginTop: 8, justifyContent: "space-between" }}>
          <TextWidget text={`+${formatShort(data.perSecond)}/s`} style={{ fontSize: 14, color: c.ink }} />
          <TextWidget text={`${data.gems} gems · ${data.rebirths} rebirths`} style={{ fontSize: 12, color: c.soft }} />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
