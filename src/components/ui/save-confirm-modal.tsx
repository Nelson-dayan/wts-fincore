"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  entityName?: string;
};

export function SaveConfirmModal({
  open,
  onClose,
  onConfirm,
  loading,
  entityName = "record",
}: Props) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={`Save ${entityName}?`}
      description={`Your changes will be saved to this ${entityName}.`}
      confirmLabel="Save"
      cancelLabel="Cancel"
      loading={loading}
      onConfirm={onConfirm}
    />
  );
}
