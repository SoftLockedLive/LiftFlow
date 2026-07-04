const KEY = "liftflow_manual_prs";

export function getManualPRs() {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveManualPRs(prs) {
  if (typeof window === "undefined") return [];
  const safePrs = Array.isArray(prs) ? prs : [];
  localStorage.setItem(KEY, JSON.stringify(safePrs));
  return safePrs;
}

export function upsertManualPR(pr) {
  const prs = getManualPRs();
  const nextPr = {
    id: pr.id || crypto.randomUUID(),
    exercise: pr.exercise || "",
    weight: Number(pr.weight || 0),
    reps: pr.reps === "" || pr.reps === undefined ? "" : Number(pr.reps || 0),
    date: pr.date || Date.now(),
  };
  const exists = prs.some((item) => item.id === nextPr.id);
  const updated = exists
    ? prs.map((item) => (item.id === nextPr.id ? nextPr : item))
    : [nextPr, ...prs];

  return saveManualPRs(updated);
}

export function deleteManualPR(id) {
  return saveManualPRs(getManualPRs().filter((item) => item.id !== id));
}
