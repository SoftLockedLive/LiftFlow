import { colors, radii, type } from "../lib/theme";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div style={overlay} onClick={onCancel}>
      <section
        style={dialog}
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <h2 id="confirm-dialog-title" style={titleStyle}>
          {title}
        </h2>
        <p style={messageStyle}>{message}</p>
        <div style={actions}>
          <button type="button" className="ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? undefined : "primary"}
            onClick={onConfirm}
            style={danger ? dangerButton : undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

const overlay = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  background: "rgba(0, 0, 0, 0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const dialog = {
  width: "min(400px, 100%)",
  border: `1px solid ${colors.border}`,
  borderRadius: radii.xl,
  background: colors.surface,
  padding: 20,
  boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)",
};

const titleStyle = {
  ...type.sectionTitle,
  fontSize: 19,
};

const messageStyle = {
  ...type.body,
  margin: "8px 0 0",
  color: colors.muted,
};

const actions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 20,
  flexWrap: "wrap",
};

const dangerButton = {
  color: "#fff",
  borderColor: colors.danger,
  background: colors.danger,
};
