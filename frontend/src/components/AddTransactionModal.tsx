import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Chip, Field, Input, Overlay, OverlayHeader } from "./ui";
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

/** Marks the deliberate "we are offline, queue it" path, vs a server error. */
class OfflineError extends Error {}

export default function AddTransactionModal({ onClose }: { onClose: () => void }) {
  const { t, fa, digits, group } = useI18n();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const createTx = useCreateTransactionMutation();

  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<Direction>("withdrawal");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 16));
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
      occurred_at: new Date(occurredAt).toISOString(),
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
          <div style={{ fontSize: 13, color: "rgba(232,234,236,.6)", textAlign: "center" }}>
            {t.noAccounts}
          </div>
          <Link
            to="/settings"
            onClick={onClose}
            style={{
              padding: "11px 18px",
              borderRadius: 13,
              background: "#0f9b6e",
              color: "#04120c",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {t.goToSettings}
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-center" style={{ gap: 6, padding: "18px 0 6px" }}>
            <span style={{ fontSize: 34, fontWeight: 700 }}>
              {amount ? group(Number(amount) * 100) : digits(0)}
            </span>
            <span style={{ fontSize: 13, color: "rgba(232,234,236,.45)" }}>{t.tomanShort}</span>
          </div>

          <div className="flex" style={{ gap: 6, marginTop: 10 }}>
            {(["withdrawal", "deposit"] as Direction[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "11px 0",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  background: direction === d ? "#0f9b6e" : "transparent",
                  color: direction === d ? "#04120c" : "rgba(232,234,236,.7)",
                  border: `1px solid ${direction === d ? "#0f9b6e" : "rgba(255,255,255,.14)"}`,
                }}
              >
                {d === "withdrawal" ? t.withdraw : t.deposit}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
            {KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => pressKey(k)}
                className="select-none"
                style={{
                  textAlign: "center",
                  padding: "14px 0",
                  borderRadius: 14,
                  background: "rgba(255,255,255,.05)",
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                {k === "⌫" ? k : digits(k)}
              </button>
            ))}
          </div>

          <div className="flex" style={{ gap: 10, marginTop: 16 }}>
            <Field label={t.merchant}>
              <Input value={merchant} onChange={setMerchant} />
            </Field>
            <Field label={t.date}>
              <Input type="datetime-local" dir="ltr" value={occurredAt} onChange={setOccurredAt} />
            </Field>
          </div>

          <div style={{ marginTop: 10 }}>
            <Field label={t.note}>
              <Input value={note} onChange={setNote} />
            </Field>
          </div>

          {(accounts?.length ?? 0) > 1 && (
            <>
              <div style={{ fontSize: 12, color: "rgba(232,234,236,.4)", marginTop: 16 }}>{t.account}</div>
              <div className="flex flex-wrap" style={{ gap: 7, marginTop: 9 }}>
                {accounts?.map((a) => (
                  <Chip key={a.id} active={effectiveAccountId === a.id} onClick={() => setAccountId(a.id)}>
                    {accountLabel(a, fa, digits)}
                  </Chip>
                ))}
              </div>
            </>
          )}

          <div style={{ fontSize: 12, color: "rgba(232,234,236,.4)", marginTop: 16 }}>{t.category}</div>
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

          <button
            type="button"
            onClick={save}
            disabled={saving || !amount || !effectiveAccountId}
            style={{
              width: "100%",
              textAlign: "center",
              padding: "13px 0",
              borderRadius: 14,
              background: "#0f9b6e",
              color: "#04120c",
              fontSize: 13.5,
              fontWeight: 700,
              marginTop: 20,
              opacity: saving || !amount || !effectiveAccountId ? 0.5 : 1,
            }}
          >
            {queued ? t.queued : t.saveTx}
          </button>

          {error && (
            <div className="text-center" style={{ color: "#ff7a6b", fontSize: 12, marginTop: 8 }}>
              {error}
            </div>
          )}
        </>
      )}
    </Overlay>
  );
}
