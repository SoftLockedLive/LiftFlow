import { useEffect, useRef } from "react";
import { colors, radii, type } from "../lib/theme";

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

// Modal focus handling: moves focus into the dialog when it opens (to a [data-autofocus]
// element, else the dialog itself), keeps Tab inside it, closes on Escape, and puts focus
// back where it was when it closes. Spread `dialogProps` on the dialog element.
export function useDialogFocus(open, onClose) {
  const ref = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const node = ref.current;
    const previous = document.activeElement;
    if (node && !node.contains(document.activeElement)) {
      (node.querySelector("[data-autofocus]") || node).focus();
    }
    return () => {
      if (previous && typeof previous.focus === "function" && document.contains(previous)) previous.focus();
    };
  }, [open]);

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onCloseRef.current?.();
      return;
    }
    if (event.key !== "Tab" || !ref.current) return;
    const focusable = [...ref.current.querySelectorAll(FOCUSABLE)];
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === ref.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return { ref, onKeyDown, tabIndex: -1 };
}

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
  const dialogProps = useDialogFocus(open, onCancel);
  if (!open) return null;

  return (
    <div style={overlay} onClick={onCancel}>
      <section
        {...dialogProps}
        style={dialog}
        onClick={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <h2 id="confirm-dialog-title" style={titleStyle}>
          {title}
        </h2>
        <p id="confirm-dialog-message" style={messageStyle}>
          {message}
        </p>
        <div style={actions}>
          <button type="button" className="ghost" onClick={onCancel} data-autofocus>
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
  outline: "none",
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
