import type { ReactNode } from "react";
import { Image } from "expo-image";
import { View } from "react-native";

import type { Scene } from "@/constants/scenes";

/**
 * A full-width scene page: the art spans the page width and its edge colours fill the rest.
 * `children` render on top of the art, in a box the same size as the art.
 */
export function ScenePage({ scene, width, children }: { scene: Scene; width: number; children?: ReactNode }) {
  const height = width / scene.aspect;
  return (
    <View className="flex-1" accessibilityLabel={scene.title} style={{ backgroundColor: scene.fillTop }}>
      <View style={{ flex: scene.anchor }} />
      <View style={{ width, height }}>
        <Image source={scene.image} style={{ width, height }} contentFit="cover" />
        {children && <View className="absolute inset-0">{children}</View>}
      </View>
      <View style={{ flex: 1 - scene.anchor, backgroundColor: scene.fillBottom }} />
    </View>
  );
}
