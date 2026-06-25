import { useEffect, useState } from "react";
import Card from "../components/Card";
import { getProgram, addLift, deleteLift } from "../lib/program";

export default function Program() {
  const [program, setProgram] = useState([]);
  const [name, setName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");

  useEffect(() => {
    setProgram(getProgram());
  }, []);

  function refresh() {
    setProgram(getProgram());
  }

  function handleAdd() {
    if (!name) return;

    addLift({
      name,
      sets: Number(sets),
      reps: Number(reps),
    });

    setName("");
    setSets("");
    setReps("");
    refresh();
  }

  function handleDelete(index) {
    deleteLift(index);
    refresh();
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: "0 auto" }}>
      <h1>Program</h1>

      <Card>
        <h3>Add Lift</h3>

        <input
          placeholder="Exercise"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Sets"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
        />

        <input
          placeholder="Reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />

        <br /><br />

        <button onClick={handleAdd}>Add</button>
      </Card>

      <Card>
        <h3>Your Program</h3>

        {program.map((lift, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <b>{lift.name}</b> — {lift.sets} × {lift.reps}

            <button
              style={{ marginLeft: 10 }}
              onClick={() => handleDelete(i)}
            >
              delete
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}