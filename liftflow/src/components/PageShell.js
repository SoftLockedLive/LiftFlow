export default function PageShell({ children }) {
  return (
    <div style={shell}>
      <div style={container}>{children}</div>
    </div>
  );
}

const shell = {
  minHeight: "100vh",
  background: "#0b0f19",
  display: "flex",
  justifyContent: "center",
};

const container = {
  width: "100%",
  maxWidth: 420, // 🔥 mobile-first constraint
  padding: 16,
};