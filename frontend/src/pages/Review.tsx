import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useCategories, useCategorizeMutation, useUncategorized } from "../lib/queries";
import { formatToman } from "../lib/money";

export default function Review() {
  const { data: transactions, isLoading } = useUncategorized();
  const { data: categories } = useCategories();
  const categorize = useCategorizeMutation();
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  const current = transactions?.[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!transactions || transactions.length === 0) return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(transactions.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      const n = Number(e.key);
      if (!Number.isNaN(n) && n >= 1 && categories && n <= categories.length) {
        pick(categories[n - 1].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, categories, current]);

  function pick(categoryId: number) {
    if (!current) return;
    categorize.mutate(
      { id: current.id, categoryId },
      {
        onSuccess: () => setIndex((i) => Math.min(i, (transactions?.length ?? 1) - 2)),
      },
    );
  }

  if (isLoading) return <div className="text-center text-muted py-10 text-sm">در حال بارگذاری…</div>;

  if (!transactions || transactions.length === 0) {
    return (
      <div className="max-w-lg mx-auto pb-24">
        <Header title="دسته‌بندی نشده" />
        <div className="text-center text-muted py-16 text-sm">همه چیز دسته‌بندی شده است 🎉</div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-24">
      <Header title="دسته‌بندی نشده" />
      <div className="px-4 mt-6 flex flex-col items-center gap-4">
        <div className="text-xs text-muted">
          {index + 1} / {transactions.length}
        </div>
        {current && (
          <div className="w-full p-6 rounded-card bg-card border border-border text-center">
            <div className="text-base font-bold">{current.merchant_text ?? current.note ?? "تراکنش"}</div>
            <div className={`text-3xl font-bold mt-3 ${current.direction === "withdrawal" ? "text-expense" : "text-income"}`}>
              {formatToman(current.amount_cents)}
            </div>
            <div className="text-xs text-muted mt-2">{current.occurred_at_jalali}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5 w-full">
          {categories?.map((c, i) => (
            <button
              key={c.id}
              onClick={() => pick(c.id)}
              className="px-4 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition"
              style={{ background: c.color, color: "#04120c" }}
            >
              <span className="text-xs opacity-70">{i + 1}</span>
              {c.icon} {c.name_fa}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-mutedSoft text-center mt-2">
          کلید عدد برای انتخاب دسته · فلش‌ها برای جابه‌جایی
        </div>
        <button onClick={() => navigate("/")} className="text-xs text-accent mt-2">
          بازگشت به داشبورد
        </button>
      </div>
    </div>
  );
}
