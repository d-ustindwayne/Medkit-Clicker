import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useSlide } from "@/components/ui/controls";
import { MarqueeText } from "@/components/ui/marquee-text";
import { PixelIcon, type PixelIconName } from "@/components/ui/pixel-icon";
import { useAudio, useMusic } from "@/hooks/use-audio";

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function ControlButton({ icon, label, onPress, primary }: { icon: PixelIconName; label: string; onPress: () => void; primary?: boolean }) {
  const { playSfx } = useAudio();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        playSfx("click");
        onPress();
      }}
      className={`items-center justify-center border-[1.5px] border-outline active:translate-y-0.5 ${primary ? "h-14 w-14 bg-primary" : "h-11 w-11 bg-accent"}`}
    >
      <PixelIcon name={icon} size={primary ? 22 : 16} />
    </Pressable>
  );
}

/** Now-playing card: track, seekable progress bar and transport controls. */
export function MusicPlayer() {
  const m = useMusic();
  const [barWidth, setBarWidth] = useState(0);
  /** While dragging: the second the finger points at (the song jumps there on release). */
  const [dragSec, setDragSec] = useState<number | null>(null);
  const dragging = dragSec !== null;
  // The fill and thumb follow the finger on the UI thread; only the time text re-renders, once a second.
  const pos = useSharedValue(0);
  const grow = useSharedValue(0);
  const playing = m.duration > 0 ? Math.min(1, m.currentTime / m.duration) : 0;
  useEffect(() => {
    if (!dragging) pos.set(playing);
  }, [playing, dragging, pos]);
  const slide = useSlide(barWidth, (k, done) => {
    pos.set(k);
    if (!done) {
      grow.set(withTiming(1, { duration: 120 }));
      return setDragSec(Math.floor(k * m.duration));
    }
    grow.set(withTiming(0, { duration: 160 }));
    setDragSec(null);
    if (m.duration > 0) m.seek(k * m.duration);
  });
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: pos.get() }] }));
  const track = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 + grow.get() * 0.4 }] }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.get() * barWidth - 6 }, { scale: 1 + grow.get() * 0.5 }],
  }));

  return (
    <View className="gap-3 border-[1.5px] border-outline bg-backdrop p-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-pixel text-xs tracking-[2px] text-ink opacity-70">{m.paused ? "PAUSED" : m.playing ? "NOW PLAYING" : "MUTED"}</Text>
          <MarqueeText className="font-display text-base text-ink">{`${m.playlistName} · Track ${m.trackIndex + 1} of ${m.trackCount}`}</MarqueeText>
        </View>
      </View>

      {/* Tap anywhere on the bar to jump there, or press and drag the thumb (the song jumps on release). */}
      <View
        {...slide}
        accessibilityRole="adjustable"
        accessibilityLabel="Song position"
        accessibilityValue={{ min: 0, max: Math.round(m.duration), now: Math.round(m.currentTime) }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => m.seek(Math.max(0, Math.min(m.duration, m.currentTime + (e.nativeEvent.actionName === "increment" ? 10 : -10))))}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        hitSlop={{ top: 12, bottom: 12 }}
        className="h-6 justify-center"
      >
        <Animated.View pointerEvents="none" style={track}>
          <View className="h-2.5 overflow-hidden border-[1.5px] border-outline bg-surface">
            <Animated.View style={[{ height: "100%", width: "100%", transformOrigin: "left" }, fill]}>
              <View className="h-full w-full bg-primary" />
            </Animated.View>
          </View>
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0 }, thumb]}>
          <View className={`h-4 w-3 border-[1.5px] border-outline ${dragging ? "bg-primary" : "bg-ink"}`} />
        </Animated.View>
      </View>
      <View className="flex-row justify-between">
        <Text className="font-number text-sm text-ink">{clock(dragging ? dragSec : m.currentTime)}</Text>
        <Text className="font-number text-sm text-ink">{clock(m.duration)}</Text>
      </View>

      <View className="flex-row items-center justify-center gap-4">
        <ControlButton icon="prev" label="Previous track" onPress={m.previous} />
        <ControlButton icon={m.paused ? "play" : "pause"} label={m.paused ? "Play" : "Pause"} onPress={m.togglePause} primary />
        <ControlButton icon="next" label="Next track" onPress={m.next} />
      </View>
    </View>
  );
}
