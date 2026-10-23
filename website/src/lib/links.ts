/** The promo code the home page offers at the bottom (set up in the game's database with add-promo). */
export const PROMO = {
  code: "welcomeMC",
  text: "Free 1,000 medkits and 5 Care Coins in the game! In the menu open About, tap the medkit icon 5 times, then enter the code.",
};

// Outside links. Empty strings hide the matching button; fill them in when they exist.
export const LINKS = {
  /** Where the Android APK is downloaded from. */
  download: "https://github.com/d-ustindwayne/Medkit-Clicker/releases/latest",
  /** The web version of the game, exported into the site's play/ folder by the deploy workflow. */
  play: `${import.meta.env.BASE_URL}play/`,
  github: "https://github.com/d-ustindwayne",
  /** Bug reports and questions. */
  support: "https://github.com/d-ustindwayne/Medkit-Clicker/issues",
  /** A public contact address, if you want one shown. */
  email: "",
};
