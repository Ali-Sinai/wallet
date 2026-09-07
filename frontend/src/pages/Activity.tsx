import { useState } from "react";
import Header from "../components/Header";
import { useAccounts, useCategories, useTransactions } from "../lib/queries";
import { useModals } from "../lib/modals";
import { formatToman, toPersianDigits } from "../lib/money";
import type { Direction } from "../types";

export default function Activity() {
  const [direction, setDirection] = useState<Direction | "all">("all");
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const { data: transactions, isLoading } = useTransactions({
    direction: direction === "all" ? undefined : direction,
    category_id: categoryId === "all" ? undefined : categoryId,
    search: search || undefined,
  });
  const { openDetail } = useModals();

  return (
    <div className="max-w-lg mx-auto pb-24">
      <Header title="تراکنش‌ها" />
      <div className="px-4 mt-4 flex flex-col gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجو در یادداشت‌ها…"
          className="rounded-2xl bg-card border border-border px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <div className="flex gap-1.5 overflow-x-auto">
          {(
            [
              ["all", "همه"],
              ["deposit", "واریز"],
              ["withdrawal", "برداشت"],
            ] as [Direction | "all", string][]
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setDirection(k)}
              className={`px-3.5 py-2 rounded-pill text-xs font-bold whitespace-nowrap border ${
                direction === k ? "bg-accent text-[#04120c] border-accent" : "border-border text-text/70"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoryId("all")}
            className={`px-3 py-2 rounded-pill text-xs font-bold whitespace-nowrap border ${
              categoryId === "all" ? "bg-accent text-[#04120c] border-accent" : "border-border text-text/70"
            }`}
          >
            همه دسته‌ها
          </button>
          {categories?.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`px-3 py-2 rounded-pill text-xs font-bold whitespace-nowrap border ${
                categoryId === c.id ? "bg-accent text-[#04120c] border-accent" : "border-border text-text/70"
              }`}
            >
              {c.icon} {c.name_fa}
            </button>
          ))}
        </div>

        <div className="rounded-card bg-card border border-border">
          {isLoading && <div className="text-center text-muted py-8 text-sm">در حال بارگذاری…</div>}
          {transactions?.length === 0 && <div className="text-center text-muted py-8 text-sm">تراکنشی یافت نشد</div>}
          {transactions?.map((tx) => {
            const category = categories?.find((c) => c.id === tx.category_id);
            const account = accounts?.find((a) => a.id === tx.account_id);
            return (
              <div
                key={tx.id}
                onClick={() => openDetail(tx)}
                className="grid grid-cols-[4px_1fr_auto] gap-3.5 items-center px-4 py-3 border-b border-border last:border-0 cursor-pointer"
              >
                <div className="w-1 h-7 rounded-sm" style={{ background: category?.color ?? "#5a6663" }} />
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{tx.merchant_text ?? tx.note ?? "تراکنش"}</div>
                  <div className="text-[11.5px] text-mutedSoft mt-0.5">
                    {category ? `${category.icon} ${category.name_fa}` : "دسته‌بندی نشده"}
                    {account ? ` · ${account.bank_name} ····${toPersianDigits(account.last4)}` : ""}
                  </div>
                </div>
                <div className="text-left">
                  <div className={`text-sm font-bold ${tx.direction === "withdrawal" ? "text-expense" : "text-income"}`}>
                    {tx.direction === "withdrawal" ? "−" : "+"}
                    {formatToman(tx.amount_cents)}
                  </div>
                  <div className="text-[11px] text-mutedSoft mt-0.5">
                    {tx.occurred_at_jalali}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
