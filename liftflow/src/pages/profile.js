import { useEffect, useState } from "react";
import {
  calculateLeanMass,
  calculateTotal,
  getProfile,
  saveProfile,
} from "../lib/profile";

export default function Profile() {
  const [profile, setProfile] = useState({});
  const [saveState, setSaveState] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setProfile(getProfile()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!saveState) return undefined;
    const timer = window.setTimeout(() => setSaveState(""), 2200);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  function update(field, value) {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function save() {
    const normalized = {
      ...profile,
      bodyweight: profile.bodyweight || profile.weight || "",
    };

    setProfile(normalized);
    saveProfile(normalized);
    window.dispatchEvent(new Event("liftflow-profile-updated"));
    setSaveState("Profile saved");
  }

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = (size - width) / 2;
        const y = (size - height) / 2;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(image, x, y, width, height);
        update("photo", canvas.toDataURL("image/jpeg", 0.78));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  const total = calculateTotal(profile);
  const leanMass = calculateLeanMass(profile);
  const weightChange = Number(profile.weight || 0) - Number(profile.startWeight || 0);
  const dotsScore = calculateDotsScore({
    total,
    bodyweight: Number(profile.bodyweight || profile.weight || 0),
    sex: profile.sex,
    units: profile.units || "lbs",
  });

  return (
    <div style={wrap}>
      <header className="profile-header" style={header}>
        <div>
          <p style={eyebrow}>Athlete</p>
          <h1 style={title}>Profile</h1>
        </div>
        <button type="button" className="primary" onClick={save} style={saveTop}>
          Save
        </button>
      </header>

      {saveState && <div style={saveNotice}>{saveState}</div>}

      <section className="profile-stats" style={statsGrid}>
        <Stat label="Big 3" value={`${total} lb`} />
        <Stat label="DOTS" value={dotsScore || "--"} />
        <Stat label="Lean Mass" value={`${leanMass} lb`} />
        <Stat label="Change" value={`${weightChange > 0 ? "+" : ""}${weightChange} lb`} />
      </section>

      <section className="profile-grid" style={grid}>
        <Panel title="Personal">
          <div style={photoRow}>
            <div style={photoPreview}>
              {profile.photo ? <span style={{ ...photoImage, backgroundImage: `url(${profile.photo})` }} /> : getInitials(profile.name)}
            </div>
            <label style={uploadButton}>
              Choose Photo
              <input type="file" accept="image/*" onChange={handlePhoto} style={hiddenFile} />
            </label>
          </div>
          <Field
            label="Full name"
            value={profile.name || ""}
            onChange={(event) => update("name", event.target.value)}
          />
          <div className="field-row" style={fieldRow}>
            <Field
              label="Age"
              type="number"
              value={profile.age || ""}
              onChange={(event) => update("age", event.target.value)}
            />
            <Field
              label="Sex"
              value={profile.sex || ""}
              onChange={(event) => update("sex", event.target.value)}
            />
          </div>
          <div className="field-row" style={fieldRow}>
            <SelectField
              label="Goal"
              value={profile.goal || "strength"}
              onChange={(event) => update("goal", event.target.value)}
            >
              <option value="strength">Strength</option>
              <option value="hypertrophy">Hypertrophy</option>
              <option value="fat_loss">Fat Loss</option>
            </SelectField>
            <SelectField
              label="Experience"
              value={profile.experience || "beginner"}
              onChange={(event) => update("experience", event.target.value)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </SelectField>
          </div>
        </Panel>

        <Panel title="Body Metrics">
          <Field
            label="Height"
            value={profile.height || ""}
            onChange={(event) => update("height", event.target.value)}
          />
          <div className="field-row" style={fieldRow}>
            <Field
              label="Weight"
              type="number"
              value={profile.weight || profile.bodyweight || ""}
              onChange={(event) => {
                update("weight", event.target.value);
                update("bodyweight", event.target.value);
              }}
            />
            <SelectField
              label="Units"
              value={profile.units || "lbs"}
              onChange={(event) => update("units", event.target.value)}
            >
              <option value="lbs">LBS</option>
              <option value="kg">KG</option>
            </SelectField>
          </div>
          <div className="field-row" style={fieldRow}>
            <Field
              label="Start weight"
              type="number"
              value={profile.startWeight || ""}
              onChange={(event) => update("startWeight", event.target.value)}
            />
            <Field
              label="Body fat %"
              type="number"
              value={profile.bodyFat || ""}
              onChange={(event) => update("bodyFat", event.target.value)}
            />
          </div>
        </Panel>

        <Panel title="Current PRs">
          <div className="field-row" style={fieldRow}>
            <Field
              label="Bench PR"
              type="number"
              value={profile.benchPR || ""}
              onChange={(event) => update("benchPR", event.target.value)}
            />
            <Field
              label="Squat PR"
              type="number"
              value={profile.squatPR || ""}
              onChange={(event) => update("squatPR", event.target.value)}
            />
          </div>
          <Field
            label="Deadlift PR"
            type="number"
            value={profile.deadliftPR || ""}
            onChange={(event) => update("deadliftPR", event.target.value)}
          />
        </Panel>

        <Panel title="Goals">
          <div className="field-row" style={fieldRow}>
            <Field
              label="Goal weight"
              type="number"
              value={profile.goalWeight || ""}
              onChange={(event) => update("goalWeight", event.target.value)}
            />
            <Field
              label="Goal body fat %"
              type="number"
              value={profile.goalBodyFat || ""}
              onChange={(event) => update("goalBodyFat", event.target.value)}
            />
          </div>
          <div className="field-row" style={fieldRow}>
            <Field
              label="Goal bench"
              type="number"
              value={profile.goalBench || ""}
              onChange={(event) => update("goalBench", event.target.value)}
            />
            <Field
              label="Goal squat"
              type="number"
              value={profile.goalSquat || ""}
              onChange={(event) => update("goalSquat", event.target.value)}
            />
          </div>
          <Field
            label="Goal deadlift"
            type="number"
            value={profile.goalDeadlift || ""}
            onChange={(event) => update("goalDeadlift", event.target.value)}
          />
        </Panel>
      </section>
    </div>
  );
}

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return "ME";
}

function Stat({ label, value }) {
  return (
    <div style={statCard}>
      <span style={statLabel}>{label}</span>
      <strong style={statValue}>{value}</strong>
    </div>
  );
}

function calculateDotsScore({ total, bodyweight, sex, units }) {
  if (!total || !bodyweight) return null;

  const totalKg = units === "kg" ? total : total * 0.45359237;
  const bodyweightKg = units === "kg" ? bodyweight : bodyweight * 0.45359237;
  const coefficients =
    String(sex || "").toLowerCase() === "female"
      ? [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288]
      : [-0.000001093, 0.0007391293, -0.1918759221, 24.0900756, -307.75076];
  const denominator = coefficients.reduce(
    (sum, coefficient, index) => sum + coefficient * bodyweightKg ** (4 - index),
    0
  );

  if (denominator <= 0) return null;
  return Math.round((500 / denominator) * totalKg * 10) / 10;
}

function Panel({ title, children }) {
  return (
    <section style={panel}>
      <h2 style={panelTitle}>{title}</h2>
      <div style={panelBody}>{children}</div>
    </section>
  );
}

function Field({ label, ...props }) {
  return (
    <label style={fieldWrap}>
      <span style={fieldLabel}>{label}</span>
      <input placeholder={label} {...props} />
    </label>
  );
}

function SelectField({ label, children, ...props }) {
  return (
    <label style={fieldWrap}>
      <span style={fieldLabel}>{label}</span>
      <select {...props}>{children}</select>
    </label>
  );
}

const wrap = {
  maxWidth: 860,
  margin: "0 auto",
};

const header = {
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 18,
};

const eyebrow = {
  margin: 0,
  color: "#be72ff",
  fontSize: 14,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 34,
  lineHeight: 1,
};

const saveTop = {
  minWidth: 90,
};

const saveNotice = {
  border: "1px solid rgba(50, 223, 118, 0.34)",
  borderRadius: 12,
  background: "rgba(50, 223, 118, 0.1)",
  color: "#32df76",
  padding: "10px 12px",
  marginBottom: 14,
  fontWeight: 850,
};

const statsGrid = {
  gap: 12,
  marginBottom: 16,
};

const statCard = {
  border: "1px solid rgba(190, 114, 255, 0.32)",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
};

const statLabel = {
  display: "block",
  color: "#666",
  fontSize: 13,
  fontWeight: 850,
  textTransform: "uppercase",
};

const statValue = {
  display: "block",
  marginTop: 8,
  color: "#be72ff",
  fontSize: 24,
};

const grid = {
  gap: 14,
};

const panel = {
  border: "1px solid #242424",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
};

const panelTitle = {
  margin: 0,
  fontSize: 22,
};

const panelBody = {
  display: "grid",
  gap: 10,
  marginTop: 12,
};

const fieldRow = {
  gap: 10,
};

const fieldWrap = {
  display: "grid",
  gap: 6,
};

const fieldLabel = {
  color: "#777",
  fontSize: 12,
  fontWeight: 850,
  textTransform: "uppercase",
};

const photoRow = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const photoPreview = {
  width: 74,
  height: 74,
  borderRadius: "50%",
  border: "1px solid rgba(190, 114, 255, 0.45)",
  background: "#0b0b0b",
  color: "#be72ff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  overflow: "hidden",
};

const photoImage = {
  width: "100%",
  height: "100%",
  display: "block",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

const uploadButton = {
  border: "1px solid rgba(190, 114, 255, 0.45)",
  borderRadius: 999,
  padding: "10px 14px",
  color: "#be72ff",
  background: "rgba(190, 114, 255, 0.1)",
  fontWeight: 850,
  cursor: "pointer",
};

const hiddenFile = {
  display: "none",
};
