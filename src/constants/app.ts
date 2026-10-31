export const APP_INFO = {
  name: "Medkit Clicker",
  author: "Dustin Dwayne Diaz",
  year: 2026,
  // The game's website (Vue, Bulma/SCSS, three.js on GitHub Pages with a custom domain; see docs/WEBSITE.md). Built from website/.
  website: "https://medkit-clicker.dustindwayn.ee",
  // The latest Android release (the website's Download button uses the same link).
  androidApk: "https://github.com/d-ustindwayne/Medkit-Clicker/releases/latest/download/medkit-clicker.apk",
  // iPhone installs and updates go through AltStore/SideStore; this page explains them.
  iphone: "https://medkit-clicker.dustindwayn.ee/iphone",
  // The newest release, which the update check compares with this build's version.
  latestRelease: "https://api.github.com/repos/d-ustindwayne/Medkit-Clicker/releases/latest",
  license: "Apache License 2.0",
};

/** Above this width the shop sits beside the medkit (PC & tablet view). */
export const WIDE_BREAKPOINT = 768;
export const SIDEBAR_WIDTH = 380;

/**
 * The box the background is drawn in, for a window `width` x `height`: the medkit area, at the
 * tallest it gets (beside the shop on wide screens, the top 56% on phones). The background editor's
 * preview has this shape, so it frames the picture the way the game will show it.
 */
export const backdropSize = (width: number, height: number) => {
  const wide = width >= WIDE_BREAKPOINT;
  return { width: wide ? width - SIDEBAR_WIDTH : width, height: wide ? height : height * 0.56 };
};

export const CREDIT = `Made by ${APP_INFO.author}.`;
