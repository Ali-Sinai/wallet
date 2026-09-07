import { useState } from "react";
import Modal, { ModalHeader } from "./Modal";
import { useAccounts, useCategories, useCreateTransactionMutation } from "../lib/queries";
import { formatToman, toPersianDigits } from "../lib/money";
import { queueTransaction } from "../lib/offlineQueue";
import type { Direction } from "../types";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "⌫"];

export default function AddTransactionModal({ onClose }: { onClose: () => void }) {
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const createTx = useCreateTransactionMutation();

  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<Direction>("withdrawal");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [queuedNotice, setQueuedNotice] = useState(false);

  function pressKey(k: string) {
    setAmount((prev) => (k === "⌫" ? prev.slice(0, -1) : prev + k));
  }

  async function save() {
    if (!amount || !accountId) return;
    setSaving(true);
    const body = {
      amount_cents: Number(amount) * 100,
      direction,
      account_id: accountId,
      occurred_at: new Date().toISOString(),
      category_id: categoryId,
      note: null,
      merchant_text: null,
    };
    try {
      if (!navigator.onLine) throw new Error("offline");
      await createTx.mutateAsync(body);
      onClose();
    } catch {
      await queueTransaction(body);
      setQueuedNotice(true);
      setTimeout(onClose, 900);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth={440}>
      <ModalHeader title="ثبت دستی" onClose={onClose} />
      <div className="flex items-baseline gap-1.5 justify-center py-4">
        <span className="text-[34px] font-bold">{amount ? formatToman(Number(amount) * 100) : "۰"}</span>
        <span className="text-[13px] text-muted">ت</span>
      </div>
      <div className="flex gap-1.5">
        {(["withdrawal", "deposit"] as Direction[]).map((d) => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            className={`flex-1 text-center py-2.5 rounded-xl text-sm font-bold border ${
              direction === d ? "bg-accent text-[#04120c] border-accent" : "border-border text-text/70"
            }`}
          >
            {d === "withdrawal" ? "برداشت" : "واریز"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3.5">
        {KEYS.map((k) => (
          <button
            key={k}
            onClick={() => pressKey(k)}
            className="text-center py-3.5 rounded-2xl bg-white/5 text-[17px] font-bold select-none"
          >
            {k === "⌫" ? k : toPersianDigits(k)}
          </button>
        ))}
      </div>
      <div className="text-xs text-muted mt-4">حساب</div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {accounts?.map((a) => (
          <button
            key={a.id}
            onClick={() => setAccountId(a.id)}
            className={`px-3 py-2 rounded-pill text-xs font-bold border ${
              accountId === a.id ? "bg-accent text-[#04120c] border-accent" : "border-border text-text/70"
            }`}
          >
            {a.bank_name} ····{toPersianDigits(a.last4)}
          </button>
        ))}
      </div>
      <div className="text-xs text-muted mt-4">دسته‌بندی</div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {categories?.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={`px-3 py-2 rounded-pill text-xs font-bold border ${
              categoryId === c.id ? "text-[#04120c]" : "border-border text-text/70"
            }`}
            style={categoryId === c.id ? { background: c.color, borderColor: c.color } : undefined}
          >
            {c.icon} {c.name_fa}
          </button>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving || !amount || !accountId}
        className="w-full text-center py-3 rounded-2xl bg-accent text-[#04120c] font-bold text-sm mt-5 disabled:opacity-50"
      >
        {queuedNotice ? "در صف افلاین ذخیره شد" : "ثبت تراکنش"}
      </button>
    </Modal>
  );
}
