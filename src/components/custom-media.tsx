import { useEffect } from "react";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import { StyleSheet, View } from "react-native";

import { Image } from "@/components/ui/image";
import type { ThemeName } from "@/constants/theme";
import { mediaFrame, type CustomBg } from "@/lib/custom-bg-store";

/** The veil's colour: the light theme lightens the media, the dark theme darkens it. */
const VEIL: Record<ThemeName, string> = { light: "#ffffff", dark: "#000000" };

/** Jumps the player to `t` seconds and plays. (The player is a native object, changed by its methods.) */
function playFrom(p: VideoPlayer, t: number) {
  p.currentTime = t;
  p.play();
}

/**
 * A short video clip playing over and over, silent: from `start` for `length` seconds (the whole
 * video if `length` is 0).
 */
function ClipVideo({ uri, start, length, style }: { uri: string; start: number; length: number; style: object }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.loop = false;
    p.timeUpdateEventInterval = 0.05;
    p.currentTime = start;
    p.play();
  });
  // Moving the clip (in the editor) jumps to its new start.
  useEffect(() => {
    playFrom(player, start);
  }, [player, start, length]);
  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    if (length > 0 && (currentTime >= start + length || currentTime < start - 0.3)) playFrom(player, start);
  });
  useEventListener(player, "playToEnd", () => playFrom(player, start));
  // Placed by a plain view: the video view itself doesn't take every position style on the web.
  return (
    <View pointerEvents="none" style={style}>
      <VideoView player={player} nativeControls={false} contentFit="fill" style={{ width: "100%", height: "100%" }} />
    </View>
  );
}

/**
 * The custom background in a box `width` x `height`: the photo, GIF (it animates) or video clip,
 * framed as the player chose, with the veil over it so the game's text stands out.
 */
export function CustomMedia({ bg, width, height, theme }: { bg: CustomBg; width: number; height: number; theme: ThemeName }) {
  const f = mediaFrame(bg, width, height);
  const style = { position: "absolute" as const, left: f.left, top: f.top, width: f.width, height: f.height };
  return (
    <View pointerEvents="none" style={{ width, height, overflow: "hidden" }}>
      {bg.kind === "video" ? (
        <ClipVideo uri={bg.uri} start={bg.start} length={bg.length} style={style} />
      ) : (
        <Image source={{ uri: bg.uri }} style={style} contentFit={bg.aspect ? "fill" : "cover"} />
      )}
      {bg.veil > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: VEIL[theme], opacity: bg.veil }]} />}
    </View>
  );
}
