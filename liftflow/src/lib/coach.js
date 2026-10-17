import { getWorkouts } from "./workoutStorage";
import { getBaseExercise, getLiftSets, getWorkoutItems, normalizeExerciseName } from "./workoutAnalytics";
import {
  decreaseLoad,
  getLoadGrid,
  getLoadProfile,
  getProgressionStep,
  getUnitLoads,
  gridNearest,
  increaseLoad,
  roundWeight,
  toCoachWeight,
} from "./loadProfiles";
import { displayNumber, getUnits, normalizeUnits, unitLabel } from "./units";

// The coach works natively in the display unit: history (stored in lb) is converted
// at the input with toCoachWeight, and every number it returns (workingWeight,
// warmups, latestTopWeight, minimumLoad, increment, jump) and all advice text are in
// `units`. The result carries `units` so callers know what the numbers mean.
export function buildCoachRecommendation(lift, workouts = getWorkouts(), units = getUnits()) {
  units = normalizeUnits(units);
  const label = unitLabel(units);
  if (lift?.targetType === "time") {
    return {
      status: "timed",
      headline: lift.duration || lift.reps || "Timed",
      detail: "Timed exercises are tracked by duration, so the coach will not force rep-based load jumps.",
      warmups: [],
      workingWeight: null,
      workingSetPlan: "Hold clean position for the programmed time.",
      nextAction: `${lift.sets || "--"} sets x ${lift.duration || lift.reps || "--"}.`,
    };
  }

  const baseExercise = getBaseExercise(lift);
  const loadProfile = { ...getLoadProfile(lift, units), units };
  const history = collectLiftHistory(workouts, baseExercise, loadProfile.type === "bodyweight", units);
  const target = parseRepTarget(lift.reps);
  const increment = getProgressionStep(loadProfile.type, units);
  const minimumLoad = loadProfile.minimumLoad;

  if (history.length === 0) {
    const prWeight = toCoachWeight(lift?.prRecord?.weight, units);
    if (prWeight > 0) {
      const estimatedWeight = estimateFromPR(prWeight, target, loadProfile);
      // The text quotes the PR as the PR badge shows it (180 lb reads 81.65 kg, not the
      // snapped 82.5 kg). A record from logged sets the coach cannot grade (no reps) is
      // not a manual PR.
      const prSource = lift.prRecord.source === "history" ? "logged best" : "manual PR";
      return {
        status: "estimated",
        headline: `${estimatedWeight} ${label}`,
        detail: `Estimated from your ${prSource} of ${displayNumber(lift.prRecord.weight, units)} ${label}. Start here only if warmups feel clean.`,
        warmups: buildWarmupRamp(estimatedWeight, target, loadProfile),
        warmupLabel: "Optional ramp",
        workingWeight: estimatedWeight,
        latestTopWeight: prWeight,
        target,
        increment,
        minimumLoad,
        loadType: loadProfile.type,
        units,
        confidence: "medium",
        contextNotes: [
          lift.prRecord.source === "history"
            ? "No logged sets with reps for this lift yet, so this uses your best logged weight as the anchor."
            : "No logged sets for this lift yet, so this uses your PR tab as the anchor.",
        ],
        workingSetPlan: "Use flat sets. Adjust down if bar speed or form drops early.",
        nextAction: buildNextAction(estimatedWeight, lift, label),
      };
    }

    return {
      status: "empty",
      headline: "Set starting weight",
      detail: "Log this lift once and coach recommendations will use your history.",
      warmups: [],
      workingWeight: null,
      units,
      workingSetPlan: "Flat sets by default.",
      nextAction: "Choose a weight you can control for the programmed reps.",
    };
  }

  const latest = history[0];
  const latestSets = latest.sets;
  const latestTopWeight = Math.max(...latestSets.map((set) => Number(set.weight || 0)), 0);
  const context = buildHistoryContext(latest, target);
  const setCount = parseSetCount(lift.sets);
  const grade = gradeLatestSession(latestSets, latestTopWeight, target, setCount);

  if (!latestTopWeight) {
    return buildBodyweightRecommendation(lift, grade, target, increment, context, loadProfile);
  }

  const plannedJump = getRecommendedJump(latestTopWeight, grade, increment, context, target, loadProfile);
  const workingWeight = recommendWorkingWeight(latestTopWeight, grade, increment, context, loadProfile, plannedJump);
  const direction = workingWeight > latestTopWeight ? "increase" : workingWeight < latestTopWeight ? "reduce" : "hold";
  // The actual change after snapping to a loadable weight, which is what the text reports.
  const jump = direction === "increase" ? roundWeight(workingWeight - latestTopWeight) : 0;

  return {
    status: "ready",
    headline: `${workingWeight} ${label}`,
    detail: buildDetail(direction, latestTopWeight, workingWeight, grade, target, context, minimumLoad, label),
    warmups: buildWarmupRamp(workingWeight, target, loadProfile),
    warmupLabel: "Ramp-up sets",
    workingWeight,
    latestTopWeight,
    target,
    grade,
    increment,
    jump,
    minimumLoad,
    loadType: loadProfile.type,
    units,
    confidence: context.confidence,
    contextNotes: context.notes,
    workingSetPlan: "Flat sets by default. Adjust only if reps fall off or it is clearly too light.",
    nextAction: buildNextAction(workingWeight, lift, label),
  };
}

// `loggedSets` are stored sets (weights in lb). `coach` is a buildCoachRecommendation
// result; its numbers are in coach.units, which this uses unless `units` is given.
export function buildLiveSetRecommendation(lift, loggedSets, coach, units = coach?.units || getUnits()) {
  if (lift?.targetType === "time") return null;
  units = normalizeUnits(units);
  const label = unitLabel(units);
  const sets = getLiftSets({ sets: loggedSets });
  if (!coach?.workingWeight || sets.length === 0) return null;
  // A coach built in another unit would mix numbers; ignore its unit-bound values then.
  const sameUnits = normalizeUnits(coach.units || "lbs") === units;

  const target = coach.target || parseRepTarget(lift.reps);
  const liftProfile = getLoadProfile(lift, units);
  const loadProfile = {
    type: coach.loadType || liftProfile.type,
    minimumLoad: (sameUnits && coach.minimumLoad) || liftProfile.minimumLoad,
  };
  const increment = (sameUnits && coach.increment) || getProgressionStep(loadProfile.type, units);
  const minimumLoad = loadProfile.minimumLoad;
  const grid = getLoadGrid(loadProfile, units);
  const last = sets[sets.length - 1];
  const lastWeight = toCoachWeight(last.weight, units);
  const lastReps = Number(last.reps || 0);

  if (!lastWeight || !lastReps) return null;

  // Compare against the PR record in stored lb, exactly as Finish detects PRs: the
  // display values are snapped for weights logged in the other unit (a 190 lb record
  // reads 85 kg), so comparing those would announce 86 kg (189.6 lb) as a PR. The
  // record already applies the manual-PR override; without one, fall back to the
  // coach's last top weight.
  const prLb = Number(lift?.prRecord?.weight || 0);
  const isNewPr =
    prLb > 0
      ? Number(last.weight || 0) > prLb + 1e-9
      : sameUnits && Number(coach.latestTopWeight || 0) > 0 && lastWeight > Number(coach.latestTopWeight);
  if (isNewPr) {
    return {
      label: `New PR: ${displayNumber(last.weight, units)} ${label}`,
      detail: "You moved more weight than your previous best. Rest longer before deciding whether to repeat it.",
      tone: "up",
    };
  }

  if (lastReps > target.max) {
    return {
      label: `Next set: ${increaseLoad(lastWeight, increment, grid)} ${label}`,
      detail: `You exceeded the target range at ${lastWeight} ${label}.`,
      tone: "up",
    };
  }

  if (lastReps < target.min) {
    return {
      label: `Next set: ${decreaseLoad(lastWeight, increment, minimumLoad, grid)} ${label}`,
      detail: `You missed the low end of the range. Reduce slightly or rest longer.`,
      tone: "down",
    };
  }

  return {
    label: `Next set: stay at ${lastWeight} ${label}`,
    detail:
      lastReps === target.max
        ? "You hit the top of the range. Hold this weight for the workout; progress next time if the sets stay strong."
        : "You are inside the target range.",
    tone: "hold",
  };
}

function collectLiftHistory(workouts, baseExercise, allowRepsOnly = false, units = "lbs") {
  const targetExercise = normalizeExerciseName(baseExercise);
  return (Array.isArray(workouts) ? workouts : [])
    .slice()
    .reverse()
    .flatMap((session) => {
      const date = session?.date || null;
      return getWorkoutItems(session)
        .filter((lift) => getBaseExercise(lift) === targetExercise)
        .map((lift) => ({
          date,
          target: parseRepTarget(lift.reps || lift.plannedReps),
          targetLabel: lift.reps || lift.plannedReps || "",
          variation: getVariationNote(lift),
          sets: getCoachSets(lift, allowRepsOnly, units),
        }));
    })
    .filter((entry) => entry.sets.length > 0)
    .slice(0, 6);
}

// Logged sets the coach can grade. Weighted sets always win; a bodyweight lift
// logged with reps only (no added load) is graded on reps instead.
// Weights come back in `units` (see toCoachWeight).
function getCoachSets(lift, allowRepsOnly, units) {
  const repSets = getLiftSets(lift)
    .filter((set) => Number(set.reps || 0) > 0)
    .map((set) => ({ ...set, weight: toCoachWeight(set.weight, units) }));
  const weightedSets = repSets.filter((set) => Number(set.weight || 0) > 0);
  if (weightedSets.length > 0 || !allowRepsOnly) return weightedSets;
  return repSets.map((set) => ({ ...set, weight: 0 }));
}

// Swapped lifts are saved with a "Planned: X" marker. That records what the plan
// called for, not a variation of the performed lift, so it should not lower confidence.
function getVariationNote(lift) {
  const variation = String(lift.variation || "").trim();
  if (!variation || /^planned:/i.test(variation)) return "";
  return variation;
}

// Holds repeat the exact logged weight (it was just lifted, so it is loadable); a
// weight logged in the other unit was already snapped by toCoachWeight.
// Increases and decreases land on the load type's grid of loadable weights:
// 17.5 lb dumbbells pass -> 20, 102.5 lb bench +10 -> 110, 17.5 lb miss -> 15;
// in kg: 101.25 kg bench +5 -> 105, 9 kg dumbbell miss -> 7.5.
function recommendWorkingWeight(latestWeight, grade, increment, context, loadProfile, jump) {
  if (!latestWeight) return null;
  if (context.confidence !== "high") return latestWeight;
  const grid = getLoadGrid(loadProfile, loadProfile.units);
  if ((grade.result === "strong-pass" || grade.result === "pass") && jump > 0)
    return increaseLoad(latestWeight, jump, grid);
  // A miss never recommends more than the weight that was just missed, even if the
  // configured minimum load is above it.
  if (grade.result === "miss") return decreaseLoad(latestWeight, increment, loadProfile.minimumLoad, grid);
  return latestWeight;
}

function buildBodyweightRecommendation(lift, grade, target, increment, context, loadProfile) {
  const confident = context.confidence === "high";
  const label = unitLabel(loadProfile.units);
  const setSummary = `${grade.completedTopSets}/${grade.requiredSets} sets, lowest ${grade.lowestRep || "--"} reps`;
  const estimate = confident ? "" : " Treat this as an estimate.";
  const base = {
    status: "ready",
    warmups: [],
    warmupLabel: "Ramp-up sets",
    workingWeight: null,
    latestTopWeight: 0,
    target,
    grade,
    increment,
    jump: 0,
    minimumLoad: loadProfile.minimumLoad,
    loadType: loadProfile.type,
    units: loadProfile.units,
    confidence: context.confidence,
    contextNotes: context.notes,
    workingSetPlan: "Flat sets at bodyweight. Add reps before adding load.",
  };

  if (confident && grade.result === "strong-pass") {
    const added = increaseLoad(0, increment, getLoadGrid({ ...loadProfile, type: "bodyweight" }, loadProfile.units));
    return {
      ...base,
      headline: `Add ${added} ${label}`,
      detail: `Last time: ${setSummary} at bodyweight against ${target.min}-${target.max}. Every set reached the top of the range, so add ${added} ${label} (belt or held dumbbell) and rebuild reps.`,
      workingWeight: added,
      jump: added,
      nextAction: `${lift.sets} x ${lift.reps} with about ${added} ${label} added.`,
    };
  }

  if (confident && grade.result === "pass") {
    const goal = Math.min(target.max, grade.lowestRep + 1);
    return {
      ...base,
      headline: `Bodyweight × ${goal}`,
      detail: `Last time: ${setSummary} at bodyweight against ${target.min}-${target.max}. Add a rep: aim for ${goal} on every set before adding load.`,
      nextAction: `${lift.sets} x ${goal} reps at bodyweight.`,
    };
  }

  if (grade.result === "miss") {
    return {
      ...base,
      headline: `Bodyweight × ${target.min}`,
      detail: `Last time: ${setSummary} at bodyweight, below the ${target.min}-${target.max} target. Rebuild to ${target.min} reps on every set; use assistance if reps fall off early.${estimate}`,
      nextAction: `${lift.sets} x ${target.min} reps at bodyweight.`,
    };
  }

  const goal = Math.min(target.max, Math.max(target.min, grade.lowestRep));
  return {
    ...base,
    headline: `Bodyweight × ${goal}`,
    detail: `Last time: ${setSummary} at bodyweight against ${target.min}-${target.max}. ${
      grade.result === "hold" ? "Hold until every set is clean." : "Repeat these reps before progressing."
    }${estimate}`,
    nextAction: `${lift.sets} x ${goal} reps at bodyweight.`,
  };
}

function buildWarmupRamp(workingWeight, target, loadProfile) {
  const RAMP_THRESHOLDS = getUnitLoads(loadProfile.units).rampThresholds;
  if (!workingWeight || workingWeight < RAMP_THRESHOLDS.minWorking) return [];

  const ramp = [];
  const barbellRamp = loadProfile.type === "barbell" && workingWeight >= RAMP_THRESHOLDS.barbellStart;

  if (barbellRamp) {
    ramp.push({ weight: loadProfile.minimumLoad, reps: "8-10" });
  } else {
    ramp.push({ weight: rampWeight(workingWeight, loadProfile, 0.5), reps: "8-10" });
  }

  if (workingWeight >= RAMP_THRESHOLDS.secondSet) {
    ramp.push({
      weight: rampWeight(workingWeight, loadProfile, barbellRamp ? 0.6 : 0.7),
      reps: target.max <= 5 ? 3 : 5,
    });
  }

  if (workingWeight >= RAMP_THRESHOLDS.heavySet || target.max <= 5) {
    ramp.push({ weight: rampWeight(workingWeight, loadProfile, 0.85), reps: "2-3" });
  }

  return dedupeWarmups(ramp.filter((set) => set.weight < workingWeight));
}

function rampWeight(workingWeight, loadProfile, percent) {
  return Math.max(
    loadProfile.minimumLoad,
    gridNearest(workingWeight * percent, getLoadGrid(loadProfile, loadProfile.units)),
  );
}

function dedupeWarmups(sets) {
  const seen = new Set();
  return sets.filter((set) => {
    if (seen.has(set.weight)) return false;
    seen.add(set.weight);
    return true;
  });
}

function parseRepTarget(reps) {
  const numbers =
    String(reps || "")
      .match(/\d+/g)
      ?.map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0) || [];

  if (numbers.length === 0) return { min: 1, max: 1 };
  return { min: Math.min(...numbers), max: Math.max(...numbers) };
}

function parseSetCount(sets) {
  const numbers =
    String(sets || "")
      .match(/\d+/g)
      ?.map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0) || [];
  return numbers[0] || 0;
}

function gradeLatestSession(sets, latestWeight, target, setCount) {
  const latestSets = sets.filter((set) => Number(set.weight || 0) === latestWeight);
  // Grade the working sets at the top weight; lighter warm-up or back-off sets logged alongside
  // them don't count for or against progression.
  const evaluatedSets = setCount > 0 ? latestSets.slice(0, setCount) : latestSets;
  const fullSetCount = setCount === 0 || evaluatedSets.length >= setCount;
  const allAtTopWeight = evaluatedSets.length > 0;
  const reps = latestSets.map((set) => Number(set.reps || 0));
  const evaluatedReps = evaluatedSets.map((set) => Number(set.reps || 0));
  const avgReps = reps.length ? round1(reps.reduce((sum, value) => sum + value, 0) / reps.length) : 0;
  const lowestRep = reps.length ? Math.min(...reps) : 0;
  const lowestEvaluatedRep = evaluatedReps.length ? Math.min(...evaluatedReps) : 0;
  const completedTopSets = latestSets.length;
  const requiredSets = setCount || completedTopSets;

  if (!fullSetCount || !allAtTopWeight || lowestEvaluatedRep < target.min) {
    return {
      result: lowestEvaluatedRep && lowestEvaluatedRep < target.min ? "miss" : "hold",
      completedTopSets,
      requiredSets,
      avgReps,
      lowestRep: lowestEvaluatedRep || lowestRep,
    };
  }

  if (lowestRep >= target.max) {
    return { result: "strong-pass", completedTopSets, requiredSets, avgReps, lowestRep };
  }

  return { result: "pass", completedTopSets, requiredSets, avgReps, lowestRep };
}

function getRecommendedJump(latestWeight, grade, increment, context, target, loadProfile) {
  if (context.confidence !== "high") return 0;
  if (!["pass", "strong-pass"].includes(grade.result)) return 0;
  if (latestWeight < loadProfile.minimumLoad) return 0;

  const loads = getUnitLoads(loadProfile.units);
  const baseJump =
    loadProfile.type === "barbell" && latestWeight >= loads.heavyBarbellThreshold ? loads.heavyBarbellJump : increment;
  if (grade.result === "strong-pass") return baseJump;
  if (grade.lowestRep >= target.max) return increment;
  return latestWeight >= loads.lightLoadThreshold ? increment : 0;
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function buildHistoryContext(latest, currentTarget) {
  const notes = [];
  let confidence = "high";

  if (latest.targetLabel && !sameRepTarget(latest.target, currentTarget)) {
    confidence = "medium";
    notes.push(`Last log used ${latest.targetLabel}, so this is a rep-range estimate.`);
  }

  if (latest.variation) {
    confidence = "medium";
    notes.push(`Last log was ${latest.variation}, so compare the load loosely.`);
  }

  return { confidence, notes };
}

function sameRepTarget(a, b) {
  return Number(a?.min || 0) === Number(b?.min || 0) && Number(a?.max || 0) === Number(b?.max || 0);
}

function estimateFromPR(prWeight, target, loadProfile) {
  const repFactor = target.max <= 5 ? 0.86 : target.max <= 8 ? 0.78 : target.max <= 12 ? 0.7 : 0.62;
  return Math.max(
    loadProfile.minimumLoad,
    gridNearest(prWeight * repFactor, getLoadGrid(loadProfile, loadProfile.units)),
  );
}

function buildDetail(direction, latestWeight, workingWeight, grade, target, context, minimumLoad, label) {
  const confidence = context.confidence === "high" ? "" : " Treat this as an estimate.";
  const setSummary = `${grade.completedTopSets}/${grade.requiredSets} top sets, lowest ${grade.lowestRep || "--"} reps`;
  if (direction === "increase")
    return `Last time: ${setSummary} at ${latestWeight} ${label} against ${target.min}-${target.max}. Add ${roundWeight(workingWeight - latestWeight)} ${label} (to ${workingWeight} ${label}) because the programmed work was completed cleanly.${confidence}`;
  if (direction === "reduce")
    return `Last time: ${setSummary} at ${latestWeight} ${label}, below the ${target.min}-${target.max} target. Drop ${roundWeight(latestWeight - workingWeight)} ${label} to ${workingWeight} ${label} and rebuild.${confidence}`;
  return `Last time: ${setSummary} at ${latestWeight} ${label} against ${target.min}-${target.max}. ${getHoldReason(latestWeight, grade, target, context, minimumLoad, label)}${confidence}`;
}

function getHoldReason(latestWeight, grade, target, context, minimumLoad, label) {
  if (context.confidence !== "high") return "Repeat this load to re-check it before progressing.";
  if (grade.result === "miss") return `Already at the ${minimumLoad} ${label} minimum, so hold and rebuild reps.`;
  if (grade.result === "hold") return "Hold until every set is clean.";
  if (latestWeight < minimumLoad)
    return `Every set was clean, but ${latestWeight} ${label} is under this lift's ${minimumLoad} ${label} minimum load. Check the equipment type before adding weight.`;
  // Light lifts (under 50 lb / 22.5 kg) progress reps first: a fixed jump is a big relative increase.
  return `All sets clean. Build every set to ${target.max} reps before adding weight.`;
}

function buildNextAction(workingWeight, lift, label) {
  if (!workingWeight) return "Pick a controlled starting weight.";
  return `${lift.sets} x ${lift.reps} at about ${workingWeight} ${label}.`;
}
