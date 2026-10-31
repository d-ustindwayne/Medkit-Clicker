import { useRef, useState } from "react";
import { Modal, Platform, Text, View, useWindowDimensions, type GestureResponderEvent } from "react-native";

import { CustomMedia } from "@/components/custom-media";
import { useSlide } from "@/components/ui/controls";
import { backdropSize } from "@/constants/app";
import { HardShadow } from "@/components/ui/hard-shadow";
import { PixelButton } from "@/components/ui/pixel-button";
import { themeVars } from "@/constants/theme";
import { useSettings } from "@/hooks/use-game";
import { usePalette } from "@/hooks/use-palette";
import { MAX_CLIP_S, MAX_VEIL, MAX_ZOOM, mediaFrame, type CustomBg } from "@/lib/custom-bg-store";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const seconds = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

/** A bar to press and drag along, filled up to the value. */
function Slider({ label, value, min, max, shown, onChange }: { label: string; value: number; min: number; max: number; shown: string; onChange: (v: number) => void }) {
  const [w, setW] = useState(0);
  const slide = useSlide(w, (k) => onChange(min + k * (max - min)));
  return (
    <View className="gap-1">
      <View className="flex-row justify-between">
        <Text className="font-rounded text-sm text-ink">{label}</Text>
        <Text className="font-number text-sm text-ink">{shown}</Text>
      </View>
      <View
        {...slide}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: shown }}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        className="h-8 border-[1.5px] border-outline bg-backdrop p-[3px]"
      >
        <View pointerEvents="none" className="h-full bg-primary" style={{ width: `${((value - min) / (max - min)) * 100}%` }} />
      </View>
    </View>
  );
}

/**
 * Frames the custom background before it's set: drag the picture to move it, zoom in, pick which
 * 3 seconds of a video play, and lay a veil over it so the game's text stands out. The preview is
 * the shape of the screen, with a sample of the counter on top.
 */
export function CustomBgEditor({ initial, saveLabel, onCancel, onSave }: { initial: CustomBg; saveLabel: string; onCancel: () => void; onSave: (bg: CustomBg) => void }) {
  const { theme } = useSettings();
  const palette = usePalette();
  const [bg, setBg] = useState(initial);
  const win = useWindowDimensions();
  // The preview has the shape of the box the background is drawn in, as big as fits beside the controls.
  const box = backdropSize(win.width, win.height);
  const aspect = box.width / box.height;
  let fw = Math.min(250, win.width - 96);
  let fh = fw / aspect;
  if (fh > win.height * 0.4) {
    fh = win.height * 0.4;
    fw = fh * aspect;
  }
  const frame = mediaFrame(bg, fw, fh);
  const slackX = (frame.width - fw) / 2, slackY = (frame.height - fh) / 2;
  // Dragging the picture moves it with the finger; pinching with two fingers zooms (the slider too).
  // `spread` is the distance between two fingers when the pinch began (0 while it's one finger).
  const drag = useRef<{ px: number; py: number; x: number; y: number; spread: number; zoom: number } | null>(null);
  const spreadOf = (e: GestureResponderEvent) => {
    const t = e.nativeEvent.touches;
    return t.length < 2 ? 0 : Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
  };
  const begin = (e: GestureResponderEvent) => {
    drag.current = { px: e.nativeEvent.pageX, py: e.nativeEvent.pageY, x: bg.x, y: bg.y, spread: spreadOf(e), zoom: bg.zoom };
  };
  const move = (e: GestureResponderEvent) => {
    const d = drag.current;
    if (!d) return;
    // Read now: the touch event is emptied once this handler returns, and the update below can run
    // later (reading it there crashed with "pageX of null").
    const { pageX, pageY } = e.nativeEvent;
    const spread = spreadOf(e);
    // A finger was added or lifted: start again from here, so the picture doesn't jump.
    if (spread > 0 !== d.spread > 0) return begin(e);
    if (spread > 0) {
      const zoom = clamp((d.zoom * spread) / Math.max(1, d.spread), 1, MAX_ZOOM);
      return setBg((b) => ({ ...b, zoom }));
    }
    setBg((b) => ({
      ...b,
      x: slackX > 0.5 ? clamp(d.x + (pageX - d.px) / slackX, -1, 1) : 0,
      y: slackY > 0.5 ? clamp(d.y + (pageY - d.py) / slackY, -1, 1) : 0,
    }));
  };
  const [clipW, setClipW] = useState(0);
  const duration = bg.duration;
  const clipSlide = useSlide(clipW, (k) => setBg((b) => ({ ...b, start: clamp(k * duration - b.length / 2, 0, Math.max(0, duration - b.length)) })));
  const shadow = { textShadowColor: palette.textShadow, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0.1 };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onCancel}>
      <View style={themeVars[theme]} className="flex-1 items-center justify-center p-4">
        <View className="absolute inset-0 bg-black/60" />
        <HardShadow offset={6} className="w-full max-w-sm">
          <View accessibilityViewIsModal className="gap-3 border-2 border-outline bg-surface p-4">
            <Text accessibilityRole="header" className="font-display text-lg text-ink">
              Frame your background
            </Text>
            <View className="items-center">
              <View
                accessibilityLabel="Preview, the shape of your background. Drag to move the picture."
                style={{ width: fw, height: fh }}
                className="overflow-hidden border-2 border-outline"
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderTerminationRequest={() => false}
                onResponderGrant={begin}
                onResponderMove={move}
                onResponderRelease={() => (drag.current = null)}
              >
                <CustomMedia bg={bg} width={fw} height={fh} theme={theme} />
                {/* A sample of the counter, to judge the contrast. */}
                <View pointerEvents="none" className="absolute left-0 right-0 top-3 items-center">
                  <Text className="font-display text-xl text-ink" style={shadow}>
                    1,234 Medkits
                  </Text>
                  <View className="mt-1 rounded-full border-[1.5px] border-outline bg-surface px-2">
                    <Text className="font-display text-[10px] text-ink">5 per second</Text>
                  </View>
                </View>
              </View>
              <Text className="mt-1 font-body text-xs text-ink opacity-70">{Platform.OS === "web" ? "Drag the picture to move it." : "Drag to move it, pinch to zoom."}</Text>
            </View>
            <Slider label="Zoom" value={bg.zoom} min={1} max={MAX_ZOOM} shown={`${bg.zoom.toFixed(1)}x`} onChange={(zoom) => setBg((b) => ({ ...b, zoom }))} />
            {bg.kind === "video" && duration > bg.length + 0.05 && (
              <View className="gap-1">
                <View className="flex-row justify-between">
                  <Text className="font-rounded text-sm text-ink">Clip ({MAX_CLIP_S} s at most)</Text>
                  <Text className="font-number text-sm text-ink">
                    {seconds(bg.start)} - {seconds(bg.start + bg.length)}
                  </Text>
                </View>
                {/* The whole video, with the part that plays picked out: drag it along. */}
                <View
                  {...clipSlide}
                  accessibilityRole="adjustable"
                  accessibilityLabel="Which part of the video plays"
                  onLayout={(e) => setClipW(e.nativeEvent.layout.width)}
                  className="h-9 border-[1.5px] border-outline bg-backdrop"
                >
                  <View pointerEvents="none" className="absolute bottom-0 top-0 border-2 border-outline bg-primary/70" style={{ left: `${(bg.start / duration) * 100}%`, width: `${(bg.length / duration) * 100}%` }} />
                </View>
              </View>
            )}
            <Slider label="Text contrast" value={bg.veil} min={0} max={MAX_VEIL} shown={`${Math.round((bg.veil / MAX_VEIL) * 100)}%`} onChange={(veil) => setBg((b) => ({ ...b, veil }))} />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <PixelButton label="Cancel" onPress={onCancel} />
              </View>
              <View className="flex-1">
                <PixelButton label={saveLabel} tone="success" onPress={() => onSave(bg)} />
              </View>
            </View>
          </View>
        </HardShadow>
      </View>
    </Modal>
  );
}
