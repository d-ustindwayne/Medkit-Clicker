import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from "expo-alternate-app-icons";

/** The alternate app icon in use (a name from app.json), or null for the original. */
export const appIcon = (): string | null => {
  try {
    return supportsAlternateIcons ? getAppIconName() : null;
  } catch {
    return null;
  }
};

/** Switches the home-screen icon. Android may briefly close the app while the launcher updates. */
export async function setAppIcon(name: string | null) {
  if (!supportsAlternateIcons) throw new Error("Alternate icons aren't supported here.");
  return setAlternateAppIcon(name as Parameters<typeof setAlternateAppIcon>[0]);
}
