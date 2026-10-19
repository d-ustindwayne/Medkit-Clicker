import { useState } from "react";
import { Pressable, Text, View } from "react-native";

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
  const progress = m.duration > 0 ? Math.min(1, m.currentTime / m.duration) : 0;

  return (
    <View className="gap-3 border-[1.5px] border-outline bg-backdrop p-3">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="font-pixel text-xs tracking-[2px] text-ink opacity-70">{m.paused ? "PAUSED" : m.playing ? "NOW PLAYING" : "MUTED"}</Text>
          <Text className="font-display text-base text-ink">
            {m.playlistName} · Track {m.trackIndex + 1} of {m.trackCount}
          </Text>
        </View>
      </View>

      {/* Tap anywhere on the bar to jump to that point in the song. */}
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Song position"
        accessibilityValue={{ min: 0, max: Math.round(m.duration), now: Math.round(m.currentTime) }}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
        onPress={(e) => barWidth > 0 && m.duration > 0 && m.seek((e.nativeEvent.locationX / barWidth) * m.duration)}
        hitSlop={{ top: 10, bottom: 10 }}
        className="h-4 justify-center"
      >
        <View pointerEvents="none" className="h-2.5 border-[1.5px] border-outline bg-surface">
          <View className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
        </View>
        <View
          pointerEvents="none"
          className="absolute h-4 w-2.5 border-[1.5px] border-outline bg-ink"
          style={{ left: Math.max(0, progress * barWidth - 5) }}
        />
      </Pressable>
      <View className="flex-row justify-between">
        <Text className="font-number text-sm text-ink">{clock(m.currentTime)}</Text>
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
