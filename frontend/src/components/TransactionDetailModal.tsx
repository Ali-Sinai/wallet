import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal, { ModalHeader } from "./Modal";
import { useAccounts, useCategories } from "../lib/queries";
import { api } from "../lib/api";
import { formatToman } from "../lib/money";
import type { Transaction } from "../types";

export default function TransactionDetailModal({
  tx,
  onClose,
  onSplit,
}: {
  tx: Transaction;
  onClose: () => void;
  onSplit: () => void;
}) {
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const qc = useQueryClient();

  const categorize = useMutation({
    mutationFn: (categoryId: number) => api.patch(`/transactions/${tx.id}/categorize`, { category_id: categoryId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/transactions/${tx.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
  });

  const account = accounts?.find((a) => a.id === tx.account_id);
  const color = tx.direction === "withdrawal" ? "text-expense" : "text-income";

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="جزئیات تراکنش" onClose={onClose} />
      <div className="text-lg font-bold mt-3">{tx.merchant_text ?? tx.note ?? "تراکنش"}</div>
      <div className={`text-[32px] font-bold mt-1 ${color}`}>
        {tx.direction === "withdrawal" ? "−" : "+"}
        {formatToman(tx.amount_cents)}
      </div>
      <div className="flex gap-2.5 mt-4">
        <div className="flex-1 px-3.5 py-3 rounded-2xl bg-white/5">
          <div className="text-[11px] text-muted">حساب</div>
          <div className="text-[13px] font-bold mt-1">
            {account ? `${account.bank_name} ····${account.last4}` : "-"}
          </div>
        </div>
        <div className="flex-1 px-3.5 py-3 rounded-2xl bg-white/5">
          <div className="text-[11px] text-muted">تاریخ</div>
          <div className="text-[13px] font-bold mt-1">{tx.occurred_at_jalali}</div>
        </div>
      </div>
      <div className="text-xs text-muted mt-4">دسته‌بندی</div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {categories?.map((c) => (
          <button
            key={c.id}
            onClick={() => categorize.mutate(c.id)}
            className="px-3 py-2 rounded-pill text-xs font-bold border"
            style={
              tx.category_id === c.id
                ? { background: c.color, borderColor: c.color, color: "#04120c" }
                : { borderColor: "rgba(255,255,255,.14)", color: "rgba(232,234,236,.8)" }
            }
          >
            {c.icon} {c.name_fa}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-6">
        {tx.direction === "withdrawal" && !tx.is_shared && (
          <button
            onClick={onSplit}
            className="flex-1 text-center py-3 rounded-2xl bg-accent text-[#04120c] font-bold text-[13px]"
          >
            تقسیم این هزینه
          </button>
        )}
        <button
          onClick={() => remove.mutate()}
          className="px-4 py-3 rounded-2xl border text-[13px] font-bold text-expense"
          style={{ borderColor: "rgba(255,122,107,.35)" }}
        >
          حذف
        </button>
      </div>
    </Modal>
  );
}
