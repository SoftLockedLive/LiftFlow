import { Component } from "react";
import { colors, tint } from "../lib/theme";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  goHome = () => {
    window.location.href = "/";
  };

  exportData = () => {
    const data = Object.keys(localStorage)
      .filter((key) => key.startsWith("liftflow_"))
      .sort()
      .reduce((payload, key) => {
        payload[key] = localStorage.getItem(key);
        return payload;
      }, {});
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, data }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `liftflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main style={wrap}>
        <section style={card}>
          <p style={eyebrow}>Recovery</p>
          <h1 style={title}>Something went wrong</h1>
          <p style={copy}>Your LiftFlow data is still on this device. Try reloading the page, go home, or export a backup before resetting anything.</p>
          <div style={actions}>
            <button type="button" className="primary" onClick={this.reset}>Try Again</button>
            <button type="button" onClick={this.goHome} style={secondary}>Go Home</button>
            <button type="button" onClick={this.exportData} style={secondary}>Export Data</button>
          </div>
        </section>
      </main>
    );
  }
}

const wrap = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 18,
  background: colors.bg,
  color: colors.text,
};

const card = {
  width: "min(460px, 100%)",
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  background: colors.surface,
  padding: 18,
};

const eyebrow = {
  margin: 0,
  color: colors.brand,
  fontSize: 13,
  fontWeight: 850,
  textTransform: "uppercase",
};

const title = {
  margin: "6px 0 0",
  fontSize: 30,
};

const copy = {
  margin: "10px 0 0",
  color: colors.muted,
  lineHeight: 1.45,
  fontWeight: 700,
};

const actions = {
  display: "grid",
  gap: 9,
  marginTop: 16,
};

const secondary = {
  color: colors.brand,
  borderColor: tint(colors.brand, 0.36),
  background: colors.surfaceSoft,
};
