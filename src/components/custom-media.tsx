import { StyleSheet, View } from "react-native";

import { ClipVideo } from "@/components/clip-video";
import { Image } from "@/components/ui/image";
import { imageBacking } from "@/constants/backgrounds";
import type { ThemeName } from "@/constants/theme";
import { mediaFrame, type CustomBg } from "@/lib/custom-bg-store";

/** The veil's colour: the light theme lightens the media, the dark theme darkens it. */
const VEIL: Record<ThemeName, string> = { light: "#ffffff", dark: "#000000" };

/**
 * The custom background in a box `width` x `height`: the photo, GIF (it animates) or video clip,
 * framed as the player chose, with the veil over it so the game's text stands out.
 */
export function CustomMedia({ bg, width, height, theme }: { bg: CustomBg; width: number; height: number; theme: ThemeName }) {
  const f = mediaFrame(bg, width, height);
  const style = { position: "absolute" as const, left: f.left, top: f.top, width: f.width, height: f.height };
  return (
    <View pointerEvents="none" style={{ width, height, overflow: "hidden", backgroundColor: imageBacking(theme) }}>
      {bg.kind === "video" ? (
        <ClipVideo key={bg.uri} uri={bg.uri} start={bg.start} length={bg.length} duration={bg.duration} style={style} />
      ) : (
        <Image source={{ uri: bg.uri }} style={style} contentFit={bg.aspect ? "fill" : "cover"} />
      )}
      {bg.veil > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: VEIL[theme], opacity: bg.veil }]} />}
    </View>
  );
}
