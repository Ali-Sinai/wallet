import { useEffect, useState } from "react";
import { DateTimeField } from "@/components/DateFields";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ActionButton, Chip, Field, Input, Overlay, OverlayHeader, Segmented, SubLabel } from "@/components/primitives";
import { useFamily } from "../lib/theme";
import {
  useAccounts,
  useCategories,
  useCreateTransactionMutation,
  useSuggestedCategory,
} from "../lib/queries";
import { useI18n } from "../lib/i18n";
import { accountLabel, categoryName } from "../lib/domain";
import { queueTransaction } from "../lib/offlineQueue";
import { ApiError } from "../lib/api";
import type { Direction } from "../types";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "000", "0", "⌫"];

/** Keypad keys: grey blocks (classic), bare thin numerals (Dark), white tiles (Soft). */
const KEY_STYLES = {
  classic: { textAlign: "center", padding: "14px 0", borderRadius: 14, background: "rgb(var(--ink-rgb) / .05)", fontSize: 17, fontWeight: 700 },
  dark: { textAlign: "center", padding: "12px 0", fontSize: 26, fontWeight: 300 },
  soft: { textAlign: "center", padding: "14px 0", borderRadius: 18, background: "var(--c-surface)", boxShadow: "0 6px 18px rgba(0,0,0,.05)", fontSize: 19, fontWeight: 500 },
} as const;

/** Marks the deliberate "we are offline, queue it" path, vs a server error. */
class OfflineError extends Error {}

export default function AddTransactionModal({ onClose }: { onClose: () => void }) {
  const { t, fa, digits, group } = useI18n();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const createTx = useCreateTransactionMutation();
  const family = useFamily();

  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<Direction>("withdrawal");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveAccountId = accountId ?? accounts?.[0]?.id ?? null;

  // The API remembers which category a merchant was filed under last time.
  const { data: suggestion } = useSuggestedCategory(merchant.trim() || null);
  useEffect(() => {
    if (!categoryTouched && suggestion?.category_id) setCategoryId(suggestion.category_id);
  }, [suggestion, categoryTouched]);

  function pressKey(k: string) {
    setAmount((prev) => (k === "⌫" ? prev.slice(0, -1) : prev + k));
  }

  async function save() {
    if (!amount || !effectiveAccountId) return;
    setSaving(true);
    setError(null);
    const body = {
      amount_cents: Number(amount) * 100,
      direction,
      account_id: effectiveAccountId,
      occurred_at: occurredAt.toISOString(),
      category_id: categoryId,
      note: note || null,
      merchant_text: merchant || null,
    };
    try {
      if (!navigator.onLine) throw new OfflineError();
      await createTx.mutateAsync(body);
      onClose();
    } catch (e) {
      // A server rejection is a real problem — don't disguise it as "saved
      // offline", which would silently drop the transaction on the floor.
      if (e instanceof ApiError) {
        setError(e.message);
        return;
      }
      await queueTransaction(body);
      setQueued(true);
      setTimeout(onClose, 900);
    } finally {
      setSaving(false);
    }
  }

  const noAccounts = accounts !== undefined && accounts.length === 0;

  return (
    <Overlay onClose={onClose} maxWidth={440} sheetMaxHeight="92%">
      <OverlayHeader title={t.add} onClose={onClose} closeLabel={t.close} />

      {noAccounts ? (
        <div className="flex flex-col items-center" style={{ gap: 12, padding: "28px 0 8px" }}>
          <div style={{ fontSize: 13, color: "rgb(var(--fg-rgb) / .6)", textAlign: "center" }}>
            {t.noAccounts}
          </div>
          <Link
            to="/settings"
            onClick={onClose}
            style={{
              padding: "11px 18px",
              borderRadius: 13,
              background: "var(--c-primary)",
              color: "var(--c-on-primary)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {t.goToSettings}
          </Link>
        </div>
      ) : (
        <>
          <div
            className="flex items-baseline justify-center"
            style={{ gap: 6, padding: family === "dark" ? "30px 0 14px" : family === "soft" ? "22px 0 10px" : "18px 0 6px" }}
          >
            <span
              style={
                family === "dark"
                  ? { fontSize: "clamp(40px, 13vw, 56px)", fontWeight: 300, letterSpacing: "-.03em", lineHeight: 1 }
                  : { fontSize: family === "soft" ? 36 : 34, fontWeight: family === "soft" ? 600 : 700 }
              }
            >
              {amount ? group(Number(amount) * 100) : digits(0)}
            </span>
            <span style={{ fontSize: 13, color: "rgb(var(--fg-rgb) / .45)" }}>{t.tomanShort}</span>
          </div>

          <div className="flex justify-center" style={{ marginTop: 10 }}>
            <div style={{ flex: family === "dark" ? "none" : 1 }}>
              <Segmented
                items={[
                  { key: "withdrawal" as Direction, label: t.withdraw },
                  { key: "deposit" as Direction, label: t.deposit },
                ]}
                value={direction}
                onChange={setDirection}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
            {KEYS.map((k) => (
              <Button variant="plain" size="plain"
                key={k}
                type="button"
                onClick={() => pressKey(k)}
                className="select-none"
                style={KEY_STYLES[family]}
              >
                {k === "⌫" ? k : digits(k)}
              </Button>
            ))}
          </div>

          <div className="flex" style={{ gap: 10, marginTop: 16 }}>
            <Field label={t.merchant}>
              <Input value={merchant} onChange={setMerchant} />
            </Field>
            <Field label={t.date}>
              <DateTimeField value={occurredAt} onChange={setOccurredAt} />
            </Field>
          </div>

          <div style={{ marginTop: 10 }}>
            <Field label={t.note}>
              <Input value={note} onChange={setNote} />
            </Field>
          </div>

          {(accounts?.length ?? 0) > 1 && (
            <>
              <SubLabel>{t.account}</SubLabel>
              <div className="flex flex-wrap" style={{ gap: 7, marginTop: 9 }}>
                {accounts?.map((a) => (
                  <Chip key={a.id} active={effectiveAccountId === a.id} onClick={() => setAccountId(a.id)}>
                    {accountLabel(a, fa, digits)}
                  </Chip>
                ))}
              </div>
            </>
          )}

          <SubLabel>{t.category}</SubLabel>
          <div className="flex flex-wrap" style={{ gap: 7, marginTop: 9 }}>
            {categories?.map((c) => (
              <Chip
                key={c.id}
                active={categoryId === c.id}
                onClick={() => {
                  setCategoryTouched(true);
                  setCategoryId(c.id);
                }}
              >
                {categoryName(c, fa, "")}
              </Chip>
            ))}
          </div>

          <div style={{ marginTop: 22 }}>
            <ActionButton onClick={save} busy={saving} disabled={!amount || !effectiveAccountId}>
              {queued ? t.queued : t.saveTx}
            </ActionButton>
          </div>

          {error && (
            <div className="text-center" style={{ color: "var(--c-expense)", fontSize: 12, marginTop: 8 }}>
              {error}
            </div>
          )}
        </>
      )}
    </Overlay>
  );
}
