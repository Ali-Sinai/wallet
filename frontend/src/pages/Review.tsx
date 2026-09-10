import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/shell/AppShell";
import { Card, EmptyNote } from "../components/ui";
import { useCategories, useCategorizeMutation, useUncategorized } from "../lib/queries";
import { useI18n } from "../lib/i18n";
import { categoryName, signedCents, txTitle } from "../lib/domain";

/** Keyboard-driven triage of uncategorized transactions. */
export default function Review() {
  const { t, fa, digits, money, localize } = useI18n();
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
      if (!Number.isNaN(n) && n >= 1 && categories && n <= categories.length && current) {
        categorize.mutate(
          { id: current.id, categoryId: categories[n - 1].id },
          { onSuccess: () => setIndex((i) => Math.max(0, Math.min(i, transactions.length - 2))) },
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transactions, categories, current, categorize]);

  function pick(categoryId: number) {
    if (!current) return;
    categorize.mutate(
      { id: current.id, categoryId },
      { onSuccess: () => setIndex((i) => Math.max(0, Math.min(i, (transactions?.length ?? 1) - 2))) },
    );
  }

  if (isLoading) {
    return (
      <AppShell sidebar={false}>
        <EmptyNote>{t.loading}</EmptyNote>
      </AppShell>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <AppShell sidebar={false}>
        <Card style={{ padding: 22 }}>
          <EmptyNote pad={56}>{t.allCategorized}</EmptyNote>
        </Card>
      </AppShell>
    );
  }

  const signed = current ? signedCents(current) : 0;

  return (
    <AppShell sidebar={false}>
      <div className="mx-auto flex w-full flex-col items-center fade-in" style={{ maxWidth: 520, gap: 16, padding: "10px 22px 0" }}>
        <div style={{ fontSize: 12, color: "rgba(232,234,236,.45)" }}>
          {digits(index + 1)} / {digits(transactions.length)}
        </div>

        {current && (
          <Card className="w-full text-center" style={{ padding: 24 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{txTitle(current, t.transaction)}</div>
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                marginTop: 10,
                color: signed < 0 ? "#ff7a6b" : "#3fd39a",
              }}
            >
              {money(signed, true)}
            </div>
            <div style={{ fontSize: 12, color: "rgba(232,234,236,.45)", marginTop: 8 }}>
              {localize(current.occurred_at_jalali)}
            </div>
          </Card>
        )}

        <div className="grid w-full" style={{ gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
          {categories?.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              className="flex items-center justify-center transition active:scale-95"
              style={{
                gap: 8,
                padding: "16px 12px",
                borderRadius: 16,
                background: c.color,
                color: "#04120c",
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: 11, opacity: 0.7 }}>{digits(i + 1)}</span>
              {categoryName(c, fa, "")}
            </button>
          ))}
        </div>

        <div className="text-center" style={{ fontSize: 11, color: "rgba(232,234,236,.35)" }}>
          {t.reviewHint}
        </div>

        <button type="button" onClick={() => navigate("/")} style={{ fontSize: 12, color: "#0f9b6e" }}>
          {t.backToDash}
        </button>
      </div>
    </AppShell>
  );
}
