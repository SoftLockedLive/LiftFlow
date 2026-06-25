import Navbar from "./Navbar";

export default function Layout({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0b0f14", color: "white" }}>
      <div style={{ paddingBottom: 70 }}>
        {children}
      </div>
      <Navbar />
    </div>
  );
}