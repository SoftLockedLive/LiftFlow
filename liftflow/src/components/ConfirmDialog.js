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
      <section style={dialog} onClick={(event) => event.stopPropagation()}>
        <h2 style={titleStyle}>{title}</h2>
        <p style={messageStyle}>{message}</p>
        <div style={actions}>
          <button type="button" onClick={onCancel} style={cancelButton}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              ...confirmButton,
              ...(danger ? dangerButton : {}),
            }}
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
  background: "rgba(0, 0, 0, 0.78)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
};

const dialog = {
  width: "min(420px, 100%)",
  border: "1px solid rgba(50, 207, 255, 0.35)",
  borderRadius: 16,
  background: "#101010",
  padding: 18,
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.55)",
};

const titleStyle = {
  margin: 0,
  color: "#f7f7f2",
  fontSize: 24,
};

const messageStyle = {
  margin: "10px 0 0",
  color: "#8a8a8a",
  lineHeight: 1.45,
  fontWeight: 750,
};

const actions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 18,
  flexWrap: "wrap",
};

const cancelButton = {
  color: "#aaa",
  borderColor: "#333",
  background: "#0b0b0b",
};

const confirmButton = {
  color: "#050505",
  borderColor: "#32cfff",
  background: "#32cfff",
};

const dangerButton = {
  borderColor: "#ff6b2c",
  background: "#ff6b2c",
};
