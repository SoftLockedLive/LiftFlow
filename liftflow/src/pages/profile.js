import { useEffect, useState } from "react";
import Card from "../components/Card";
import {
  getProfile,
  saveProfile,
  calculateTotal,
  calculateLeanMass,
} from "../lib/profile";

export default function Profile() {
  const [profile, setProfile] = useState({});

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  function update(field, value) {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function save() {
    saveProfile(profile);
    alert("Profile saved!");
  }

  const total = calculateTotal(profile);
  const leanMass = calculateLeanMass(profile);

  const weightChange =
    Number(profile.weight || 0) -
    Number(profile.startWeight || 0);

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 700,
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginBottom: 20 }}>
        Profile
      </h1>

      {/* PERSONAL */}
      <Card>
        <h3>Personal</h3>

        <input
          placeholder="Name"
          value={profile.name || ""}
          onChange={(e) =>
            update("name", e.target.value)
          }
        />

        <br /><br />

        <input
          placeholder="Age"
          type="number"
          value={profile.age || ""}
          onChange={(e) =>
            update("age", e.target.value)
          }
        />

        <br /><br />

        <input
          placeholder="Sex"
          value={profile.sex || ""}
          onChange={(e) =>
            update("sex", e.target.value)
          }
        />
      </Card>

      {/* BODY */}
      <Card>
        <h3>Body Metrics</h3>

        <input
          placeholder="Height"
          value={profile.height || ""}
          onChange={(e) =>
            update("height", e.target.value)
          }
        />

        <br /><br />

        <input
          placeholder="Weight"
          type="number"
          value={profile.weight || ""}
          onChange={(e) =>
            update("weight", e.target.value)
          }
        />

        <br /><br />

        <input
          placeholder="Body Fat %"
          type="number"
          value={profile.bodyFat || ""}
          onChange={(e) =>
            update("bodyFat", e.target.value)
          }
        />
      </Card>

      {/* PRs */}
      <Card>
        <h3>Current Big 3 PRs</h3>

        <input
          placeholder="Bench"
          type="number"
          value={profile.benchPR || ""}
          onChange={(e) =>
            update("benchPR", e.target.value)
          }
        />

        <br /><br />

        <input
          placeholder="Squat"
          type="number"
          value={profile.squatPR || ""}
          onChange={(e) =>
            update("squatPR", e.target.value)
          }
        />

        <br /><br />

        <input
          placeholder="Deadlift"
          type="number"
          value={profile.deadliftPR || ""}
          onChange={(e) =>
            update("deadliftPR", e.target.value)
          }
        />
      </Card>

      {/* STATS */}
      <Card>
        <h3>Statistics</h3>

        <p>
          Total: <b>{total} lbs</b>
        </p>

        <p>
          Lean Body Mass:{" "}
          <b>{leanMass} lbs</b>
        </p>

        <p>
          Weight Change:{" "}
          <b>
            {weightChange > 0 ? "+" : ""}
            {weightChange} lbs
          </b>
        </p>
      </Card>

      {/* GOALS */}
      <Card>
        <h3>Goals</h3>

        <input
          placeholder="Goal Weight"
          type="number"
          value={profile.goalWeight || ""}
          onChange={(e) =>
            update(
              "goalWeight",
              e.target.value
            )
          }
        />

        <br /><br />

        <input
          placeholder="Goal Body Fat %"
          type="number"
          value={
            profile.goalBodyFat || ""
          }
          onChange={(e) =>
            update(
              "goalBodyFat",
              e.target.value
            )
          }
        />

        <br /><br />

        <input
          placeholder="Goal Bench"
          type="number"
          value={profile.goalBench || ""}
          onChange={(e) =>
            update(
              "goalBench",
              e.target.value
            )
          }
        />

        <br /><br />

        <input
          placeholder="Goal Squat"
          type="number"
          value={profile.goalSquat || ""}
          onChange={(e) =>
            update(
              "goalSquat",
              e.target.value
            )
          }
        />

        <br /><br />

        <input
          placeholder="Goal Deadlift"
          type="number"
          value={
            profile.goalDeadlift || ""
          }
          onChange={(e) =>
            update(
              "goalDeadlift",
              e.target.value
            )
          }
        />
      </Card>

      {/* SAVE */}
      <button
        onClick={save}
        style={{
          width: "100%",
          padding: 14,
          marginTop: 20,
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        Save Profile
      </button>
    </div>
  );
}