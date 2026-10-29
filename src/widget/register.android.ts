// Android: hands the home-screen widget's background work to its handler.
import { registerWidgetTaskHandler } from "react-native-android-widget";

import { widgetTaskHandler } from "@/widget/task-handler";

registerWidgetTaskHandler(widgetTaskHandler);
