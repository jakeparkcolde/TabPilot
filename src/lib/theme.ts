import type { Settings } from "./types";

export function applyTheme(theme: Settings["theme"]): void {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : theme;
  document.documentElement.dataset.theme = resolved;
}

export function watchSystemTheme(
  getTheme: () => Settings["theme"] | null,
): () => void {
  const media = window.matchMedia("(prefers-color-scheme: light)");
  const listener = () => {
    const theme = getTheme();
    if (theme) applyTheme(theme);
  };
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
