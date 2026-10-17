import { useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { buildTransferUrl, decodeTransfer, downloadBackup, importBackup, takeTransfer } from "../lib/backup";
import { colors, tint } from "../lib/theme";

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
            open it and go to More → Settings → Import Data.
          </p>
          <div style={bannerActions}>
            <button type="button" className="primary" onClick={moveData} disabled={busy}>
              {busy ? "Moving..." : "Move my data"}
            </button>
            <button type="button" onClick={downloadBackup} style={secondaryBtn}>
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
          <button type="button" onClick={() => setStatus("")} style={dismissBtn} aria-label="Dismiss">
            X
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

const banner = {
  margin: "0 0 12px",
  border: `1px solid ${tint(colors.brand, 0.45)}`,
  borderRadius: 14,
  background: `linear-gradient(135deg, ${tint(colors.brand, 0.16)}, ${tint(colors.accent, 0.09)}), ${colors.surfaceSoft}`,
  padding: "12px 14px",
  display: "grid",
  gap: 8,
};

const bannerTitle = {
  color: colors.brand,
  fontSize: 17,
};

const bannerCopy = {
  margin: 0,
  color: colors.textSoft,
  lineHeight: 1.45,
  fontSize: 14,
  fontWeight: 700,
};

const bannerActions = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 10,
  marginTop: 4,
};

const secondaryBtn = {
  color: colors.brand,
  borderColor: tint(colors.brand, 0.35),
  background: colors.surfaceSoft,
};

const link = {
  color: colors.brand,
  fontWeight: 850,
};

const statusBox = {
  margin: "0 0 12px",
  border: `1px solid ${tint(colors.brand, 0.35)}`,
  borderRadius: 12,
  background: tint(colors.brand, 0.1),
  color: colors.brand,
  padding: "10px 12px",
  fontWeight: 850,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const dismissBtn = {
  width: 32,
  height: 32,
  padding: 0,
  flex: "0 0 auto",
};
