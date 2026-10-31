import { useEffect } from "react";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView, type VideoPlayer } from "expo-video";
import { AppState, View } from "react-native";

/** How often a stopped clip is checked and started again (the phone can pause it, e.g. for audio focus). */
const WATCHDOG_MS = 1000;

/**
 * Jumps the player to `t` seconds and plays. (The player is a native object, changed by its methods.)
 * A player already released (the view just closed) throws, which is ignored.
 */
function playFrom(p: VideoPlayer, t: number) {
  try {
    p.currentTime = t;
    p.play();
  } catch {}
}

/** Turns the player's own looping on or off. */
function setLoop(p: VideoPlayer, on: boolean) {
  try {
    p.loop = on;
  } catch {}
}

/**
 * A short video clip playing over and over, silent: from `start` for `length` seconds (the whole
 * video if `length` is 0 or covers it all). The web version is clip-video.web.tsx.
 */
export function ClipVideo({ uri, start, length, duration, style }: { uri: string; start: number; length: number; duration: number; style: object }) {
  // A clip that is the whole video loops by itself, without seeking.
  const whole = start < 0.05 && (length === 0 || (duration > 0 && length >= duration - 0.05));
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    // Silent, so it never takes the music's audio focus (which paused it).
    p.audioMixingMode = "mixWithOthers";
    p.timeUpdateEventInterval = 0.05;
  });
  // Moving the clip (in the editor) jumps to its new start.
  useEffect(() => {
    setLoop(player, whole);
    playFrom(player, start);
  }, [player, start, length, whole]);
  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    if (!whole && (currentTime >= start + length || currentTime < start - 0.3)) playFrom(player, start);
  });
  useEventListener(player, "playToEnd", () => playFrom(player, start));
  // Started again if it stopped (another app's audio, coming back from the background).
  useEffect(() => {
    const resume = () => {
      try {
        if (AppState.currentState === "active" && !player.playing) player.play();
      } catch {}
    };
    const id = setInterval(resume, WATCHDOG_MS);
    const sub = AppState.addEventListener("change", resume);
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [player]);
  // Placed by a plain view. (CustomMedia remakes this for each video: a new player on the same view
  // could stay blank on Android.) A texture view is clipped and layered like other views; a surface
  // view sits behind the window, so it could stay hidden under the app or show through the editor.
  return (
    <View pointerEvents="none" style={style}>
      <VideoView player={player} nativeControls={false} contentFit="fill" surfaceType="textureView" style={{ width: "100%", height: "100%" }} />
    </View>
  );
}
