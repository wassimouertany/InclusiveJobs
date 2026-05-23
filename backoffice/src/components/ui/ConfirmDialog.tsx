import Modal, { ModalActions } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={<ModalActions onClose={onClose} onConfirm={onConfirm} confirmLabel={confirmLabel} />}
    >
      <p className="text-sm text-[var(--bo-muted)]">{message}</p>
    </Modal>
  );
}
