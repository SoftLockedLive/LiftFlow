import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getBigThree } from "../lib/bigThree";
import { getManualPRs } from "../lib/manualPRs";
import {
  calculateDotsScore,
  calculateLeanMass,
  getProfile,
  normalizeSex,
  PROFILE_WEIGHT_FIELDS,
  saveProfile,
} from "../lib/profile";
import { formatWeight, fromInputValue, normalizeUnits, toInputValue, unitLabel } from "../lib/units";
import { getWorkouts } from "../lib/workoutStorage";
import { colors, radii, tint, type } from "../lib/theme";

export default function Profile() {
  const router = useRouter();
  // `profile` is the form: weight fields hold display-unit text in profile.units.
  // `stored` is the saved profile (lb), used to keep untouched weights exact.
  const [profile, setProfile] = useState({});
  const [stored, setStored] = useState({});
  // Exact lb behind each weight the unit switch rewrote, so switching back and forth doesn't drift.
  const [exact, setExact] = useState({});
  const [saveState, setSaveState] = useState("");
  const [workouts, setWorkouts] = useState([]);
  const [manualPrs, setManualPrs] = useState([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // Reading PRs first moves any old Profile PR fields into manual PRs before the profile loads.
      setManualPrs(getManualPRs());
      const saved = getProfile();
      setStored(saved);
      setProfile(toForm(saved));
      setWorkouts(getWorkouts());
    }, 0);
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

  // Switching units re-expresses the typed weights in the new unit (same quantity).
  function changeUnits(value) {
    const next = { ...profile, units: normalizeUnits(value) };
    const pinned = {};
    PROFILE_WEIGHT_FIELDS.forEach((field) => {
      const lb = readFormWeight(profile, stored, exact, field);
      next[field] = toInputValue(lb, next.units);
      if (next[field] !== "") pinned[field] = { units: next.units, text: next[field], lb };
    });
    setProfile(next);
    setExact(pinned);
  }

  function save() {
    const lbProfile = fromForm(profile, stored, exact);
    const normalized = {
      ...lbProfile,
      sex: normalizeSex(profile.sex),
      bodyweight: lbProfile.bodyweight || lbProfile.weight || "",
    };

    const saved = saveProfile(normalized);
    setStored(saved);
    setExact({});
    setProfile(toForm(saved));
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

  // Stats use the form's values (unsaved edits included) converted to lb, shown in the form's unit.
  const units = normalizeUnits(profile.units);
  const label = unitLabel(units);
  const lbProfile = fromForm(profile, stored, exact);
  const total = getBigThree(workouts, manualPrs).total;
  const leanMass = calculateLeanMass(lbProfile);
  const currentWeight = Number(lbProfile.weight || lbProfile.bodyweight || 0);
  const startWeight = Number(lbProfile.startWeight || 0);
  const weightChange = currentWeight > 0 && startWeight > 0 ? currentWeight - startWeight : null;
  const weightChangeText =
    weightChange === null ? "--" : formatWeight(weightChange, units, { unit: false, decimals: 1 });
  const dotsScore = calculateDotsScore({
    totalLb: total,
    bodyweightLb: Number(lbProfile.bodyweight || lbProfile.weight || 0),
    sex: profile.sex,
  });

  return (
    <div style={wrap}>
      <header className="profile-header" style={header}>
        <h1 style={type.pageTitle}>Profile</h1>
        <button type="button" className="primary" onClick={save} style={saveTop}>
          Save
        </button>
      </header>

      {saveState && (
        <div style={saveNotice} role="status">
          {saveState}
        </div>
      )}

      <section style={card} aria-label="Stats">
        <div className="profile-stats" style={statsGrid}>
          <Stat label="Big 3" value={formatWeight(total, units, { unit: false, grouping: true })} unit={label} />
          <Stat label="DOTS" value={dotsScore || "--"} />
          <Stat
            label="Lean mass"
            value={leanMass === null ? "--" : formatWeight(leanMass, units, { unit: false, decimals: 0 })}
            unit={leanMass === null ? "" : label}
          />
          <Stat
            label="Change"
            value={weightChange === null ? "--" : `${Number(weightChangeText) > 0 ? "+" : ""}${weightChangeText}`}
            unit={weightChange === null ? "" : label}
          />
        </div>
      </section>

      <section className="profile-grid" style={grid}>
        <Panel title="Personal">
          <div style={photoRow}>
            <div style={photoPreview}>
              {profile.photo ? (
                <span style={{ ...photoImage, backgroundImage: `url(${profile.photo})` }} />
              ) : (
                getInitials(profile.name)
              )}
            </div>
            <label style={uploadButton}>
              Choose photo
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
            <SelectField
              label="Sex"
              value={normalizeSex(profile.sex)}
              onChange={(event) => update("sex", event.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </SelectField>
          </div>
          <div className="field-row" style={fieldRow}>
            <SelectField
              label="Goal"
              value={profile.goal || "strength"}
              onChange={(event) => update("goal", event.target.value)}
            >
              <option value="strength">Strength</option>
              <option value="hypertrophy">Hypertrophy</option>
              <option value="fat_loss">Fat loss</option>
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

        <Panel title="Body metrics">
          <Field
            label="Height"
            value={profile.height || ""}
            onChange={(event) => update("height", event.target.value)}
          />
          <div className="field-row" style={fieldRow}>
            <Field
              label={`Weight (${label})`}
              type="number"
              inputMode="decimal"
              value={profile.weight || profile.bodyweight || ""}
              onChange={(event) => {
                update("weight", event.target.value);
                update("bodyweight", event.target.value);
              }}
            />
            <SelectField label="Units" value={units} onChange={(event) => changeUnits(event.target.value)}>
              <option value="lbs">Pounds (lb)</option>
              <option value="kg">Kilograms (kg)</option>
            </SelectField>
          </div>
          <div className="field-row" style={fieldRow}>
            <Field
              label={`Start weight (${label})`}
              type="number"
              inputMode="decimal"
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

        <Panel title="PRs">
          <p style={panelNote}>
            Your PRs come from logged workouts and the PRs page. Hit a PR you didn&apos;t log? Add it there and it
            counts until you log something heavier.
          </p>
          <button type="button" onClick={() => router.push("/prs")} style={panelButton}>
            Manage PRs
          </button>
        </Panel>

        <Panel title="Goals">
          <div className="field-row" style={fieldRow}>
            <Field
              label={`Goal weight (${label})`}
              type="number"
              inputMode="decimal"
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
              label={`Goal bench (${label})`}
              type="number"
              inputMode="decimal"
              value={profile.goalBench || ""}
              onChange={(event) => update("goalBench", event.target.value)}
            />
            <Field
              label={`Goal squat (${label})`}
              type="number"
              inputMode="decimal"
              value={profile.goalSquat || ""}
              onChange={(event) => update("goalSquat", event.target.value)}
            />
          </div>
          <Field
            label={`Goal deadlift (${label})`}
            type="number"
            inputMode="decimal"
            value={profile.goalDeadlift || ""}
            onChange={(event) => update("goalDeadlift", event.target.value)}
          />
        </Panel>
      </section>
    </div>
  );
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return "ME";
}

function Stat({ label, value, unit }) {
  return (
    <div style={statCard}>
      <span style={type.meta}>{label}</span>
      <strong style={statValue}>
        {value}
        {unit ? <span style={statUnit}> {unit}</span> : null}
      </strong>
    </div>
  );
}

// Form <-> stored profile. A weight field still showing the stored value's text keeps
// the stored lb number exactly; anything typed is converted from the form's unit.
function toForm(saved) {
  const units = normalizeUnits(saved.units);
  const form = { ...saved, units };
  PROFILE_WEIGHT_FIELDS.forEach((field) => {
    form[field] = toInputValue(saved[field], units);
  });
  return form;
}

function readFormWeight(form, saved, exact, field) {
  const units = normalizeUnits(form.units);
  const text = String(form[field] ?? "");
  const pinned = exact?.[field];
  if (pinned && pinned.units === units && pinned.text === text) return pinned.lb;
  if (text === toInputValue(saved[field], units)) return saved[field] ?? "";
  return fromInputValue(text, units);
}

function fromForm(form, saved, exact) {
  const lb = { ...form };
  PROFILE_WEIGHT_FIELDS.forEach((field) => {
    lb[field] = readFormWeight(form, saved, exact, field);
  });
  return lb;
}

function Panel({ title, children }) {
  return (
    <section style={panel}>
      <h2 style={type.sectionTitle}>{title}</h2>
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
  display: "grid",
  gap: 16,
};

const header = {
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: "8px 0 4px",
};

const saveTop = {
  minWidth: 88,
};

const saveNotice = {
  border: `1px solid ${tint(colors.success, 0.3)}`,
  borderRadius: radii.lg,
  background: tint(colors.success, 0.08),
  color: colors.success,
  padding: "10px 14px",
  fontSize: 14,
  fontWeight: 500,
};

const card = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  padding: 16,
};

const statsGrid = {
  gap: 8,
};

const statCard = {
  display: "grid",
  gap: 2,
  padding: "10px 12px",
  borderRadius: radii.lg,
  background: colors.surfaceSoft,
  border: `1px solid ${colors.borderSoft}`,
  minWidth: 0,
};

const statValue = {
  ...type.number,
  color: colors.text,
  fontSize: 22,
  fontWeight: 650,
  lineHeight: 1.2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const statUnit = {
  color: colors.muted,
  fontSize: 13,
  fontWeight: 500,
};

const grid = {
  gap: 16,
  alignItems: "start",
};

const panel = {
  ...card,
};

const panelBody = {
  display: "grid",
  gap: 12,
  marginTop: 14,
};

const fieldRow = {
  gap: 12,
};

const fieldWrap = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

const fieldLabel = {
  color: colors.textSoft,
  fontSize: 13,
  fontWeight: 500,
};

const photoRow = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  flexWrap: "wrap",
};

const photoPreview = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  border: `1px solid ${colors.border}`,
  background: colors.surfaceRaised,
  color: colors.textSoft,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  fontWeight: 600,
  overflow: "hidden",
  flex: "0 0 auto",
};

const photoImage = {
  width: "100%",
  height: "100%",
  display: "block",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

// A label (not a button) so it opens the file picker; styled to match the base button.
const uploadButton = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.md,
  padding: "9px 14px",
  color: colors.text,
  background: colors.surfaceRaised,
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 1.2,
  cursor: "pointer",
};

const hiddenFile = {
  display: "none",
};

const panelNote = {
  ...type.body,
  margin: 0,
  color: colors.muted,
};

const panelButton = {
  justifySelf: "start",
};
