export default function Settings() {
  return (
    <section style={wrap}>
      <h1 style={title}>Settings</h1>
      <p style={copy}>Profile and app settings live in the profile menu.</p>
    </section>
  );
}

const wrap = {
  minHeight: 240,
  border: "1px solid #222",
  borderRadius: 16,
  background: "#101010",
  padding: 24,
};

const title = {
  margin: 0,
  color: "#e4ff2f",
  fontSize: 34,
};

const copy = {
  margin: "16px 0 0",
  color: "#666",
  fontSize: 18,
};
