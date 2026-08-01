const KEY = "liftflow_settings";

const DEFAULT_SETTINGS = {
  coachMode: "manual", // "manual" | "auto"
  autoProgression: false,
  autoDeload: false,
};

export function getSettings() {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;

  try {
    const data = localStorage.getItem(KEY);
    const parsed = data ? JSON.parse(data) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? { ...DEFAULT_SETTINGS, ...parsed }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const safeSettings = settings && typeof settings === "object" && !Array.isArray(settings)
    ? { ...DEFAULT_SETTINGS, ...settings }
    : DEFAULT_SETTINGS;
  localStorage.setItem(KEY, JSON.stringify(safeSettings));
  return safeSettings;
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
