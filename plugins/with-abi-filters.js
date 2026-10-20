// Expo config plugin: only package native libraries for the CPU types being built.
// `-PreactNativeArchitectures=arm64-v8a` limits what gets compiled, but without abiFilters the
// prebuilt .so files from dependencies still ship for all four CPU types. See `bun run apk:phone`.
const { withAppBuildGradle } = require("expo/config-plugins");

const LINE = `ndk { abiFilters(*(findProperty("reactNativeArchitectures") ?: "armeabi-v7a,arm64-v8a,x86,x86_64").split(",")) }`;

module.exports = function withAbiFilters(config) {
  return withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes("abiFilters")) {
      c.modResults.contents = c.modResults.contents.replace(/defaultConfig\s*\{/, (m) => `${m}\n        ${LINE}`);
    }
    return c;
  });
};
