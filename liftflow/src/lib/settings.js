const KEY = "liftflow_settings";

const DEFAULT_SETTINGS = {
  coachMode: "manual", // "manual" | "auto"
  autoProgression: false,
  autoDeload: false,
};

export function getSettings() {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  const data = localStorage.getItem(KEY);
  return data ? JSON.parse(data) : DEFAULT_SETTINGS;
}

export function saveSettings(settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function updateSetting(key, value) {
  const settings = getSettings();

  const updated = {
    ...settings,
    [key]: value,
  };

  saveSettings(updated);
  return updated;
}