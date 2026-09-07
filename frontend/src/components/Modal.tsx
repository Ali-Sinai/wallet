import { type ReactNode } from "react";

export default function Modal({
  children,
  onClose,
  maxWidth = 460,
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: number;
}) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full rounded-[22px] bg-cardAlt border border-border p-6 max-h-[86vh] overflow-y-auto fade-in"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex justify-between items-center mb-2">
      <div className="text-xs text-muted">{title}</div>
      <button className="text-xs text-accent" onClick={onClose}>
        بستن
      </button>
    </div>
  );
}
