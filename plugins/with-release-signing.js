// Expo config plugin: signs `bun run apk:release` builds with the private release key.
// The keystore and its passwords live outside the repo, in the user-level Gradle properties
// (~/.gradle/gradle.properties: MC_RELEASE_STORE_FILE, MC_RELEASE_STORE_PASSWORD,
// MC_RELEASE_KEY_ALIAS, MC_RELEASE_KEY_PASSWORD). Other release builds (apk:phone, for testing)
// keep the debug key, so they install over a test phone's game without wiping its save.
const { withAppBuildGradle } = require("expo/config-plugins");

const RELEASE_CONFIG = `
        release {
            if (findProperty("MC_RELEASE_STORE_FILE")) {
                storeFile file(findProperty("MC_RELEASE_STORE_FILE"))
                storePassword findProperty("MC_RELEASE_STORE_PASSWORD")
                keyAlias findProperty("MC_RELEASE_KEY_ALIAS")
                keyPassword findProperty("MC_RELEASE_KEY_PASSWORD")
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (c) => {
    let gradle = c.modResults.contents;
    if (gradle.includes("MC_RELEASE_STORE_FILE")) return c;
    // Add the release signing config next to the debug one.
    gradle = gradle.replace(/signingConfigs\s*\{/, (m) => `${m}${RELEASE_CONFIG}`);
    // The release build type uses it only when asked (-PmcRelease=true) and the key is set up.
    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      // The whole choice in parentheses: Groovy would otherwise call signingConfig(true/false).
      `$1signingConfig((findProperty("mcRelease") && findProperty("MC_RELEASE_STORE_FILE")) ? signingConfigs.release : signingConfigs.debug)`,
    );
    c.modResults.contents = gradle;
    return c;
  });
};
