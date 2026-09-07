import { useCategories, useConfirmSmsMutation, useIgnoreSmsMutation, useSmsPending } from "../lib/queries";
import { formatToman, toPersianDigits } from "../lib/money";
import { useModals } from "../lib/modals";
import { api } from "../lib/api";
import type { Transaction } from "../types";

export default function SmsPendingList() {
  const { data: pending } = useSmsPending();
  const { data: categories } = useCategories();
  const confirm = useConfirmSmsMutation();
  const ignore = useIgnoreSmsMutation();
  const { openSplit } = useModals();

  if (!pending || pending.length === 0) return null;

  return (
    <div className="p-4.5 rounded-card bg-cardAlt border" style={{ borderColor: "rgba(15,155,110,.32)" }}>
      <div className="flex justify-between items-center">
        <div className="text-xs font-bold text-income">شناسایی شده از پیامک</div>
        <div className="text-[11.5px] text-muted">{toPersianDigits(String(pending.length))} در انتظار</div>
      </div>
      <div className="flex flex-col gap-3.5 mt-3.5">
        {pending.map((m) => (
          <div key={m.id} className="p-3.5 rounded-2xl bg-white/[.035]">
            <div className="text-[11.5px] text-text/55 leading-relaxed border-e-2 border-income/40 pe-2.5">
              {m.merchant ?? m.sender} · {m.account_last4 ? `····${toPersianDigits(m.account_last4)}` : ""}
            </div>
            <div className="flex items-baseline gap-1.5 mt-2.5">
              <span className={`text-xl font-bold ${m.direction === "withdrawal" ? "text-expense" : "text-income"}`}>
                {m.amount_cents !== null ? formatToman(m.amount_cents) : "—"}
              </span>
              <span className="text-[11px] text-muted">
                {m.direction === "withdrawal" ? "برداشت" : m.direction === "deposit" ? "واریز" : ""}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {categories?.slice(0, 4).map((c) => (
                <span key={c.id} className="px-2.5 py-1.5 rounded-pill text-[11.5px] font-bold border border-border">
                  {c.icon} {c.name_fa}
                </span>
              ))}
            </div>
            <div className="flex gap-1.5 mt-3">
              <button
                onClick={() => confirm.mutate({ id: m.id })}
                className="flex-1 text-center py-2 rounded-xl bg-accent text-[#04120c] text-xs font-bold"
              >
                تأیید
              </button>
              <button
                onClick={async () => {
                  const res = await confirm.mutateAsync({ id: m.id });
                  const txId = (res as { transaction_id?: number }).transaction_id;
                  if (!txId) return;
                  const tx = await api.get<Transaction>(`/transactions/${txId}`);
                  openSplit(tx);
                }}
                className="px-3 py-2 rounded-xl border border-border text-xs text-text/80"
              >
                تقسیم…
              </button>
              <button
                onClick={() => ignore.mutate(m.id)}
                className="px-3 py-2 rounded-xl border border-border text-xs text-text/50"
              >
                نادیده
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
