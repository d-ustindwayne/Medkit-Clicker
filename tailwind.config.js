/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--color-primary) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        backdrop: "rgb(var(--color-backdrop) / <alpha-value>)",
        outline: "rgb(var(--color-outline) / <alpha-value>)",
        shadow: "rgb(var(--color-shadow) / <alpha-value>)",
      },
      fontFamily: {
        pixel: ["Silkscreen"],
        number: ["Mallanna"],
        display: ["Inter-Bold"],
        rounded: ["Nunito-Bold"],
        body: ["Nunito-Regular"],
      },
    },
  },
  plugins: [],
};
