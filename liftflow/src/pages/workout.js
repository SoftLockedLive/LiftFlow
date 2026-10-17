import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { upsertCustomExercise } from "../lib/customExercises";
import { getMuscleGroup } from "../lib/muscleGroups";
import { getManualPRs } from "../lib/manualPRs";
import { getPlan } from "../lib/plan";
import { buildPRMap, detectPRs, formatPR } from "../lib/prRecords";
import { buildTodaysWorkout } from "../lib/trainingEngine";
import { getTodayName } from "../lib/today";
import { getWorkouts, saveWorkout } from "../lib/workoutStorage";
import { calculateSessionSummary, normalizeExerciseName } from "../lib/workoutAnalytics";
import { buildCoachRecommendation, buildLiveSetRecommendation } from "../lib/coach";
import { getLoadProfile } from "../lib/loadProfiles";
import { colors, dayColors, radii, tint, type } from "../lib/theme";
import { fromDisplay, toInputValue, unitLabel, useUnits } from "../lib/units";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DRAFT_KEY = "liftflow_workout_drafts";
const LAST_DAY_KEY = "liftflow_last_workout_day";
const RECAP_KEY = "liftflow_last_workout_recap";

export default function Workout() {
  const router = useRouter();
  const [plan, setPlan] = useState({});
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [session, setSession] = useState({});
  const [drafts, setDrafts] = useState({});
  const [workouts, setWorkouts] = useState([]);
  const [manualPrs, setManualPrs] = useState([]);
  const [restEndsAt, setRestEndsAt] = useState(0);
  const [restNow, setRestNow] = useState(0);
  const [restPreset, setRestPreset] = useState(90);
  const [finishMessage, setFinishMessage] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState(createEmptyAddDraft());
  const [addSearch, setAddSearch] = useState("");
  const units = useUnits();

  // Remaining rest is derived from an end timestamp, so throttled or paused
  // intervals (backgrounded mobile tabs) can't make the timer run slow.
  useEffect(() => {
    if (!restEndsAt) return undefined;

    function tick() {
      const now = Date.now();
      setRestNow(now);
      if (now >= restEndsAt) setRestEndsAt(0);
    }

    const timer = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [restEndsAt]);

  function startRest() {
    const now = Date.now();
    setRestNow(now);
    setRestEndsAt(now + restPreset * 1000);
  }

  useEffect(() => {
    if (!router.isReady) return undefined;

    const timer = window.setTimeout(() => {
      const savedPlan = getPlan();
      const requestedDay = getRequestedDay(router.query.day);
      const savedDay = getLastWorkoutDay();
      const initialDay = requestedDay || (DAYS.includes(savedDay) ? savedDay : getTodayName());
      const savedDrafts = getWorkoutDrafts();

      setPlan(savedPlan);
      setSelectedDay(initialDay);
      setDrafts(savedDrafts);
      setSession(getSafeSession(savedDrafts[initialDay]));
      setWorkouts(getWorkouts());
      setManualPrs(getManualPRs());
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router.isReady, router.query.day]);

  function chooseDay(day) {
    setSelectedDay(day);
    setFinishMessage("");
    saveLastWorkoutDay(day);
    setSession(getSafeSession(drafts[day]));

    if (router.query.day) {
      router.replace("/workout", undefined, { shallow: true, scroll: false });
    }
  }

  function updateSet(exerciseId, setIndex, field, value) {
    setFinishMessage("");
    setSession((prev) => {
      const copy = { ...getSafeSession(prev) };

      if (!Array.isArray(copy[exerciseId])) {
        copy[exerciseId] = [];
      }

      const previous = copy[exerciseId][setIndex] || {};
      // Drafts keep weight in lb like saved workouts. The typed text is kept too, tagged
      // with its unit, so the input shows exactly what was typed ("102." mid-entry) and
      // a draft stays unambiguous if the unit changes before the workout is finished.
      copy[exerciseId][setIndex] =
        field === "weight"
          ? { ...previous, weight: fromDisplay(value, units), weightInput: value, weightUnits: units }
          : { ...previous, [field]: field === "duration" ? value : Number(value) };

      const updatedDrafts = {
        ...drafts,
        [selectedDay]: copy,
      };

      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);

      return copy;
    });
  }

  function addSet(exerciseId) {
    setSession((prev) => {
      const current = getSafeSession(prev);
      const nextSets = [...(Array.isArray(current[exerciseId]) ? current[exerciseId] : []), {}];
      const copy = { ...current, [exerciseId]: nextSets };
      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });
  }

  function removeSet(exerciseId, setIndex) {
    setSession((prev) => {
      const current = getSafeSession(prev);
      const nextSets = [...(Array.isArray(current[exerciseId]) ? current[exerciseId] : [])];
      nextSets.splice(setIndex, 1);
      const copy = { ...current };
      if (nextSets.length > 0) {
        copy[exerciseId] = nextSets;
      } else {
        delete copy[exerciseId];
      }
      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });
  }

  function toggleWarmup(movementId) {
    setSession((prev) => {
      const current = getSafeSession(prev);
      const warmupState = { ...(isPlainObject(current.__warmup) ? current.__warmup : {}) };
      warmupState[movementId] = !warmupState[movementId];
      const copy = { ...current, __warmup: warmupState };
      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });
  }

  function toggleRampSet(exerciseId, setIndex) {
    setSession((prev) => {
      const current = getSafeSession(prev);
      const rampState = { ...(isPlainObject(current.__ramp) ? current.__ramp : {}) };
      const liftRamp = { ...(isPlainObject(rampState[exerciseId]) ? rampState[exerciseId] : {}) };
      liftRamp[setIndex] = !liftRamp[setIndex];
      rampState[exerciseId] = liftRamp;

      const copy = { ...current, __ramp: rampState };
      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });
  }

  function toggleCoachDetails(exerciseId) {
    setSession((prev) => {
      const current = getSafeSession(prev);
      const coachState = { ...(isPlainObject(current.__coach) ? current.__coach : {}) };
      coachState[exerciseId] = !coachState[exerciseId];

      const copy = { ...current, __coach: coachState };
      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });
  }

  function updateVariation(exerciseId, patch) {
    setSession((prev) => {
      const currentSession = getSafeSession(prev);
      const variations = { ...(isPlainObject(currentSession.__variations) ? currentSession.__variations : {}) };
      const currentDraft = normalizeVariationDraft(variations[exerciseId]);
      const next = { ...currentDraft, ...patch };

      if (!next.open && !next.value && !next.custom) {
        delete variations[exerciseId];
      } else {
        variations[exerciseId] = next;
      }

      const copy = { ...currentSession, __variations: variations };
      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });
  }

  function finishWorkout() {
    const previousWorkouts = getWorkouts();
    const currentSession = getSafeSession(session);
    const completedWorkout = program
      .map((lift) => {
        const performedExercise = getPerformedExercise(lift, currentSession.__variations?.[lift.id]);
        const swapped = performedExercise !== lift.exercise;
        const loadProfile = getLoadProfile(swapped ? { exercise: performedExercise } : lift);

        return {
          exercise: performedExercise,
          baseExercise: normalizeExerciseName(performedExercise),
          loadType: loadProfile.type,
          minimumLoad: loadProfile.minimumLoad,
          // History and Home still display `variation`; the coach ignores the "Planned:" marker.
          variation: swapped ? `Planned: ${lift.exercise}` : "",
          plannedExercise: swapped ? lift.exercise : "",
          muscleGroup: lift.muscleGroup || "other",
          plannedSets: lift.sets || "",
          plannedReps: lift.reps || "",
          targetType: lift.targetType || "reps",
          plannedDuration: lift.duration || "",
          addedDuringWorkout: Boolean(lift.addedDuringWorkout),
          sets: getLoggedSets(currentSession[lift.id]),
          date: Date.now(),
          note: lift.note || lift.stretches || "",
          stretches: lift.stretches || "",
        };
      })
      .filter((lift) => lift.sets.length > 0);

    if (completedWorkout.length === 0) {
      setFinishMessage("Log at least one set before finishing. Your workout is still saved as a draft.");
      return;
    }

    const workoutSummary = calculateSessionSummary(completedWorkout);
    const prs = detectPRs(previousWorkouts, completedWorkout, getManualPRs());

    saveWorkout(completedWorkout, {
      day: selectedDay,
      focus: plan.__meta?.[selectedDay]?.name || selectedDay,
      summary: workoutSummary,
      prs,
    });

    const updatedDrafts = { ...drafts };
    delete updatedDrafts[selectedDay];
    setDrafts(updatedDrafts);
    saveWorkoutDrafts(updatedDrafts);

    saveWorkoutRecap({
      focus: plan.__meta?.[selectedDay]?.name || selectedDay,
      day: selectedDay,
      addedLifts: completedWorkout.filter((lift) => lift.addedDuringWorkout).length,
      lifts: completedWorkout.length,
      ...workoutSummary,
      prs,
    });
    setPlan(getPlan());
    setWorkouts(getWorkouts());
    setManualPrs(getManualPRs());
    setSession({});
    router.push("/notes", undefined, { scroll: false });
  }

  function openAddExercise() {
    setAddDraft(createEmptyAddDraft());
    setAddSearch("");
    setAddOpen(true);
  }

  function addExerciseToWorkout(lift, saveCustom = false) {
    const prepared = prepareWorkoutLift(lift);
    if (!prepared.exercise || !prepared.sets || !prepared.reps) return;

    setSession((prev) => {
      const current = getSafeSession(prev);
      const extraLifts = Array.isArray(current.__extraLifts) ? current.__extraLifts : [];
      const copy = { ...current, __extraLifts: [...extraLifts, prepared] };
      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });

    if (saveCustom) {
      upsertCustomExercise(prepared);
    }

    setAddOpen(false);
    setAddDraft(createEmptyAddDraft());
  }

  function removeWorkoutExercise(lift) {
    if (!lift.addedDuringWorkout) return;

    setSession((prev) => {
      const current = getSafeSession(prev);
      const extraLifts = (Array.isArray(current.__extraLifts) ? current.__extraLifts : []).filter(
        (item) => item.id !== lift.id,
      );
      const copy = { ...current, __extraLifts: extraLifts };
      delete copy[lift.id];

      if (isPlainObject(copy.__variations)) {
        const variations = { ...copy.__variations };
        delete variations[lift.id];
        copy.__variations = variations;
      }
      if (isPlainObject(copy.__coach)) {
        const coach = { ...copy.__coach };
        delete coach[lift.id];
        copy.__coach = coach;
      }
      if (isPlainObject(copy.__ramp)) {
        const ramp = { ...copy.__ramp };
        delete ramp[lift.id];
        copy.__ramp = ramp;
      }

      const updatedDrafts = { ...drafts, [selectedDay]: copy };
      setDrafts(updatedDrafts);
      saveWorkoutDrafts(updatedDrafts);
      return copy;
    });
  }

  function addCustomDraftToWorkout() {
    const targetValue = addDraft.targetType === "time" ? addDraft.duration : addDraft.reps;
    addExerciseToWorkout({ ...addDraft, reps: targetValue }, true);
  }

  const safeSession = getSafeSession(session);
  const prMap = buildPRMap(workouts, manualPrs);
  const baseProgram = buildTodaysWorkout(selectedDay, plan, workouts, manualPrs, units);
  const extraProgram = buildExtraWorkoutProgram(safeSession.__extraLifts, workouts, prMap, units);
  const program = [...baseProgram, ...extraProgram];
  const restSeconds = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - restNow) / 1000)) : 0;
  const focusName = plan.__meta?.[selectedDay]?.name || selectedDay;
  const recovery = plan.__meta?.[selectedDay]?.recovery;
  const warmup = Array.isArray(plan.__meta?.[selectedDay]?.warmup)
    ? plan.__meta[selectedDay].warmup.filter(Boolean)
    : [];
  const emphasis = plan.__meta?.[selectedDay]?.emphasis || "";
  const splitExerciseOptions = getSplitExerciseOptions(plan, selectedDay, addSearch);

  return (
    <div style={wrap}>
      <header style={header}>
        <div style={{ minWidth: 0 }}>
          <p style={type.eyebrow}>
            {selectedDay} · {program.length} lift{program.length === 1 ? "" : "s"}
          </p>
          <h1 style={title}>{focusName}</h1>
        </div>
        {!recovery && (
          <button type="button" onClick={openAddExercise} style={addWorkoutBtn}>
            + Add exercise
          </button>
        )}
      </header>

      <div style={dayRow}>
        {DAYS.map((day) => {
          const selected = selectedDay === day;
          const dayAccent = getDayAccent(day, plan);
          return (
            <button
              key={day}
              type="button"
              onClick={() => chooseDay(day)}
              aria-pressed={selected}
              style={{
                ...dayBtn,
                ...(selected
                  ? { background: tint(dayAccent, 0.14), color: dayAccent, borderColor: tint(dayAccent, 0.4) }
                  : {}),
              }}
            >
              {day.slice(0, 3)}
            </button>
          );
        })}
      </div>

      {recovery ? (
        <section style={card}>
          <p style={{ ...type.eyebrow, color: colors.success }}>Recovery day</p>
          <h2 style={recoveryTitle}>{focusName}</h2>
          <p style={recoveryMeta}>
            {recovery.activity} · {recovery.duration} · {recovery.intensity}
          </p>
          {recovery.notes && <p style={recoveryNotes}>{recovery.notes}</p>}
        </section>
      ) : program.length === 0 ? (
        <section style={{ ...card, ...empty }}>
          <span>No workout planned for {selectedDay}.</span>
          <div style={emptyActions}>
            <button type="button" className="primary" onClick={() => router.push("/plan")}>
              Build program
            </button>
            <button type="button" onClick={openAddExercise}>
              Add one lift
            </button>
          </div>
        </section>
      ) : (
        <section style={list}>
          {emphasis && (
            <section style={card}>
              <p style={{ ...type.eyebrow, color: colors.success }}>Recovery emphasis</p>
              <h2 style={emphasisTitle}>{focusName}</h2>
              <p style={emphasisText}>{emphasis}</p>
            </section>
          )}

          {warmup.length > 0 && (
            <section style={card}>
              <div style={warmupHeader}>
                <h2 style={type.sectionTitle}>Warmup</h2>
                <span style={warmupCount}>{warmup.length} moves</span>
              </div>
              <div style={warmupList}>
                {warmup.map((movement, index) => {
                  const movementId = movement.id || `${formatText(movement.name, "movement")}-${index}`;
                  const done = Boolean(safeSession.__warmup?.[movementId]);

                  return (
                    <button
                      key={movementId}
                      type="button"
                      onClick={() => toggleWarmup(movementId)}
                      aria-pressed={done}
                      style={{
                        ...warmupRow,
                        ...(index === 0 ? { borderTop: 0 } : {}),
                        ...(done ? warmupRowDone : {}),
                      }}
                    >
                      <span style={{ ...checkBox, ...(done ? checkBoxDone : {}) }}>{done ? "✓" : ""}</span>
                      <span style={warmupMain}>
                        <strong style={warmupName}>{formatText(movement.name, "Warmup")}</strong>
                        {movement.note && <span style={warmupNote}>{formatText(movement.note, "")}</span>}
                      </span>
                      <span style={warmupDose}>{formatWarmupMovement(movement)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <div style={timerCard}>
            <div style={timerReadout}>
              <span style={timerLabel}>Rest</span>
              <strong style={{ ...timerValue, color: restSeconds > 0 ? colors.brand : colors.text }}>
                {formatRestTime(restSeconds)}
              </strong>
            </div>
            <div style={timerActions}>
              <div style={timerPresets} role="group" aria-label="Rest length">
                {[60, 90, 120].map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => setRestPreset(seconds)}
                    aria-pressed={restPreset === seconds}
                    style={{
                      ...timerChip,
                      ...(restPreset === seconds ? activeTimerChip : {}),
                    }}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
              <button type="button" onClick={startRest} style={timerStart}>
                Start
              </button>
              <button type="button" className="ghost" onClick={() => setRestEndsAt(0)} style={timerReset}>
                Reset
              </button>
            </div>
          </div>

          {program.map((lift) => {
            const group = getMuscleGroup(lift.muscleGroup);
            const workingSets = Array.isArray(safeSession[lift.id]) ? safeSession[lift.id] : [];
            const variationOptions = getVariationOptions(lift);
            const variationDraft = normalizeVariationDraft(safeSession.__variations?.[lift.id]);
            const selectedVariation = getSelectedVariation(variationDraft);
            const performedExercise = getPerformedExercise(lift, variationDraft);
            const swapped = performedExercise !== lift.exercise;
            const loadProfile = getLoadProfile(swapped ? { exercise: performedExercise } : lift);
            const activePr = swapped ? prMap[normalizeExerciseName(performedExercise)] : lift.prRecord;
            const activeLift = swapped
              ? {
                  ...lift,
                  exercise: performedExercise,
                  baseExercise: normalizeExerciseName(performedExercise),
                  prRecord: activePr,
                  ...loadProfile,
                }
              : { ...lift, ...loadProfile };
            const coach = swapped ? buildCoachRecommendation(activeLift, workouts, units) : lift.coachRecommendation;
            const liveCoach = buildLiveSetRecommendation(activeLift, workingSets, coach);
            const coachDetailsOpen = Boolean(safeSession.__coach?.[lift.id]);
            const isTime = lift.targetType === "time";

            return (
              <article key={lift.id} style={liftCard}>
                <div style={liftHeader}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={liftTitle}>{performedExercise}</h2>
                    <p style={liftMeta}>
                      {group.label} · {formatWorkoutTarget(lift)}
                      {swapped ? ` · planned ${lift.exercise}` : ""}
                    </p>
                    {!isTime && activePr && <span style={prBadge}>{formatPR(activePr, units)}</span>}
                  </div>
                  <div style={liftHeaderActions}>
                    {lift.addedDuringWorkout && (
                      <button
                        type="button"
                        className="danger"
                        onClick={() => removeWorkoutExercise(lift)}
                        style={smallBtn}
                        aria-label={`Remove ${lift.exercise}`}
                        title="Remove added exercise"
                      >
                        Remove
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => updateVariation(lift.id, { open: !variationDraft.open })}
                      style={{
                        ...smallBtn,
                        ...(selectedVariation || variationDraft.open ? selectedChip : {}),
                      }}
                      aria-expanded={variationDraft.open}
                      aria-label={`Swap exercise for ${lift.exercise}`}
                      title="Swap exercise"
                    >
                      Swap
                    </button>
                  </div>
                </div>

                {variationDraft.open && (
                  <div style={variationPanel}>
                    <span style={wellLabel}>Swap for</span>
                    <div style={variationChips}>
                      <button
                        type="button"
                        onClick={() => updateVariation(lift.id, { value: "", custom: "", open: false })}
                        style={{
                          ...variationChip,
                          ...(!selectedVariation ? selectedChip : {}),
                        }}
                      >
                        Keep {lift.exercise}
                      </button>
                      {variationOptions.map((variation) => (
                        <button
                          key={variation}
                          type="button"
                          onClick={() => updateVariation(lift.id, { value: variation, custom: "", open: false })}
                          style={{
                            ...variationChip,
                            ...(selectedVariation === variation ? selectedChip : {}),
                          }}
                        >
                          {variation}
                        </button>
                      ))}
                    </div>
                    <input
                      placeholder="Or type the exercise you did"
                      value={variationDraft.custom}
                      onChange={(event) => updateVariation(lift.id, { custom: event.target.value, value: "" })}
                    />
                  </div>
                )}

                {coach && (
                  <section style={coachCard}>
                    <button
                      type="button"
                      onClick={() => toggleCoachDetails(lift.id)}
                      style={coachToggle}
                      aria-expanded={coachDetailsOpen}
                    >
                      <div style={{ minWidth: 0 }}>
                        <span style={coachLabel}>Coach</span>
                        <strong style={coachTitle}>{coach.headline}</strong>
                      </div>
                      <span style={coachBadge}>{coachDetailsOpen ? "Hide ramp" : "Show ramp"}</span>
                    </button>
                    <p style={coachDetail}>{coach.detail}</p>
                    {coachDetailsOpen && coach.warmups?.length > 0 && (
                      <div style={coachWarmupBlock}>
                        <span style={wellLabel}>{coach.warmupLabel || "Optional ramp"}</span>
                        <div style={coachWarmups}>
                          {coach.warmups.map((set, index) => {
                            const done = Boolean(safeSession.__ramp?.[lift.id]?.[index]);

                            return (
                              <button
                                key={`${set.weight}-${set.reps}-${index}`}
                                type="button"
                                onClick={() => toggleRampSet(lift.id, index)}
                                aria-pressed={done}
                                style={{
                                  ...coachWarmupChip,
                                  ...(done ? selectedChip : {}),
                                }}
                              >
                                <span style={{ ...miniCheckBox, ...(done ? miniCheckBoxDone : {}) }}>
                                  {done ? "✓" : ""}
                                </span>
                                {set.weight} × {set.reps}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {coachDetailsOpen && coach.warmups?.length === 0 && (
                      <p style={coachContextNote}>No ramp needed before this working weight.</p>
                    )}
                    {coach.contextNotes?.map((note) => (
                      <p key={note} style={coachContextNote}>
                        {note}
                      </p>
                    ))}
                    <div style={coachPlanRow}>
                      {coach.workingSetPlan && <span style={coachPlan}>{coach.workingSetPlan}</span>}
                      <strong style={coachAction}>{coach.nextAction}</strong>
                    </div>
                    {liveCoach && (
                      <div style={{ ...liveCoachBox, ...getLiveCoachTone(liveCoach.tone) }}>
                        <strong style={liveCoachLabel}>{liveCoach.label}</strong>
                        <span style={liveCoachDetail}>{liveCoach.detail}</span>
                      </div>
                    )}
                  </section>
                )}

                {(lift.note || lift.stretches) && (
                  <div style={noteBox}>
                    <span style={wellLabel}>Lift note</span>
                    <p style={noteText}>{lift.note || lift.stretches}</p>
                  </div>
                )}

                <div style={workingSetHeader}>
                  <span style={workingSetLabel}>Working sets</span>
                  <span style={workingSetMeta}>
                    {isTime ? "Track time for history." : "Counts for history and PRs."}
                  </span>
                </div>

                {workingSets.length === 0 ? (
                  <button type="button" onClick={() => addSet(lift.id)} style={addSetBtn}>
                    + Add first set
                  </button>
                ) : (
                  <>
                    <div style={setColumns} aria-hidden="true">
                      <span>Set</span>
                      <span>Weight ({unitLabel(units)})</span>
                      <span>{isTime ? "Time" : "Reps"}</span>
                      <span />
                    </div>
                    <div style={setList}>
                      {workingSets.map((_, i) => (
                        <div key={i} style={setRow}>
                          <span style={setNumber}>{i + 1}</span>
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder={unitLabel(units)}
                            aria-label={`Set ${i + 1} weight in ${unitLabel(units)}`}
                            value={getWeightInputValue(workingSets[i], units)}
                            onChange={(event) => updateSet(lift.id, i, "weight", event.target.value)}
                            style={setInput}
                          />
                          {isTime ? (
                            <input
                              placeholder="time"
                              aria-label={`Set ${i + 1} time`}
                              value={workingSets[i]?.duration || ""}
                              onChange={(event) => updateSet(lift.id, i, "duration", event.target.value)}
                              style={setInput}
                            />
                          ) : (
                            <input
                              type="number"
                              inputMode="numeric"
                              placeholder="reps"
                              aria-label={`Set ${i + 1} reps`}
                              value={workingSets[i]?.reps || ""}
                              onChange={(event) => updateSet(lift.id, i, "reps", event.target.value)}
                              style={setInput}
                            />
                          )}
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => removeSet(lift.id, i)}
                            style={removeSetBtn}
                            aria-label={`Remove set ${i + 1}`}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => addSet(lift.id)} style={addSetBtn}>
                      + Add set
                    </button>
                  </>
                )}
              </article>
            );
          })}
        </section>
      )}

      {!recovery && program.length > 0 && (
        <button type="button" className="primary" onClick={finishWorkout} style={finishBtn}>
          Finish workout
        </button>
      )}
      {finishMessage && (
        <p style={finishNote} role="status">
          {finishMessage}
        </p>
      )}

      {addOpen && (
        <div style={modalOverlay} onClick={() => setAddOpen(false)}>
          <section
            style={modalPanel}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-exercise-title"
          >
            <div style={modalHeader}>
              <div style={{ minWidth: 0 }}>
                <p style={type.eyebrow}>{selectedDay}</p>
                <h2 id="add-exercise-title" style={modalTitle}>
                  Add exercise
                </h2>
              </div>
              <button
                type="button"
                className="ghost"
                onClick={() => setAddOpen(false)}
                style={closeBtn}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div style={modalBody}>
              <section style={addSection}>
                <h3 style={addSectionTitle}>From your split</h3>
                <input
                  placeholder="Search your split"
                  value={addSearch}
                  onChange={(event) => setAddSearch(event.target.value)}
                />
                {splitExerciseOptions.length === 0 ? (
                  <p style={emptyMini}>No other split exercises found.</p>
                ) : (
                  <div style={libraryList}>
                    {splitExerciseOptions.map((lift, index) => (
                      <button
                        key={`${lift.exercise}-${lift.muscleGroup}-${lift.sets}-${lift.reps}`}
                        type="button"
                        onClick={() => addExerciseToWorkout(lift)}
                        style={{ ...libraryItem, ...(index === 0 ? { borderTop: 0 } : {}) }}
                      >
                        <span style={libraryText}>
                          <strong style={libraryName}>{lift.exercise}</strong>
                          <span style={libraryMeta}>
                            {lift.sourceDay} · {getMuscleGroup(lift.muscleGroup).label} · {formatWorkoutTarget(lift)}
                          </span>
                        </span>
                        <span style={libraryAdd}>Add</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section style={{ ...addSection, ...addSectionDivider }}>
                <h3 style={addSectionTitle}>Custom exercise</h3>
                <label style={field}>
                  <span style={fieldLabel}>Name</span>
                  <input
                    placeholder="e.g. Cable Fly"
                    value={addDraft.exercise}
                    onChange={(event) => setAddDraft({ ...addDraft, exercise: event.target.value })}
                  />
                </label>
                <div style={addFieldRow}>
                  <label style={field}>
                    <span style={fieldLabel}>Muscle group</span>
                    <select
                      value={addDraft.muscleGroup}
                      onChange={(event) => setAddDraft({ ...addDraft, muscleGroup: event.target.value })}
                    >
                      {["chest", "back", "legs", "shoulders", "arms", "core", "other"].map((group) => (
                        <option key={group} value={group}>
                          {getMuscleGroup(group).label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={field}>
                    <span style={fieldLabel}>Equipment</span>
                    <select
                      value={addDraft.loadType}
                      onChange={(event) => setAddDraft({ ...addDraft, loadType: event.target.value })}
                    >
                      <option value="">
                        Auto ({formatLoadType(getLoadProfile({ exercise: addDraft.exercise }).type)})
                      </option>
                      {["barbell", "machine", "dumbbell", "bodyweight", "free"].map((loadType) => (
                        <option key={loadType} value={loadType}>
                          {formatLoadType(loadType)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={addFieldRowThree}>
                  <label style={field}>
                    <span style={fieldLabel}>Target</span>
                    <select
                      value={addDraft.targetType}
                      onChange={(event) => setAddDraft({ ...addDraft, targetType: event.target.value })}
                    >
                      <option value="reps">Reps</option>
                      <option value="time">Time</option>
                    </select>
                  </label>
                  <label style={field}>
                    <span style={fieldLabel}>Sets</span>
                    <input
                      placeholder="3"
                      inputMode="numeric"
                      value={addDraft.sets}
                      onChange={(event) => setAddDraft({ ...addDraft, sets: event.target.value })}
                    />
                  </label>
                  {addDraft.targetType === "time" ? (
                    <label style={field}>
                      <span style={fieldLabel}>Time</span>
                      <input
                        placeholder="45-90 sec"
                        value={addDraft.duration}
                        onChange={(event) => setAddDraft({ ...addDraft, duration: event.target.value })}
                      />
                    </label>
                  ) : (
                    <label style={field}>
                      <span style={fieldLabel}>Reps</span>
                      <input
                        placeholder="8-12"
                        inputMode="numeric"
                        value={addDraft.reps}
                        onChange={(event) => setAddDraft({ ...addDraft, reps: event.target.value })}
                      />
                    </label>
                  )}
                </div>
                <label style={field}>
                  <span style={fieldLabel}>Note</span>
                  <textarea
                    placeholder="Optional cue or setup note"
                    value={addDraft.note}
                    onChange={(event) => setAddDraft({ ...addDraft, note: event.target.value })}
                    style={textarea}
                  />
                </label>
                <button type="button" className="primary" onClick={addCustomDraftToWorkout} style={fullButton}>
                  Add and save exercise
                </button>
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function getLiveCoachTone(tone) {
  const color = tone === "up" ? colors.success : tone === "down" ? colors.warning : colors.brand;
  return { borderColor: tint(color, 0.3), background: tint(color, 0.08), color };
}

function createEmptyAddDraft() {
  return {
    exercise: "",
    muscleGroup: "other",
    loadType: "",
    sets: "3",
    reps: "8-12",
    targetType: "reps",
    duration: "",
    note: "",
  };
}

function prepareWorkoutLift(lift) {
  const targetType = lift?.targetType === "time" ? "time" : "reps";
  const targetValue = targetType === "time" ? lift.duration || lift.reps : lift.reps;
  const loadProfile = getLoadProfile(lift);

  return {
    id: crypto.randomUUID(),
    exercise: String(lift?.exercise || "").trim(),
    muscleGroup: lift?.muscleGroup || "other",
    loadType: loadProfile.type,
    minimumLoad: loadProfile.minimumLoad,
    sets: String(lift?.sets || "3"),
    reps: String(targetValue || ""),
    targetType,
    duration: targetType === "time" ? String(targetValue || "") : "",
    note: lift?.note || lift?.stretches || "",
    stretches: lift?.stretches || lift?.note || "",
    baseExercise: lift?.baseExercise || lift?.exercise || "",
    variations: Array.isArray(lift?.variations) ? lift.variations : [],
    addedDuringWorkout: true,
  };
}

function buildExtraWorkoutProgram(extraLifts, workouts, prMap, units) {
  return (Array.isArray(extraLifts) ? extraLifts : []).filter(Boolean).map((lift, index) => {
    const prepared = {
      ...lift,
      id: lift.id || `extra-${index}-${String(lift.exercise || "lift").replace(/[^a-z0-9]+/gi, "-")}`,
      addedDuringWorkout: true,
    };
    const baseExercise = normalizeExerciseName(prepared.baseExercise || prepared.exercise);
    const prRecord = prMap[baseExercise];

    return {
      ...prepared,
      baseExercise,
      prRecord,
      displayPR: formatPR(prRecord, units),
      coachRecommendation: buildCoachRecommendation({ ...prepared, prRecord }, workouts, units),
      userOverride: null,
    };
  });
}

function getSplitExerciseOptions(plan, selectedDay, search = "") {
  const seen = new Set();
  const query = search.trim().toLowerCase();
  return DAYS.flatMap((day) => {
    const lifts = Array.isArray(plan?.[day]) ? plan[day] : [];
    return lifts.map((lift) => ({ ...lift, sourceDay: day }));
  })
    .filter((lift) => lift.exercise)
    .filter((lift) => !query || `${lift.exercise} ${lift.sourceDay} ${lift.note || ""}`.toLowerCase().includes(query))
    .filter((lift) => {
      const key = normalizeExerciseName(lift.exercise);
      const currentDayHasLift = dayHasExercise(plan, selectedDay, key);
      if (!key || seen.has(key) || currentDayHasLift) return false;
      seen.add(key);
      return true;
    });
}

function dayHasExercise(plan, day, exerciseKey) {
  return (Array.isArray(plan?.[day]) ? plan[day] : []).some(
    (lift) => normalizeExerciseName(lift.exercise) === exerciseKey,
  );
}

// Saved sets drop the draft-only typed text; `weight` is already lb.
function getLoggedSets(sets) {
  return (Array.isArray(sets) ? sets : [])
    .filter((set) => {
      const weight = Number(set?.weight || 0);
      const reps = Number(set?.reps || 0);
      const duration = String(set?.duration || "").trim();
      return weight > 0 || reps > 0 || duration;
    })
    .map((set) => {
      const saved = { ...set };
      delete saved.weightInput;
      delete saved.weightUnits;
      return saved;
    });
}

// What a set's weight input shows: the typed text when it was typed in the current
// unit, otherwise the stored lb converted (older drafts hold only lb numbers).
function getWeightInputValue(set, units) {
  if (!set) return "";
  if (set.weightUnits === units && typeof set.weightInput === "string") return set.weightInput;
  return toInputValue(set.weight, units);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getSafeSession(value) {
  return isPlainObject(value) ? value : {};
}

function getWorkoutDrafts() {
  if (typeof window === "undefined") return {};

  try {
    const parsed = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveWorkoutDrafts(drafts) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
}

function saveWorkoutRecap(recap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECAP_KEY, JSON.stringify(recap));
}

function getLastWorkoutDay() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(LAST_DAY_KEY) || "";
}

function saveLastWorkoutDay(day) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_DAY_KEY, day);
}

function getRequestedDay(value) {
  const day = Array.isArray(value) ? value[0] : value;
  return DAYS.includes(day) ? day : "";
}

function getDayAccent(day, plan) {
  return plan.__meta?.[day]?.recovery ? dayColors.recovery : dayColors[day] || colors.brand;
}

function formatRestTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function formatWarmupMovement(movement) {
  if (movement.mode === "time") return formatText(movement.time, "Timed");
  const sets = formatText(movement.sets, "--");
  const reps = formatText(movement.reps, "--");
  return `${sets} x ${reps}`;
}

function formatWorkoutTarget(lift) {
  const sets = formatText(lift?.sets, "--");
  if (lift?.targetType === "time") return `${sets} sets x ${formatText(lift.duration || lift.reps, "--")}`;
  return `${sets} sets x ${formatText(lift?.reps, "--")} reps`;
}

function formatLoadType(type) {
  return String(type || "free").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatText(value, fallback = "") {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value))
    return (
      value
        .map((item) => formatText(item, ""))
        .filter(Boolean)
        .join(", ") || fallback
    );
  if (typeof value === "object") {
    if ("sets" in value || "reps" in value)
      return (
        [value.sets, value.reps]
          .filter(Boolean)
          .map((item) => formatText(item, ""))
          .join(" x ") || fallback
      );
    if ("label" in value) return formatText(value.label, fallback);
    if ("name" in value) return formatText(value.name, fallback);
  }
  return fallback;
}

function getVariationOptions(lift) {
  const configured = Array.isArray(lift.variations) ? lift.variations.filter(Boolean) : [];
  const name = String(lift.exercise || "").toLowerCase();
  const options = [...configured];
  if (name.includes("squat")) {
    options.push("Back Squat", "Front Squat", "Hack Squat", "Goblet Squat");
  }
  if (name.includes("bench")) {
    options.push("Bench Press", "Dumbbell Bench Press", "Incline Dumbbell Press", "Close-Grip Bench");
  }
  if (name.includes("deadlift")) {
    options.push("Conventional Deadlift", "Romanian Deadlift", "Sumo Deadlift", "Trap Bar Deadlift");
  }
  if (name.includes("overhead press") || name.includes("shoulder press")) {
    options.push(
      "Standing Overhead Press",
      "Seated Shoulder Press",
      "Dumbbell Shoulder Press",
      "Machine Shoulder Press",
    );
  }
  if (name.includes("lateral raise")) {
    options.push("Dumbbell Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise");
  }
  if (name.includes("pulldown")) {
    options.push("Lat Pulldown", "Neutral-Grip Pulldown", "Single-Arm Pulldown");
  }
  if (name.includes("row")) {
    options.push("Chest-Supported Row", "Cable Row", "Dumbbell Row", "Machine Row");
  }
  if (name.includes("curl")) {
    options.push("EZ-Bar Curl", "Dumbbell Curl", "Cable Curl");
  }
  return Array.from(new Set(options.filter((option) => option && option !== lift.exercise)));
}

function normalizeVariationDraft(value) {
  if (!value) return { open: false, value: "", custom: "" };
  if (typeof value === "string") return { open: false, value, custom: "" };
  return {
    open: Boolean(value.open),
    value: value.value || "",
    custom: value.custom || "",
  };
}

function getSelectedVariation(draft) {
  const normalized = normalizeVariationDraft(draft);
  return normalized.custom.trim() || normalized.value || "";
}

function getPerformedExercise(lift, draft) {
  return getSelectedVariation(draft) || lift.exercise;
}

const wrap = {
  maxWidth: 760,
  margin: "0 auto",
  display: "grid",
  gap: 16,
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: 12,
  padding: "8px 0 0",
};

const title = {
  ...type.pageTitle,
  marginTop: 6,
  overflowWrap: "anywhere",
};

const addWorkoutBtn = {
  flex: "0 0 auto",
  minHeight: 36,
  padding: "8px 12px",
  fontSize: 13,
};

const dayRow = {
  display: "flex",
  overflowX: "auto",
  gap: 6,
  margin: "-4px 0 0",
  paddingBottom: 2,
};

const dayBtn = {
  flex: "0 0 auto",
  minWidth: 52,
  minHeight: 34,
  padding: "6px 12px",
  borderRadius: radii.pill,
  background: colors.surfaceRaised,
  color: colors.muted,
  borderColor: colors.border,
  fontSize: 13,
  fontWeight: 500,
};

const card = {
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  padding: 16,
};

const selectedChip = {
  background: tint(colors.brand, 0.14),
  color: colors.brand,
  borderColor: tint(colors.brand, 0.4),
};

const empty = {
  display: "grid",
  justifyItems: "center",
  gap: 14,
  padding: "28px 16px",
  color: colors.muted,
  textAlign: "center",
};

const emptyActions = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: 8,
};

const recoveryTitle = {
  ...type.pageTitle,
  fontSize: 22,
  margin: "6px 0 4px",
};

const recoveryMeta = {
  ...type.body,
  margin: 0,
  color: colors.textSoft,
};

const recoveryNotes = {
  ...type.meta,
  margin: "10px 0 0",
};

const list = {
  display: "grid",
  gap: 12,
};

const emphasisTitle = {
  ...type.sectionTitle,
  marginTop: 6,
};

const emphasisText = {
  ...type.body,
  margin: "6px 0 0",
};

const warmupHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  marginBottom: 6,
};

const warmupCount = {
  ...type.meta,
  ...type.number,
};

const warmupList = {
  display: "grid",
};

const warmupRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  border: 0,
  borderTop: `1px solid ${colors.borderSoft}`,
  borderRadius: 0,
  background: "transparent",
  padding: "10px 0",
  textAlign: "left",
  fontWeight: 400,
};

const warmupRowDone = {
  opacity: 0.55,
};

const checkBox = {
  width: 22,
  height: 22,
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  color: colors.inverse,
  background: colors.surfaceSoft,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
  fontSize: 13,
  fontWeight: 700,
};

const checkBoxDone = {
  background: colors.brand,
  borderColor: colors.brand,
};

const warmupMain = {
  display: "grid",
  gap: 2,
  flex: "1 1 auto",
  minWidth: 0,
};

const warmupName = {
  color: colors.text,
  fontSize: 14,
  fontWeight: 550,
};

const warmupNote = {
  ...type.meta,
};

const warmupDose = {
  ...type.meta,
  ...type.number,
  color: colors.textSoft,
  whiteSpace: "nowrap",
};

const timerCard = {
  ...card,
  padding: "10px 12px 10px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const timerReadout = {
  display: "flex",
  alignItems: "baseline",
  gap: 10,
};

const timerLabel = {
  ...type.meta,
  fontWeight: 500,
};

const timerValue = {
  ...type.number,
  ...type.tabular,
  minWidth: "3.2em",
  fontSize: 24,
  fontWeight: 650,
  lineHeight: 1,
};

const timerActions = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
};

const timerPresets = {
  display: "flex",
  gap: 4,
};

const timerChip = {
  ...type.number,
  minHeight: 34,
  padding: "6px 10px",
  borderRadius: radii.pill,
  background: colors.surfaceRaised,
  color: colors.muted,
  borderColor: colors.border,
  fontSize: 13,
  fontWeight: 500,
};

const activeTimerChip = selectedChip;

const timerStart = {
  minHeight: 34,
  padding: "6px 14px",
  fontSize: 13,
};

const timerReset = {
  minHeight: 34,
  padding: "6px 10px",
  fontSize: 13,
};

const liftCard = {
  ...card,
  display: "grid",
  gap: 12,
};

const liftHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const liftHeaderActions = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 6,
  flex: "0 0 auto",
};

const liftTitle = {
  ...type.sectionTitle,
  fontSize: 18,
  overflowWrap: "anywhere",
};

const liftMeta = {
  ...type.meta,
  ...type.number,
  margin: "3px 0 0",
};

const prBadge = {
  ...type.number,
  display: "inline-block",
  marginTop: 8,
  padding: "3px 8px",
  borderRadius: radii.pill,
  background: tint(colors.accent, 0.12),
  color: colors.accent,
  fontSize: 12,
  fontWeight: 500,
  whiteSpace: "nowrap",
};

const smallBtn = {
  minHeight: 34,
  padding: "6px 12px",
  fontSize: 13,
};

const wellLabel = {
  display: "block",
  color: colors.muted,
  fontSize: 12,
  fontWeight: 500,
};

const coachCard = {
  border: `1px solid ${tint(colors.brand, 0.2)}`,
  borderRadius: radii.lg,
  background: tint(colors.brand, 0.06),
  padding: 12,
  display: "grid",
  gap: 8,
};

const coachToggle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  textAlign: "left",
  border: 0,
  borderRadius: 0,
  background: "transparent",
  padding: 0,
  color: "inherit",
  fontWeight: 400,
};

const coachLabel = {
  display: "block",
  color: colors.brand,
  fontSize: 12,
  fontWeight: 600,
};

const coachTitle = {
  ...type.number,
  display: "block",
  marginTop: 2,
  color: colors.text,
  fontSize: 20,
  fontWeight: 650,
  lineHeight: 1.25,
};

const coachBadge = {
  flex: "0 0 auto",
  color: colors.brand,
  fontSize: 13,
  fontWeight: 500,
  whiteSpace: "nowrap",
  paddingTop: 2,
};

const coachDetail = {
  ...type.body,
  margin: 0,
  fontSize: 13,
  lineHeight: 1.45,
};

const coachWarmupBlock = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

const coachWarmups = {
  display: "flex",
  flexWrap: "nowrap",
  gap: 6,
  overflowX: "auto",
  paddingBottom: 2,
};

const coachWarmupChip = {
  ...type.number,
  minHeight: 34,
  padding: "6px 10px",
  borderRadius: radii.pill,
  background: colors.surfaceRaised,
  color: colors.textSoft,
  borderColor: colors.border,
  fontSize: 13,
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flex: "0 0 auto",
};

const miniCheckBox = {
  width: 14,
  height: 14,
  border: "1px solid currentColor",
  borderRadius: 4,
  color: "inherit",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  lineHeight: 1,
  opacity: 0.7,
};

const miniCheckBoxDone = {
  opacity: 1,
};

const coachContextNote = {
  ...type.meta,
  margin: 0,
  fontSize: 12,
};

const coachPlanRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 4,
  columnGap: 12,
  flexWrap: "wrap",
  paddingTop: 8,
  borderTop: `1px solid ${tint(colors.brand, 0.14)}`,
};

const coachPlan = {
  ...type.meta,
  ...type.number,
};

const coachAction = {
  ...type.number,
  color: colors.text,
  fontSize: 14,
  fontWeight: 600,
};

const liveCoachBox = {
  border: "1px solid",
  borderRadius: radii.md,
  padding: "8px 10px",
  display: "grid",
  gap: 2,
};

const liveCoachLabel = {
  ...type.number,
  fontSize: 14,
  fontWeight: 600,
};

const liveCoachDetail = {
  ...type.number,
  color: colors.textSoft,
  fontSize: 13,
  lineHeight: 1.4,
};

const noteBox = {
  border: `1px solid ${colors.borderSoft}`,
  borderRadius: radii.lg,
  background: colors.surfaceSoft,
  padding: "10px 12px",
};

const noteText = {
  ...type.body,
  margin: "4px 0 0",
  fontSize: 13,
};

const variationPanel = {
  display: "grid",
  gap: 8,
  border: `1px solid ${colors.borderSoft}`,
  borderRadius: radii.lg,
  background: colors.surfaceSoft,
  padding: 12,
};

const variationChips = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const variationChip = {
  minHeight: 34,
  padding: "6px 12px",
  borderRadius: radii.pill,
  background: colors.surfaceRaised,
  color: colors.textSoft,
  borderColor: colors.border,
  fontSize: 13,
  fontWeight: 500,
};

const workingSetHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 10,
  paddingTop: 12,
  borderTop: `1px solid ${colors.borderSoft}`,
};

const workingSetLabel = {
  color: colors.text,
  fontSize: 14,
  fontWeight: 600,
};

const workingSetMeta = {
  color: colors.muted,
  fontSize: 12,
  textAlign: "right",
};

const setGrid = {
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr) minmax(0, 1fr) 34px",
  alignItems: "center",
  gap: 8,
};

const setColumns = {
  ...setGrid,
  marginBottom: -6,
  textAlign: "center",
  color: colors.muted,
  fontSize: 12,
  fontWeight: 500,
};

const setList = {
  display: "grid",
  gap: 8,
};

const setRow = setGrid;

const setNumber = {
  ...type.number,
  color: colors.muted,
  fontSize: 15,
  fontWeight: 600,
  textAlign: "center",
};

const setInput = {
  ...type.number,
  minHeight: 46,
  fontSize: 18,
  fontWeight: 600,
  textAlign: "center",
};

const removeSetBtn = {
  width: 34,
  height: 34,
  padding: 0,
};

const addSetBtn = {
  width: "100%",
  minHeight: 40,
  padding: "8px 12px",
  fontSize: 14,
};

const finishBtn = {
  width: "100%",
  padding: "14px 16px",
  fontSize: 16,
};

const finishNote = {
  ...type.body,
  color: colors.warning,
  margin: "10px 0 0",
  textAlign: "center",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 230,
  background: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalPanel = {
  width: "min(480px, 100%)",
  maxHeight: "88vh",
  overflow: "auto",
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)",
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  padding: "18px 18px 0",
};

const modalTitle = {
  ...type.pageTitle,
  fontSize: 22,
  marginTop: 4,
};

const closeBtn = {
  flex: "0 0 auto",
  width: 34,
  height: 34,
  padding: 0,
};

const modalBody = {
  display: "grid",
  gap: 18,
  padding: 18,
};

const addSection = {
  display: "grid",
  gap: 10,
};

const addSectionDivider = {
  paddingTop: 18,
  borderTop: `1px solid ${colors.borderSoft}`,
};

const addSectionTitle = {
  ...type.sectionTitle,
  fontSize: 15,
};

const emptyMini = {
  ...type.meta,
  margin: 0,
  padding: "10px 12px",
  borderRadius: radii.lg,
  background: colors.surfaceSoft,
  border: `1px solid ${colors.borderSoft}`,
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

const addFieldRow = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const addFieldRowThree = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const libraryList = {
  display: "grid",
  maxHeight: 240,
  overflow: "auto",
  border: `1px solid ${colors.borderSoft}`,
  borderRadius: radii.lg,
  background: colors.surfaceSoft,
};

const libraryItem = {
  width: "100%",
  border: 0,
  borderTop: `1px solid ${colors.borderSoft}`,
  borderRadius: 0,
  background: "transparent",
  padding: "10px 12px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  textAlign: "left",
  fontWeight: 400,
};

const libraryText = {
  display: "grid",
  gap: 2,
  minWidth: 0,
};

const libraryName = {
  color: colors.text,
  fontSize: 14,
  fontWeight: 550,
};

const libraryMeta = {
  ...type.meta,
  ...type.number,
  fontSize: 12,
};

const libraryAdd = {
  color: colors.brand,
  fontSize: 13,
  fontWeight: 600,
  flex: "0 0 auto",
};

const textarea = {
  minHeight: 76,
  resize: "vertical",
};

const fullButton = {
  width: "100%",
  padding: "12px 16px",
};
