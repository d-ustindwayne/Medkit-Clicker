import type { WidgetTaskHandlerProps } from "react-native-android-widget";

import { loadGame, loadSettings } from "@/lib/storage";
import { ProgressWidget, widgetData } from "@/widget/progress-widget";

/** Runs in the background when Android asks for the widget (added, every 30 minutes, resized). */
export async function widgetTaskHandler({ widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === "WIDGET_DELETED" || widgetAction === "WIDGET_CLICK") return;
  const [saved, settings] = await Promise.all([loadGame(), loadSettings()]);
  renderWidget(<ProgressWidget data={saved ? widgetData(saved.state, saved.savedAt) : null} theme={settings?.theme ?? "light"} />);
}
