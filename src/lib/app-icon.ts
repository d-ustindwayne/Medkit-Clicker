import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from "expo-alternate-app-icons";

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

/** "default" means the original icon. */
export const iconFromPending = (pending: string) => (pending === "default" ? null : pending);
