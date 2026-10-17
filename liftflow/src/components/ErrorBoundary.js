import { Component } from "react";
import { colors, radii, type } from "../lib/theme";

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
        <section style={card} role="alert">
          <h1 style={title}>Something went wrong</h1>
          <p style={copy}>
            Your LiftFlow data is still on this device. Try again, go home, or export a backup before resetting
            anything.
          </p>
          <div style={actions}>
            <button type="button" className="primary" onClick={this.reset} style={fullButton}>
              Try again
            </button>
            <div style={secondaryRow}>
              <button type="button" onClick={this.goHome}>
                Go home
              </button>
              <button type="button" onClick={this.exportData}>
                Export data
              </button>
            </div>
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
  padding: 16,
  background: colors.bg,
  color: colors.text,
};

const card = {
  width: "min(420px, 100%)",
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  padding: 20,
  textAlign: "center",
};

const title = {
  ...type.pageTitle,
  fontSize: 22,
};

const copy = {
  ...type.body,
  color: colors.muted,
  margin: "8px 0 0",
};

const actions = {
  display: "grid",
  gap: 8,
  marginTop: 18,
};

const fullButton = {
  width: "100%",
  padding: "12px 16px",
  fontSize: 15,
};

const secondaryRow = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 8,
};
