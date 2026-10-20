import type { ImageSourcePropType } from "react-native";

// Real-life rewards bought with in-game patients, inside a hidden section unlocked by a redeem code.
// The codes themselves never live in source: each section's code is stored as a SHA-256 hash in
// .env.local (see `bun run add-code`), read here through EXPO_PUBLIC_CODE_<ID>.

export type Reward = {
  id: string;
  name: string;
  /** One line under the name. */
  description: string;
  /** Patients spent per redemption. */
  cost: number;
  /** How many times it can ever be redeemed; null = no limit. */
  limit: number | null;
  /** Asked when redeeming; the answer goes with the alert (e.g. which movie, or when). */
  input?: { kind: "text"; label: string; placeholder: string } | { kind: "datetime"; label: string };
  image: ImageSourcePropType;
};

export type RewardSection = {
  id: string;
  /** Shown in the menu once unlocked. */
  title: string;
  /** SHA-256 hex of the normalized code, or undefined when not configured on this machine. */
  codeHash: string | undefined;
  /** Who gets told when something is redeemed (used in the share message). */
  notify: string;
  rewards: Reward[];
};

export const REWARD_SECTIONS: RewardSection[] = [
  {
    id: "jasmine",
    title: "Care Package",
    // Expo inlines EXPO_PUBLIC_* at build time, so this must be written out literally.
    codeHash: process.env.EXPO_PUBLIC_CODE_JASMINE,
    notify: "Dustin",
    // Priced high on purpose: these are real favours. Unlimited ones are for grinding.
    rewards: [
      { id: "kiss", name: "A kiss", description: "As many as you can heal for.", cost: 10_000_000, limit: null, image: require("@/imgs/rewards/kiss.png") },
      { id: "hug", name: "A long hug", description: "At least a whole minute.", cost: 15_000_000, limit: null, image: require("@/imgs/rewards/hug.png") },
      { id: "chocolate_bar", name: "Bar of chocolate", description: "Your pick of flavour.", cost: 25_000_000, limit: 5, image: require("@/imgs/rewards/chocolate_bar.png") },
      { id: "ice_cream", name: "Tub of ice cream", description: "A whole tub, all yours.", cost: 40_000_000, limit: 5, image: require("@/imgs/rewards/ice_cream.png") },
      { id: "late_call", name: "Late-night call", description: "We stay on until you fall asleep.", cost: 150_000_000, limit: null, image: require("@/imgs/rewards/late_call.png") },
      {
        id: "movie_night", name: "Movie night on Discord", description: "We watch a movie or series together.", cost: 500_000_000, limit: null, image: require("@/imgs/rewards/movie_night.png"),
        input: { kind: "text", label: "Which movie or series?", placeholder: "Title" },
      },
      {
        id: "song", name: "A song, just for you", description: "I sing the song you pick.", cost: 1_000_000_000, limit: null, image: require("@/imgs/rewards/song.png"),
        input: { kind: "text", label: "Which song?", placeholder: "Song and artist" },
      },
      { id: "love_letter", name: "Handwritten letter", description: "A real letter, on paper.", cost: 5_000_000_000, limit: 5, image: require("@/imgs/rewards/love_letter.png") },
      {
        id: "cook", name: "I cook for you", description: "Your favourite meal, made by me.", cost: 20_000_000_000, limit: null, image: require("@/imgs/rewards/cook.png"),
        input: { kind: "text", label: "Which dish?", placeholder: "Dish" },
      },
      { id: "surprise", name: "Surprise gift", description: "You won't know until it arrives.", cost: 100_000_000_000, limit: 3, image: require("@/imgs/rewards/surprise.png") },
      {
        id: "albert_park", name: "A day at Albert Park", description: "A whole day out together.", cost: 1_000_000_000_000, limit: null, image: require("@/imgs/rewards/albert_park.png"),
        input: { kind: "datetime", label: "When should we go?" },
      },
    ],
  },
];
