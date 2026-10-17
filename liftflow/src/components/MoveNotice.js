import { useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { buildTransferUrl, decodeTransfer, downloadBackup, importBackup, takeTransfer } from "../lib/backup";
import { colors, radii, tint, type } from "../lib/theme";

export const NEW_ORIGIN = "https://liftflow.softlockedlive.com";
const NEW_HOST = NEW_ORIGIN.replace("https://", "");

export function isOldSite() {
  return window.location.hostname.endsWith(".vercel.app");
}

// On the old Vercel deployment: tells people the app moved and carries their data over.
// On any deployment: picks up a #transfer= link and asks before importing it.
export default function MoveNotice() {
  const [onOldSite, setOnOldSite] = useState(false);
  const [incoming, setIncoming] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setOnOldSite(isOldSite());

      const encoded = takeTransfer();
      if (!encoded) return;
      clearHash();
      try {
        const data = await decodeTransfer(encoded);
        setIncoming(data);
      } catch {
        setStatus("That move link was damaged. Use Download backup on the old site and import it in Settings.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function moveData() {
    setBusy(true);
    try {
      const url = await buildTransferUrl(NEW_ORIGIN);
      if (url) {
        window.location.assign(url);
        return;
      }
      downloadBackup();
      setStatus(
        "Your data is too big to move in one tap, so a backup file was downloaded. Import it in Settings on the new site.",
      );
    } catch {
      setStatus("Could not move your data. Use Download backup instead.");
    }
    setBusy(false);
  }

  function confirmImport() {
    const imported = importBackup(incoming);
    setIncoming(null);
    setStatus(
      imported
        ? "Your data has been moved over. Welcome to the new LiftFlow!"
        : "No LiftFlow data was found in that link.",
    );
  }

  const itemCount = incoming ? Object.keys(incoming).length : 0;

  return (
    <>
      {onOldSite && (
        <section style={banner} role="region" aria-label="LiftFlow has moved">
          <strong style={bannerTitle}>LiftFlow has moved to {NEW_HOST}</strong>
          <p style={bannerCopy}>
            Your workouts are saved on this device only, so bring them with you before this site shuts down. Tap{" "}
            <b>Move my data</b> to copy everything to the new site.
          </p>
          <p style={bannerCopy}>
            Use LiftFlow from your home screen? Tap <b>Download backup</b>, add {NEW_HOST} to your home screen, then
            open it and go to More → Settings → Import data.
          </p>
          <div style={bannerActions}>
            <button type="button" className="primary" onClick={moveData} disabled={busy}>
              {busy ? "Moving..." : "Move my data"}
            </button>
            <button type="button" onClick={downloadBackup}>
              Download backup
            </button>
            <a href={NEW_ORIGIN} style={link}>
              Open new site
            </a>
          </div>
        </section>
      )}

      {status && (
        <div style={statusBox} role="status">
          <span>{status}</span>
          <button type="button" className="ghost" onClick={() => setStatus("")} style={dismissBtn} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(incoming)}
        title="Move your data here?"
        message={`This copies ${itemCount} saved LiftFlow ${itemCount === 1 ? "item" : "items"} from the old site onto this device. Anything already saved here with the same name is replaced.`}
        confirmLabel="Move data"
        onCancel={() => setIncoming(null)}
        onConfirm={confirmImport}
      />
    </>
  );
}

function clearHash() {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

// Sits above the header, so it lines up with the page column itself.
const banner = {
  width: "min(912px, calc(100% - 32px))",
  margin: "12px auto 0",
  border: `1px solid ${tint(colors.brand, 0.35)}`,
  borderRadius: radii.xl,
  background: tint(colors.brand, 0.06),
  padding: 16,
  display: "grid",
  gap: 8,
};

const bannerTitle = {
  ...type.sectionTitle,
};

const bannerCopy = {
  ...type.body,
  margin: 0,
};

const bannerActions = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  marginTop: 6,
};

const link = {
  padding: "9px 8px",
  color: colors.brand,
  fontSize: 14,
  fontWeight: 600,
};

const statusBox = {
  width: "min(912px, calc(100% - 32px))",
  margin: "12px auto 0",
  border: `1px solid ${tint(colors.brand, 0.3)}`,
  borderRadius: radii.lg,
  background: tint(colors.brand, 0.08),
  color: colors.text,
  padding: "8px 8px 8px 14px",
  fontSize: 14,
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const dismissBtn = {
  width: 34,
  height: 34,
  padding: 0,
  flex: "0 0 auto",
};
