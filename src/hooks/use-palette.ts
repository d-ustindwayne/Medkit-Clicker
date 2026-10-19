import { palettes } from "@/constants/theme";
import { useSettings } from "@/hooks/use-game";

/** Raw hex colours for the current theme, for places classNames can't reach (SVG, text shadows). */
export const usePalette = () => palettes[useSettings().theme];
