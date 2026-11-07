"use client";

import { Icon } from "./icon";
import { useReadingPreferences } from "./reading-preferences-provider";

export function ThemeToggle() {
  const { preferences, ready, updatePreferences } = useReadingPreferences();
  return <div className="theme-switch" role="group" aria-label="Appearance">
    <button type="button" aria-label="Light" title="Light" aria-pressed={preferences.appearance === "light"} disabled={!ready} onClick={() => updatePreferences({ appearance: "light" })}><Icon name="sun" size={18} /></button>
    <button type="button" aria-label="Dark" title="Dark" aria-pressed={preferences.appearance === "dark"} disabled={!ready} onClick={() => updatePreferences({ appearance: "dark" })}><Icon name="moon" size={18} /></button>
  </div>;
}
