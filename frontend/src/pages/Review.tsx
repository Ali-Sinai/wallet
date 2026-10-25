import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/shell/AppShell";
import { BusyLabel, Card, EmptyNote } from "@/components/primitives";
import { useCategories, useCategorizeMutation, useUncategorized } from "../lib/queries";
import { useI18n } from "../lib/i18n";
import { categoryName, signedCents, txTitle } from "../lib/domain";
import { useFamily } from "../lib/theme";
import { DARK_LABEL } from "@/components/primitives";
import { PageBody, PageTitle } from "../designs/Page";
import { RoundBtn } from "../designs/soft/SoftShell";
import { Icon, P } from "../designs/shared";
import type { Category, Transaction } from "../types";

/** Keyboard-driven triage of uncategorized transactions. */
export default function Review() {
  const { t, fa, digits, money, localize } = useI18n();
  const { data: transactions, isLoading } = useUncategorized();
  const { data: categories } = useCategories();
  const categorize = useCategorizeMutation();
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const family = useFamily();

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

  if (family !== "classic") {
    return (
      <AppShell sidebar={false}>
        <PageBody maxWidth={560}>
          <DesignReview
            current={current}
            index={index}
            total={transactions?.length ?? 0}
            loading={isLoading}
            categories={categories ?? []}
            busyId={categorize.isPending ? (categorize.variables?.categoryId ?? null) : null}
            onPick={pick}
            onBack={() => navigate("/")}
          />
        </PageBody>
      </AppShell>
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
        <div style={{ fontSize: 12, color: "rgb(var(--fg-rgb) / .45)" }}>
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
                color: signed < 0 ? "var(--c-expense)" : "var(--c-income)",
              }}
            >
              {money(signed, true)}
            </div>
            <div style={{ fontSize: 12, color: "rgb(var(--fg-rgb) / .45)", marginTop: 8 }}>
              {localize(current.occurred_at_jalali)}
            </div>
          </Card>
        )}

        <div className="grid w-full" style={{ gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
          {categories?.map((c, i) => (
            <Button variant="plain" size="plain"
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              disabled={categorize.isPending}
              aria-busy={categorize.isPending && categorize.variables?.categoryId === c.id}
              className="flex items-center justify-center transition active:scale-95"
              style={{
                padding: "16px 12px",
                borderRadius: 16,
                background: c.color,
                color: "var(--c-on-primary)",
                fontSize: 13.5,
                fontWeight: 700,
              }}
            >
              <BusyLabel busy={categorize.isPending && categorize.variables?.categoryId === c.id}>
                <span className="flex items-center" style={{ gap: 8 }}>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{digits(i + 1)}</span>
                  {categoryName(c, fa, "")}
                </span>
              </BusyLabel>
            </Button>
          ))}
        </div>

        <div className="text-center" style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .35)" }}>
          {t.reviewHint}
        </div>

        <Button variant="plain" size="plain" onClick={() => navigate("/")} style={{ fontSize: 12, color: "var(--c-primary)" }}>
          {t.backToDash}
        </Button>
      </div>
    </AppShell>
  );
}

/**
 * Review in Wallet Dark / Wallet Soft. Dark: a thin oversized amount over a
 * numbered ledger of categories (the number is the keyboard shortcut).
 * Soft: a white card for the transaction over a grid of white tiles.
 */
function DesignReview({
  current,
  index,
  total,
  loading,
  categories,
  busyId,
  onPick,
  onBack,
}: {
  current: Transaction | undefined;
  index: number;
  total: number;
  loading: boolean;
  categories: Category[];
  busyId: number | null;
  onPick: (categoryId: number) => void;
  onBack: () => void;
}) {
  const { t, fa, digits, money, localize } = useI18n();
  const family = useFamily();
  const dark = family === "dark";
  const counter = total > 0 ? `${digits(index + 1)} / ${digits(total)}` : "";

  const back = dark ? (
    <Button variant="plain" size="plain" onClick={onBack} aria-label={t.backToDash} style={{ color: "var(--c-fg)", display: "flex" }}>
      <Icon size={22} d={P.back} flip />
    </Button>
  ) : (
    <RoundBtn onClick={onBack} label={t.backToDash}>
      <Icon size={20} d={P.back} w={2} flip />
    </RoundBtn>
  );

  const head = (
    <PageTitle
      title={t.uncategorized}
      left={back}
      right={<span style={dark ? DARK_LABEL : { fontSize: 13, color: "rgb(var(--fg-rgb) / .55)" }}>{counter}</span>}
    />
  );

  if (loading) {
    return (
      <>
        {head}
        <EmptyNote>{t.loading}</EmptyNote>
      </>
    );
  }
  if (!current) {
    return (
      <>
        {head}
        <EmptyNote pad={72}>{t.allCategorized}</EmptyNote>
      </>
    );
  }

  const signed = signedCents(current);
  const amountColor = signed < 0 ? "var(--c-expense)" : "var(--c-income)";
  const title = txTitle(current, t.transaction);

  return (
    <>
      {head}
      {dark ? (
        <div style={{ paddingTop: 48 }}>
          <div style={DARK_LABEL}>{localize(current.occurred_at_jalali)}</div>
          <div style={{ fontSize: 17, marginTop: 14 }}>{title}</div>
          <div
            style={{
              fontSize: "clamp(36px, 14vw, 56px)",
              fontWeight: 300,
              letterSpacing: "-.03em",
              lineHeight: 1,
              marginTop: 14,
              color: amountColor,
              whiteSpace: "nowrap",
            }}
          >
            {money(signed, true)}
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center text-center"
          style={{ marginTop: 22, padding: "26px 20px", borderRadius: 30, background: "var(--c-surface)", boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}
        >
          <div
            className="flex items-center justify-center"
            style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--c-bg)", fontSize: 18, fontWeight: 600 }}
          >
            {Array.from(title)[0] ?? "·"}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 12 }}>{title}</div>
          <div style={{ fontSize: 30, fontWeight: 600, marginTop: 6, color: amountColor }}>{money(signed, true)}</div>
          <div style={{ fontSize: 12, color: "rgb(var(--fg-rgb) / .55)", marginTop: 4 }}>{localize(current.occurred_at_jalali)}</div>
        </div>
      )}

      <div style={dark ? { ...DARK_LABEL, marginTop: 44 } : { fontSize: 17, fontWeight: 600, margin: "26px 4px 12px" }}>{t.category}</div>

      {dark ? (
        <div className="flex flex-col" style={{ marginTop: 8 }}>
          {categories.map((c, i) => (
            <Button
              key={c.id}
              variant="plain"
              size="plain"
              onClick={() => onPick(c.id)}
              disabled={busyId !== null}
              aria-busy={busyId === c.id}
              className="flex items-center"
              style={{ gap: 18, padding: "14px 0", textAlign: "start" }}
            >
              <span style={{ width: 22, fontFamily: "var(--app-mono)", fontSize: 12, color: "rgb(var(--fg-rgb) / .4)" }}>{digits(i + 1)}</span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, flex: "none" }} />
              <span className="flex-1" style={{ fontSize: 15 }}>
                <BusyLabel busy={busyId === c.id}>{categoryName(c, fa, "")}</BusyLabel>
              </span>
              <Icon size={16} d={P.chev} color="rgb(var(--fg-rgb) / .27)" flip />
            </Button>
          ))}
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
          {categories.map((c, i) => (
            <Button
              key={c.id}
              variant="plain"
              size="plain"
              onClick={() => onPick(c.id)}
              disabled={busyId !== null}
              aria-busy={busyId === c.id}
              className="flex items-center transition active:scale-95"
              style={{ gap: 10, padding: "14px", borderRadius: 20, background: "var(--c-surface)", boxShadow: "0 6px 18px rgba(0,0,0,.05)", textAlign: "start" }}
            >
              <span
                className="flex flex-none items-center justify-center"
                style={{ width: 30, height: 30, borderRadius: "50%", background: `color-mix(in srgb, ${c.color} 16%, var(--c-surface))`, color: c.color, fontSize: 12, fontWeight: 600 }}
              >
                {digits(i + 1)}
              </span>
              <span className="min-w-0 flex-1 truncate" style={{ fontSize: 14, fontWeight: 500 }}>
                <BusyLabel busy={busyId === c.id}>{categoryName(c, fa, "")}</BusyLabel>
              </span>
            </Button>
          ))}
        </div>
      )}

      <div className="text-center" style={dark ? { ...DARK_LABEL, fontSize: 10, marginTop: 28 } : { fontSize: 12, color: "rgb(var(--fg-rgb) / .45)", marginTop: 20 }}>
        {t.reviewHint}
      </div>
    </>
  );
}
