import type { ConfigContext, ExpoConfig } from "expo/config";

// Everything is in app.json. This only adds the web version's base path, which the website deploy
// sets (EXPO_BASE_URL=/Medkit-Clicker/play) so the game can be served from the site's play/ folder.
// Native builds don't set it and are unaffected.
export default ({ config }: ConfigContext): ExpoConfig =>
  ({
    ...config,
    experiments: { ...config.experiments, ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}) },
  }) as ExpoConfig;
