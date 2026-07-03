import { useEffect, useState } from "react";
import {
  calculateLeanMass,
  calculateTotal,
  getProfile,
  saveProfile,
} from "../lib/profile";

export default function Profile() {
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const timer = window.setTimeout(() => setProfile(getProfile()), 0);
    return () => window.clearTimeout(timer);
  }, []);

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
    alert("Profile saved!");
  }

  const total = calculateTotal(profile);
  const leanMass = calculateLeanMass(profile);
  const weightChange = Number(profile.weight || 0) - Number(profile.startWeight || 0);

  return (
    <div style={wrap}>
      <header style={header}>
        <div>
          <p style={eyebrow}>Athlete</p>
          <h1 style={title}>Profile</h1>
        </div>
        <button type="button" className="primary" onClick={save} style={saveTop}>
          Save
        </button>
      </header>

      <section style={statsGrid}>
        <Stat label="Big 3" value={`${total} lb`} />
        <Stat label="Lean Mass" value={`${leanMass} lb`} />
        <Stat label="Change" value={`${weightChange > 0 ? "+" : ""}${weightChange} lb`} />
      </section>

      <section style={grid}>
        <Panel title="Personal">
          <Field
            label="Full name"
            value={profile.name || ""}
            onChange={(event) => update("name", event.target.value)}
          />
          <div style={fieldRow}>
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
          <div style={fieldRow}>
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
          <div style={fieldRow}>
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
          <div style={fieldRow}>
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
          <div style={fieldRow}>
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
          <div style={fieldRow}>
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
          <div style={fieldRow}>
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

function Stat({ label, value }) {
  return (
    <div style={statCard}>
      <span style={statLabel}>{label}</span>
      <strong style={statValue}>{value}</strong>
    </div>
  );
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
  display: "flex",
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

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
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
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
