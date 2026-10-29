import { requestWidgetUpdate } from "react-native-android-widget";

import type { GameState } from "@/lib/game";
import { ProgressWidget, WIDGET_NAME, widgetData } from "@/widget/progress-widget";

/** Redraws any widget on the home screen with the latest numbers (when the game is left). */
export function updateWidget(state: GameState, theme: "light" | "dark") {
  requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => <ProgressWidget data={widgetData(state, Date.now())} theme={theme} /> }).catch(() => {});
}
