import { useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { downloadBackup, importBackup, STORAGE_PREFIX } from "../lib/backup";
import { colors, tint } from "../lib/theme";

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
        <div>
          <p style={eyebrow}>App</p>
          <h1 style={title}>Settings</h1>
        </div>
      </header>

      {status && <div style={notice}>{status}</div>}

      <section style={card}>
        <div>
          <h2 style={cardTitle}>Data Backup</h2>
          <p style={copy}>Export your local LiftFlow data before changing phones, clearing browser storage, or testing big edits.</p>
        </div>
        <div style={actions}>
          <button type="button" className="primary" onClick={exportData} style={actionBtn}>
            Export Data
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} style={secondaryBtn}>
            Import Data
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={importData} style={hiddenInput} />
        </div>
      </section>

      <section style={dangerCard}>
        <div>
          <h2 style={cardTitle}>Reset</h2>
          <p style={copy}>Clear only LiftFlow data stored on this device. This does not touch anything outside the app.</p>
        </div>
        <button type="button" onClick={() => setConfirmReset(true)} style={dangerBtn}>
          Reset App Data
        </button>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Reset LiftFlow?"
        message="This removes your local workouts, plan, PRs, notes, nutrition logs, and settings from this device."
        confirmLabel="Reset"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={resetData}
      />
    </section>
  );
}

const wrap = {
  maxWidth: 760,
  margin: "0 auto",
};

const header = {
  marginBottom: 18,
};

const eyebrow = {
  margin: 0,
  color: colors.brand,
  fontSize: 14,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 34,
  lineHeight: 1,
};

const notice = {
  border: `1px solid ${tint(colors.brand, 0.35)}`,
  borderRadius: 12,
  background: tint(colors.brand, 0.1),
  color: colors.brand,
  padding: "10px 12px",
  marginBottom: 14,
  fontWeight: 850,
};

const card = {
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  background: colors.surface,
  padding: 16,
  display: "grid",
  gap: 14,
  marginBottom: 14,
};

const dangerCard = {
  ...card,
  borderColor: "rgba(255, 107, 44, 0.36)",
};

const cardTitle = {
  margin: 0,
  color: colors.text,
  fontSize: 22,
};

const copy = {
  margin: "8px 0 0",
  color: colors.muted,
  lineHeight: 1.45,
  fontWeight: 700,
};

const actions = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

const actionBtn = {
  width: "100%",
};

const secondaryBtn = {
  width: "100%",
  color: colors.brand,
  borderColor: tint(colors.brand, 0.35),
  background: colors.surfaceSoft,
};

const dangerBtn = {
  color: "#ff6b2c",
  borderColor: "rgba(255, 107, 44, 0.45)",
  background: "rgba(255, 107, 44, 0.12)",
};

const hiddenInput = {
  display: "none",
};
