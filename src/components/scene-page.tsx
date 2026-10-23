import type { ReactNode, RefObject } from "react";
import { Image } from "@/components/ui/image";
import { View, type ImageSourcePropType } from "react-native";

import type { Scene } from "@/constants/scenes";

/**
 * A full-width scene page: the art spans the page width and its edge colours fill the rest.
 * `children` render on top of the art, in a box the same size as the art; `above` fills the space
 * above the art (drawn from its bottom edge up, clipped at the top).
 */
/** `sides`: art carrying the scene on to the left and right (a quarter of its width each). */
export function ScenePage({ scene, width, children, above, contentRef, sides }: { scene: Scene; width: number; children?: ReactNode; above?: ReactNode; contentRef?: RefObject<View | null>; sides?: { left: ImageSourcePropType; right: ImageSourcePropType } }) {
  const height = width / scene.aspect;
  const sideW = width / 4;
  return (
    // Centred, so a scene drawn narrower than the page (My Room while decorating) sits in the middle.
    <View className="flex-1 items-center" accessibilityLabel={scene.title} style={{ backgroundColor: scene.fillTop }}>
      <View style={{ flex: scene.anchor, overflow: "hidden", alignSelf: "stretch" }}>{above}</View>
      <View className="flex-row">
        {sides && <Image source={sides.left} style={{ width: sideW, height }} contentFit="cover" />}
        <View ref={contentRef} style={{ width, height }}>
          <Image source={scene.image} style={{ width, height }} contentFit="cover" />
          {children && <View className="absolute inset-0">{children}</View>}
        </View>
        {sides && <Image source={sides.right} style={{ width: sideW, height }} contentFit="cover" />}
      </View>
      <View style={{ flex: 1 - scene.anchor, alignSelf: "stretch", backgroundColor: scene.fillBottom }} />
    </View>
  );
}
