import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { deleteManualPR, getManualPRs, upsertManualPR } from "../lib/manualPRs";
import { buildPRRecords } from "../lib/prRecords";
import { getWorkouts } from "../lib/workoutStorage";
import { MUSCLE_GROUPS } from "../lib/muscleGroups";
import { colors, radii, type } from "../lib/theme";

export default function PRs() {
  const [workouts, setWorkouts] = useState([]);
  const [manualPrs, setManualPrs] = useState([]);
  const [form, setForm] = useState({ id: "", exercise: "", weight: "", reps: "" });
  const [search, setSearch] = useState("");
  const [openGroups, setOpenGroups] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWorkouts(getWorkouts());
      setManualPrs(getManualPRs());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const prs = useMemo(() => buildPRRecords(workouts, manualPrs), [workouts, manualPrs]);
  const groupedPrs = useMemo(() => groupPRs(prs, search), [prs, search]);

  function savePR() {
    if (!form.exercise || !form.weight) return;

    setManualPrs(upsertManualPR(form));
    setForm({ id: "", exercise: "", weight: "", reps: "" });
  }

  function editPR(pr) {
    setForm({
      id: pr.manualId || "",
      exercise: pr.exercise,
      weight: String(pr.weight || ""),
      reps: pr.reps === "" || pr.reps === undefined ? "" : String(pr.reps),
    });
  }

  return (
    <div style={wrap}>
      <header style={pageHeader}>
        <p style={type.eyebrow}>Personal records</p>
        <h1 style={type.pageTitle}>PRs</h1>
      </header>

      <section style={formCard}>
        <div style={{ display: "grid", gap: 4 }}>
          <h2 style={type.sectionTitle}>{form.id ? "Edit PR" : "Add a PR"}</h2>
          <p style={formNote}>
            For PRs you hit but didn&apos;t log. A manual PR overrides your logged sets until you log something heavier.
          </p>
        </div>
        <label style={field}>
          <span style={fieldLabel}>Exercise</span>
          <input
            placeholder="e.g. Bench Press"
            value={form.exercise}
            onChange={(event) => setForm({ ...form, exercise: event.target.value })}
          />
        </label>
        <div style={fieldRow}>
          <label style={field}>
            <span style={fieldLabel}>Weight (lb)</span>
            <input
              type="number"
              inputMode="decimal"
              placeholder="225"
              value={form.weight}
              onChange={(event) => setForm({ ...form, weight: event.target.value })}
            />
          </label>
          <label style={field}>
            <span style={fieldLabel}>Reps</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder="1"
              value={form.reps}
              onChange={(event) => setForm({ ...form, reps: event.target.value })}
            />
          </label>
        </div>
        <button type="button" className="primary" onClick={savePR} style={fullButton}>
          {form.id ? "Save PR" : "Add PR"}
        </button>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={type.sectionTitle}>Records</h2>
        <input
          aria-label="Search PRs"
          placeholder="Search PRs"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {prs.length === 0 ? (
          <div style={{ ...card, ...emptyState }}>No PRs recorded yet. Add your first PR above.</div>
        ) : groupedPrs.length === 0 ? (
          <div style={{ ...card, ...emptyState }}>No PRs match your search.</div>
        ) : (
          <div style={groupList}>
            {groupedPrs.map((group, groupIndex) => {
              const expanded = openGroups[group.id] === true;

              return (
                <section key={group.id} style={{ ...groupItem, ...(groupIndex === 0 ? { borderTop: 0 } : {}) }}>
                  <button
                    type="button"
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [group.id]: !expanded }))}
                    style={groupHeader}
                    aria-expanded={expanded}
                  >
                    <span style={groupName}>{group.label}</span>
                    <span style={groupRight}>
                      <span style={countBadge}>{group.items.length}</span>
                      <Chevron open={expanded} />
                    </span>
                  </button>

                  {expanded && (
                    <div style={groupRows}>
                      {group.items.map((pr, prIndex) => (
                        <article key={pr.exercise} style={{ ...prRow, ...(prIndex === 0 ? { borderTop: 0 } : {}) }}>
                          <div style={{ minWidth: 0 }}>
                            <h3 style={prName}>{pr.exercise}</h3>
                            <p style={prValue}>
                              {pr.weight} lb
                              {pr.reps ? <span style={prReps}> × {pr.reps} reps</span> : null}
                            </p>
                            <p style={prSource}>{describeSource(pr)}</p>
                          </div>
                          <div style={actions}>
                            <button type="button" className="ghost" onClick={() => editPR(pr)} style={editBtn}>
                              Edit
                            </button>
                            {pr.manualId && (
                              <button
                                type="button"
                                className="danger"
                                onClick={() => setConfirmDeleteId(pr.manualId)}
                                style={smallBtn}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete this PR?"
        message="This manual PR will be removed. Your best logged set for this lift becomes the PR again."
        confirmLabel="Delete PR"
        danger
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (!confirmDeleteId) return;
          setManualPrs(deleteManualPR(confirmDeleteId));
          setConfirmDeleteId(null);
        }}
      />
    </div>
  );
}

function Chevron({ open }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ ...chevron, transform: open ? "rotate(180deg)" : "none" }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function describeSource(pr) {
  const date = pr.date
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(pr.date))
    : "";
  if (pr.source === "manual") return date ? `Manual · ${date}` : "Manual";
  return date ? `Logged · ${date}` : "Logged";
}

function groupPRs(prs, search) {
  const query = search.trim().toLowerCase();
  const visible = query ? prs.filter((pr) => pr.exercise.toLowerCase().includes(query)) : prs;

  return MUSCLE_GROUPS.map((group) => ({
    ...group,
    items: visible.filter((pr) => (pr.muscleGroup || "other") === group.id),
  })).filter((group) => group.items.length > 0);
}

const wrap = {
  display: "grid",
  gap: 16,
};

const pageHeader = {
  display: "grid",
  gap: 6,
  padding: "8px 0 4px",
};

const card = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  padding: 16,
};

const formCard = {
  ...card,
  display: "grid",
  gap: 14,
};

const field = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

const fieldLabel = {
  color: colors.textSoft,
  fontSize: 13,
  fontWeight: 500,
};

const fieldRow = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const fullButton = {
  width: "100%",
  padding: "12px 16px",
  marginTop: 2,
};

const emptyState = {
  padding: "28px 16px",
  color: colors.muted,
  textAlign: "center",
};

const groupList = {
  ...card,
  padding: 0,
  overflow: "hidden",
};

const groupItem = {
  borderTop: `1px solid ${colors.borderSoft}`,
};

const groupHeader = {
  width: "100%",
  border: 0,
  borderRadius: 0,
  background: "transparent",
  padding: "13px 16px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  textAlign: "left",
};

const groupName = {
  color: colors.text,
  fontSize: 15,
  fontWeight: 550,
};

const groupRight = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: colors.muted,
};

const countBadge = {
  ...type.number,
  padding: "3px 8px",
  borderRadius: radii.pill,
  background: colors.surfaceRaised,
  color: colors.textSoft,
  fontSize: 12,
  fontWeight: 500,
};

const chevron = {
  flex: "0 0 auto",
  transition: "transform 160ms ease",
};

const groupRows = {
  display: "grid",
  padding: "0 16px",
  background: colors.surfaceSoft,
  borderTop: `1px solid ${colors.borderSoft}`,
};

const prRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "10px 0",
  borderTop: `1px solid ${colors.borderSoft}`,
};

const prName = {
  margin: 0,
  color: colors.textSoft,
  fontSize: 14,
  fontWeight: 550,
};

const prValue = {
  ...type.number,
  margin: "2px 0 0",
  color: colors.accent,
  fontSize: 15,
  fontWeight: 600,
};

const prReps = {
  color: colors.muted,
  fontSize: 13,
  fontWeight: 400,
};

const actions = {
  display: "flex",
  gap: 6,
  flex: "0 0 auto",
};

const smallBtn = {
  minHeight: 34,
  padding: "7px 12px",
  fontSize: 13,
};

const editBtn = {
  ...smallBtn,
  color: colors.brand,
};

const formNote = {
  ...type.meta,
  margin: 0,
};

const prSource = {
  ...type.meta,
  margin: "2px 0 0",
  fontSize: 12,
};
