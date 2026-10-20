// Real-life rewards bought with in-game patients, inside sections unlocked by a redeem code.
// The codes themselves never live in source: each section's code is stored as a SHA-256 hash in
// .env.local (see `bun run add-code`), read here through EXPO_PUBLIC_CODE_<ID>.

export type Reward = {
  id: string;
  name: string;
  /** Patients spent per redemption. */
  cost: number;
  /** How many times it can ever be redeemed. */
  limit: number;
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
    rewards: [{ id: "chocolate_box", name: "Box of chocolates", cost: 1_000_000, limit: 3 }],
  },
];
