import { useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { downloadBackup, importBackup, STORAGE_PREFIX } from "../lib/backup";
import { colors, radii, tint, type } from "../lib/theme";

export default function Settings() {
  const fileRef = useRef(null);
  const [status, setStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  function showStatus(message) {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2600);
  }

  function exportData() {
    if (typeof window === "undefined") return;
    downloadBackup();
    showStatus("Backup exported");
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const imported = importBackup(JSON.parse(text));
      if (!imported) {
        showStatus("No LiftFlow data found");
        return;
      }

      showStatus("Backup imported. Refresh if a page looks stale.");
    } catch {
      showStatus("Import failed. Check the backup file.");
    }
  }

  function resetData() {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
    setConfirmReset(false);
    showStatus("LiftFlow data reset");
  }

  return (
    <section style={wrap}>
      <header style={header}>
        <h1 style={type.pageTitle}>Settings</h1>
      </header>

      {status && (
        <div style={notice} role="status">
          {status}
        </div>
      )}

      <section style={card}>
        <div>
          <h2 style={type.sectionTitle}>Data backup</h2>
          <p style={copy}>
            Export your local LiftFlow data before changing phones, clearing browser storage, or testing big edits.
          </p>
        </div>
        <div style={actions}>
          <button type="button" className="primary" onClick={exportData} style={actionBtn}>
            Export data
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} style={actionBtn}>
            Import data
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={importData} style={hiddenInput} />
        </div>
      </section>

      <section style={card}>
        <div>
          <h2 style={type.sectionTitle}>Reset</h2>
          <p style={copy}>
            Clear only LiftFlow data stored on this device. This does not touch anything outside the app.
          </p>
        </div>
        <div>
          <button type="button" className="danger" onClick={() => setConfirmReset(true)}>
            Reset app data
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Reset LiftFlow?"
        message="This removes your local workouts, plan, PRs, notes, and settings from this device."
        confirmLabel="Reset"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={resetData}
      />
    </section>
  );
}

const wrap = {
  display: "grid",
  gap: 16,
};

const header = {
  padding: "8px 0 4px",
};

const notice = {
  border: `1px solid ${tint(colors.brand, 0.3)}`,
  borderRadius: radii.lg,
  background: tint(colors.brand, 0.08),
  color: colors.brand,
  padding: "10px 14px",
  fontSize: 14,
  fontWeight: 500,
};

const card = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  padding: 16,
  display: "grid",
  gap: 14,
};

const copy = {
  ...type.body,
  color: colors.muted,
  margin: "6px 0 0",
};

const actions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  maxWidth: 440,
  gap: 8,
};

const actionBtn = {
  width: "100%",
};

const hiddenInput = {
  display: "none",
};
