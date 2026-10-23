/** The promo code the home page offers at the bottom (set up in the game's database with add-promo). */
export const PROMO = {
  code: "welcomeMC",
  text: "Free 1,000 medkits and 5 Care Coins in the game! In the menu open About, tap the medkit icon 5 times, then enter the code.",
};

// Outside links. Empty strings hide the matching button; fill them in when they exist.
export const LINKS = {
  /**
   * The Android APK itself, so the button downloads it straight away. Every release must attach a
   * copy named medkit-clicker.apk for this link to keep working.
   */
  download: "https://github.com/d-ustindwayne/Medkit-Clicker/releases/latest/download/medkit-clicker.apk",
  /** All releases, with notes and older versions. */
  releases: "https://github.com/d-ustindwayne/Medkit-Clicker/releases",
  /** The web version of the game, exported into the site's play/ folder by the deploy workflow. */
  play: `${import.meta.env.BASE_URL}play/`,
  github: "https://github.com/d-ustindwayne",
  /** Bug reports and questions. */
  support: "https://github.com/d-ustindwayne/Medkit-Clicker/issues",
  /** A public contact address, if you want one shown. */
  email: "",
};
