import { Image } from "expo-image";
import { Text, View } from "react-native";

import { HardShadow } from "@/components/ui/hard-shadow";
import { HOSPITAL_IMAGE } from "@/constants/items";
import type { SCENES } from "@/constants/scenes";

/** A full-art page in the swipe pager. Shows a framed placeholder until the art exists. */
export function ScenePage({ scene, size }: { scene: (typeof SCENES)[number]; size: number }) {
  return (
    <View className="items-center gap-3">
      <HardShadow offset={6}>
        <View style={{ width: size, height: size }} className="items-center justify-center overflow-hidden border-[3px] border-outline bg-surface">
          {scene.image ? (
            <Image source={scene.image} style={{ width: size, height: size }} contentFit="cover" />
          ) : (
            <View className="items-center gap-3 opacity-60">
              <Image source={HOSPITAL_IMAGE} style={{ width: size * 0.35, height: size * 0.35 }} contentFit="contain" />
              <Text className="font-pixel text-base tracking-[3px] text-ink">COMING SOON</Text>
            </View>
          )}
        </View>
      </HardShadow>
      <Text className="font-pixel text-lg tracking-[4px] text-ink">{scene.title.toUpperCase()}</Text>
    </View>
  );
}
