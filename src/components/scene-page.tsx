import { Image } from "expo-image";
import { View } from "react-native";

import type { Scene } from "@/constants/scenes";

/** A full-width scene page: the art spans the page width and its edge colours fill the rest. */
export function ScenePage({ scene, width }: { scene: Scene; width: number }) {
  return (
    <View className="flex-1" accessibilityLabel={scene.title} style={{ backgroundColor: scene.fillTop }}>
      <View style={{ flex: scene.anchor }} />
      <Image source={scene.image} style={{ width, height: width / scene.aspect }} contentFit="cover" />
      <View style={{ flex: 1 - scene.anchor, backgroundColor: scene.fillBottom }} />
    </View>
  );
}
