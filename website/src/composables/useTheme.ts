import { ref, watch } from "vue";

export type ThemeName = "light" | "dark";

// index.html sets data-theme before first paint; this keeps it in sync after that.
const theme = ref<ThemeName>(document.documentElement.dataset.theme === "dark" ? "dark" : "light");

watch(theme, (t) => {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#172631" : "#dd1122");
  try {
    localStorage.setItem("mc-theme", t);
  } catch {
    // Private windows can refuse storage; the theme still applies for this visit.
  }
});

export function useTheme() {
  return { theme, toggle: () => (theme.value = theme.value === "dark" ? "light" : "dark") };
}
