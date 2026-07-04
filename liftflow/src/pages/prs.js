import { useEffect, useMemo, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { deleteManualPR, getManualPRs, upsertManualPR } from "../lib/manualPRs";
import { getWorkouts } from "../lib/workoutStorage";
import { getWorkoutItems } from "../lib/workoutAnalytics";

export default function PRs() {
  const [workouts, setWorkouts] = useState([]);
  const [manualPrs, setManualPrs] = useState([]);
  const [form, setForm] = useState({ id: "", exercise: "", weight: "", reps: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWorkouts(getWorkouts());
      setManualPrs(getManualPRs());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const prs = useMemo(() => mergePRs(workouts, manualPrs), [workouts, manualPrs]);

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
      <header style={header}>
        <div>
          <p style={eyebrow}>Personal Records</p>
          <h1 style={title}>PRs</h1>
        </div>
      </header>

      <section style={card}>
        <h2 style={cardTitle}>{form.id ? "Edit PR" : "Add PR"}</h2>
        <div className="field-row" style={fieldRow}>
          <input
            placeholder="Exercise"
            value={form.exercise}
            onChange={(event) => setForm({ ...form, exercise: event.target.value })}
          />
          <input
            type="number"
            placeholder="Weight"
            value={form.weight}
            onChange={(event) => setForm({ ...form, weight: event.target.value })}
          />
        </div>
        <input
          type="number"
          placeholder="Reps"
          value={form.reps}
          onChange={(event) => setForm({ ...form, reps: event.target.value })}
        />
        <button type="button" className="primary" onClick={savePR} style={fullButton}>
          {form.id ? "Save PR" : "Add PR"}
        </button>
      </section>

      <section style={list}>
        {prs.length === 0 ? (
          <div style={empty}>No PRs recorded yet.</div>
        ) : (
          prs.map((pr) => (
            <article key={pr.exercise} style={prCard}>
              <div>
                <h2 style={prName}>{pr.exercise}</h2>
                <p style={prMeta}>
                  {pr.weight} lb{pr.reps ? ` x ${pr.reps} reps` : ""}
                </p>
              </div>
              <div style={actions}>
                <button type="button" onClick={() => editPR(pr)} style={editBtn}>
                  Edit
                </button>
                {pr.manualId && (
                  <button type="button" onClick={() => setConfirmDeleteId(pr.manualId)} style={deleteBtn}>
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="Delete PR?"
        message="This manually saved PR will be removed. Workout-derived PRs will still appear from your history."
        confirmLabel="Delete PR"
        danger
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          setManualPrs(deleteManualPR(confirmDeleteId));
          setConfirmDeleteId(null);
        }}
      />
    </div>
  );
}

function mergePRs(workouts, manualPrs) {
  const records = {};

  (workouts || []).forEach((session) => {
    getWorkoutItems(session).forEach((lift) => {
      (lift.sets || []).forEach((set) => {
        const weight = Number(set.weight || 0);
        const reps = set.reps === undefined ? "" : Number(set.reps || 0);
        if (!records[lift.exercise] || weight > records[lift.exercise].weight) {
          records[lift.exercise] = { exercise: lift.exercise, weight, reps, source: "history" };
        }
      });
    });
  });

  (manualPrs || []).forEach((pr) => {
    const weight = Number(pr.weight || 0);
    if (!records[pr.exercise] || weight >= records[pr.exercise].weight) {
      records[pr.exercise] = {
        exercise: pr.exercise,
        weight,
        reps: pr.reps || "",
        manualId: pr.id,
        source: "manual",
      };
    }
  });

  return Object.values(records).sort((a, b) => b.weight - a.weight);
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
  color: "#e4ff2f",
  fontSize: 13,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 34,
  lineHeight: 1,
};

const card = {
  border: "1px solid rgba(228, 255, 47, 0.35)",
  borderRadius: 16,
  background: "#101010",
  padding: 16,
  display: "grid",
  gap: 12,
  marginBottom: 14,
};

const cardTitle = {
  margin: 0,
  fontSize: 22,
};

const fieldRow = {
  gap: 10,
};

const fullButton = {
  width: "100%",
};

const list = {
  display: "grid",
  gap: 10,
};

const empty = {
  border: "1px solid #222",
  borderRadius: 16,
  background: "#101010",
  padding: 22,
  color: "#555",
  textAlign: "center",
  fontWeight: 850,
};

const prCard = {
  border: "1px solid #242424",
  borderRadius: 16,
  background: "#101010",
  padding: 14,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
};

const prName = {
  margin: 0,
  color: "#e4ff2f",
  fontSize: 21,
};

const prMeta = {
  margin: "6px 0 0",
  color: "#777",
  fontWeight: 800,
};

const actions = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const editBtn = {
  color: "#32cfff",
  borderColor: "rgba(50, 207, 255, 0.45)",
  background: "rgba(50, 207, 255, 0.12)",
};

const deleteBtn = {
  color: "#ff6b2c",
  borderColor: "rgba(255, 107, 44, 0.45)",
  background: "rgba(255, 107, 44, 0.12)",
};
