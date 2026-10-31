import { useEffect, useRef } from "react";
import { View } from "react-native";

/** How often the clip's end is checked (the browser's own time events come only ~4 times a second). */
const CHECK_MS = 50;

/**
 * A short video clip playing over and over, silent (web): a plain video element, from `start` for
 * `length` seconds (the whole video if `length` is 0 or covers it all). It loops like a GIF and
 * starts again if the browser pauses it (a hidden tab, power saving).
 */
export function ClipVideo({ uri, start, length, duration, style }: { uri: string; start: number; length: number; duration: number; style: object }) {
  const ref = useRef<HTMLVideoElement>(null);
  const whole = start < 0.05 && (length === 0 || (duration > 0 && length >= duration - 0.05));

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Set here as well: React doesn't always pass `muted` on, and browsers only autoplay muted video.
    v.muted = true;
    const play = () => v.play().catch(() => {});
    const restart = () => {
      v.currentTime = start;
      play();
    };
    restart();
    const id = setInterval(() => {
      if (document.hidden) return;
      if (!whole && (v.currentTime >= start + length || v.currentTime < start - 0.3)) restart();
      else if (v.paused || v.ended) (v.ended ? restart : play)();
    }, CHECK_MS);
    const onVisible = () => !document.hidden && play();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [uri, start, length, whole]);

  return (
    <View pointerEvents="none" style={style}>
      <video ref={ref} src={uri} muted playsInline autoPlay loop={whole} disablePictureInPicture style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
    </View>
  );
}
