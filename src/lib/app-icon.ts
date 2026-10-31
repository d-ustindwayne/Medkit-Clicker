import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from "expo-alternate-app-icons";
import { requireOptionalNativeModule } from "expo";

/** Whether this phone can change the home-screen icon. */
export const supportsIcons = supportsAlternateIcons;

/** The alternate app icon in use (a name from app.json), or null for the original. */
export const appIcon = (): string | null => {
  try {
    return supportsAlternateIcons ? getAppIconName() : null;
  } catch {
    return null;
  }
};

/** Switches the home-screen icon now. On Android this can close the app, so prefer applyOnExit. */
export async function setAppIcon(name: string | null) {
  if (!supportsAlternateIcons) throw new Error("Alternate icons aren't supported here.");
  return setAlternateAppIcon(name as Parameters<typeof setAlternateAppIcon>[0]);
}

/** The icon module's own patched function (patches/expo-alternate-app-icons@8.0.0.patch), Android only. */
const iconModule = requireOptionalNativeModule<{ relaunch?: () => boolean }>("ExpoAlternateAppIcons");

/**
 * Opens the game again with the icon just set, in place of the running screen. False where it can't
 * (iOS, the web, an older build): then close the app instead.
 */
export const relaunchApp = (): boolean => {
  try {
    return iconModule?.relaunch?.() ?? false;
  } catch {
    return false;
  }
};

/** "default" means the original icon. */
export const iconFromPending = (pending: string) => (pending === "default" ? null : pending);
