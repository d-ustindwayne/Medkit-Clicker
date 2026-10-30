import { Platform } from "react-native";
import { Image as ExpoImage, type ImageProps } from "expo-image";

/**
 * expo-image with a memory-only cache. The game's images are bundled, so a disk cache gains
 * nothing, and on Android it can show the wrong picture after an update (cached images are keyed
 * by resource numbers, which change between builds). Use this instead of importing expo-image.
 * On the web the label isn't passed on: browsers show it as text while the picture loads (the
 * hospital's name flashed up each time it grew).
 */
export function Image(props: ImageProps) {
  const label = Platform.OS === "web" ? undefined : props.accessibilityLabel;
  return <ExpoImage cachePolicy="memory" {...props} accessibilityLabel={label} />;
}

/** Clears what older builds left in the disk cache. Call once at start-up. */
export const clearOldImageCache = () => {
  ExpoImage.clearDiskCache().catch(() => {});
};
