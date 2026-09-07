import { createContext, useContext, useState, type ReactNode } from "react";
import AddTransactionModal from "../components/AddTransactionModal";
import SplitModal from "../components/SplitModal";
import TransactionDetailModal from "../components/TransactionDetailModal";
import type { Transaction } from "../types";

interface ModalContextValue {
  openAdd: () => void;
  openDetail: (tx: Transaction) => void;
  openSplit: (tx: Transaction) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

type ModalState = { kind: "add" } | { kind: "detail"; tx: Transaction } | { kind: "split"; tx: Transaction } | null;

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>(null);

  const value: ModalContextValue = {
    openAdd: () => setModal({ kind: "add" }),
    openDetail: (tx) => setModal({ kind: "detail", tx }),
    openSplit: (tx) => setModal({ kind: "split", tx }),
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      {modal?.kind === "add" && <AddTransactionModal onClose={() => setModal(null)} />}
      {modal?.kind === "detail" && (
        <TransactionDetailModal
          tx={modal.tx}
          onClose={() => setModal(null)}
          onSplit={() => setModal({ kind: "split", tx: modal.tx })}
        />
      )}
      {modal?.kind === "split" && <SplitModal tx={modal.tx} onClose={() => setModal(null)} />}
    </ModalContext.Provider>
  );
}

export function useModals(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModals must be used within ModalProvider");
  return ctx;
}
