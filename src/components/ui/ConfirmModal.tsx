"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onCancel}
      className="w-full max-w-md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant} size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="text-sm text-slate-600">
        {variant === "danger" ? (
          <p>This action cannot be undone. Are you sure you want to proceed?</p>
        ) : (
          <p>Please confirm you want to continue.</p>
        )}
      </div>
    </Modal>
  );
}
