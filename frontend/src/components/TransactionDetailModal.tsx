import { useState } from "react";
import { DateTimeField } from "@/components/DateFields";
import { ActionButton, Chip, DARK_LABEL, Field, Input, Overlay, OverlayHeader, Select, SubLabel } from "@/components/primitives";
import { useFamily } from "../lib/theme";
import {
  useAccounts,
  useCategories,
  useCategorizeMutation,
  useDeleteSplitMutation,
  useDeleteTransactionMutation,
  useLiveTransaction,
  useTransactionSplit,
  useUpdateTransactionMutation,
} from "../lib/queries";
import { useI18n } from "../lib/i18n";
import { accountLabel, categoryName, parseApiDate, signedCents, txTitle } from "../lib/domain";
import type { Direction, Transaction } from "../types";

function formFrom(tx: Transaction) {
  return {
    amount: String(Math.round(tx.amount_cents / 100)),
    direction: tx.direction as Direction,
    account_id: String(tx.account_id),
    occurred_at: parseApiDate(tx.occurred_at),
    merchant_text: tx.merchant_text ?? "",
    note: tx.note ?? "",
    category_id: tx.category_id === null ? "" : String(tx.category_id),
  };
}

export default function TransactionDetailModal({
  tx: snapshot,
  onClose,
  onSplit,
}: {
  tx: Transaction;
  onClose: () => void;
  onSplit: () => void;
}) {
  const { t, fa, digits, money, localize } = useI18n();
  const tx = useLiveTransaction(snapshot);
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const { data: split } = useTransactionSplit(tx.is_shared ? tx.id : null);

  const categorize = useCategorizeMutation();
  const update = useUpdateTransactionMutation();
  const remove = useDeleteTransactionMutation();
  const deleteSplit = useDeleteSplitMutation();

  const [editing, setEditing] = useState(false);
  const family = useFamily();
  const [form, setForm] = useState(() => formFrom(tx));

  const signed = signedCents(tx);
  const account = accounts?.find((a) => a.id === tx.account_id);

  function save() {
    if (!form.amount || !form.account_id) return;
    update.mutate(
      {
        id: tx.id,
        amount_cents: Math.round(Number(form.amount) * 100),
        direction: form.direction,
        account_id: Number(form.account_id),
        occurred_at: form.occurred_at.toISOString(),
        category_id: form.category_id ? Number(form.category_id) : null,
        note: form.note || null,
        merchant_text: form.merchant_text || null,
      },
      { onSuccess: () => setEditing(false) },
    );
  }

  return (
    <Overlay onClose={onClose} maxWidth={460} sheetMaxHeight="86%">
      <OverlayHeader title={t.detail} onClose={onClose} closeLabel={t.close} />

      {editing ? (
        <div className="flex flex-col" style={{ gap: 12, marginTop: 14 }}>
          <div className="flex" style={{ gap: 10 }}>
            <Field label={t.amount}>
              <Input
                type="number"
                dir="ltr"
                value={form.amount}
                onChange={(v) => setForm({ ...form, amount: v })}
              />
            </Field>
            <Field label={t.category}>
              <Select
                value={form.direction}
                onChange={(v) => setForm({ ...form, direction: v as Direction })}
                options={[
                  { value: "withdrawal", label: t.withdraw },
                  { value: "deposit", label: t.deposit },
                ]}
              />
            </Field>
          </div>

          <Field label={t.account}>
            <Select
              value={form.account_id}
              onChange={(v) => setForm({ ...form, account_id: v })}
              options={(accounts ?? []).map((a) => ({
                value: String(a.id),
                label: accountLabel(a, fa, digits),
              }))}
            />
          </Field>

          <Field label={t.date}>
            <DateTimeField value={form.occurred_at} onChange={(v) => setForm({ ...form, occurred_at: v })} />
          </Field>

          <Field label={t.merchant}>
            <Input value={form.merchant_text} onChange={(v) => setForm({ ...form, merchant_text: v })} />
          </Field>

          <Field label={t.note}>
            <Input value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
          </Field>

          <div className="flex" style={{ gap: 8, marginTop: 6 }}>
            <ActionButton onClick={save} busy={update.isPending} grow>
              {t.saveChanges}
            </ActionButton>
            <ActionButton tone="outline" onClick={() => setEditing(false)}>
              {t.cancel}
            </ActionButton>
          </div>
        </div>
      ) : (
        <>
          <Headline title={txTitle(tx, t.transaction)} amount={money(signed, true)} color={signed < 0 ? "var(--c-expense)" : "var(--c-income)"} />

          <div className="flex" style={{ gap: 10, marginTop: 16 }}>
            <InfoBox label={t.account} value={accountLabel(account, fa, digits)} />
            <InfoBox label={t.date} value={localize(tx.occurred_at_jalali)} />
          </div>

          {tx.note && (
            <div className="flex" style={{ gap: 10, marginTop: 10 }}>
              <InfoBox label={t.note} value={tx.note} />
            </div>
          )}

          <SubLabel top={18}>{t.category}</SubLabel>
          <div className="flex flex-wrap" style={{ gap: 7, marginTop: 9 }}>
            {categories?.map((c) => (
              <Chip
                key={c.id}
                active={tx.category_id === c.id}
                onClick={() => categorize.mutate({ id: tx.id, categoryId: c.id })}
              >
                {categoryName(c, fa, "")}
              </Chip>
            ))}
          </div>

          <div className="flex flex-wrap" style={{ gap: 8, marginTop: family === "dark" ? 32 : 22 }}>
            {tx.direction === "withdrawal" && !tx.is_shared && (
              <ActionButton onClick={onSplit} grow>
                {t.splitBtn}
              </ActionButton>
            )}

            {tx.is_shared && split && (
              <ActionButton tone="outline" grow onClick={() => deleteSplit.mutate(split.id)} busy={deleteSplit.isPending}>
                {t.unsplit}
              </ActionButton>
            )}

            <ActionButton
              tone="outline"
              onClick={() => {
                setForm(formFrom(tx));
                setEditing(true);
              }}
            >
              {t.edit}
            </ActionButton>

            <ActionButton tone="danger" onClick={() => remove.mutate(tx.id, { onSuccess: onClose })} busy={remove.isPending}>
              {t.delete}
            </ActionButton>
          </div>

          {deleteSplit.isError && (
            <div className="text-center" style={{ color: "var(--c-expense)", fontSize: 12, marginTop: 10 }}>
              {(deleteSplit.error as Error).message}
            </div>
          )}
        </>
      )}
    </Overlay>
  );
}

/** Merchant and signed amount: bold (classic), oversized thin (Dark), centred (Soft). */
function Headline({ title, amount, color }: { title: string; amount: string; color: string }) {
  const family = useFamily();
  if (family === "dark") {
    return (
      <div style={{ paddingTop: 22 }}>
        <div style={{ fontSize: 17 }}>{title}</div>
        <div style={{ fontSize: "clamp(36px, 12vw, 52px)", fontWeight: 300, letterSpacing: "-.03em", lineHeight: 1, marginTop: 12, color, whiteSpace: "nowrap" }}>
          {amount}
        </div>
      </div>
    );
  }
  if (family === "soft") {
    return (
      <div className="flex flex-col items-center text-center" style={{ paddingTop: 18 }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--c-surface)", boxShadow: "0 6px 18px rgba(0,0,0,.06)", fontSize: 18, fontWeight: 600 }}
        >
          {Array.from(title)[0] ?? "·"}
        </div>
        <div style={{ fontSize: 20, fontWeight: 600, marginTop: 12 }}>{title}</div>
        <div style={{ fontSize: 30, fontWeight: 600, marginTop: 2, color }}>{amount}</div>
      </div>
    );
  }
  return (
    <>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>{title}</div>
      <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4, color }}>{amount}</div>
    </>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  const family = useFamily();
  if (family === "dark") {
    return (
      <div style={{ flex: 1, minWidth: 0, paddingTop: 12, borderTop: "1px solid rgb(var(--ink-rgb) / .12)" }}>
        <div style={{ ...DARK_LABEL, fontSize: 10.5 }}>{label}</div>
        <div className="truncate" style={{ fontSize: 14, marginTop: 6 }}>
          {value}
        </div>
      </div>
    );
  }
  if (family === "soft") {
    return (
      <div style={{ flex: 1, minWidth: 0, padding: "14px 16px", borderRadius: 20, background: "var(--c-surface)", boxShadow: "0 6px 18px rgba(0,0,0,.05)" }}>
        <div style={{ fontSize: 12, color: "rgb(var(--fg-rgb) / .55)" }}>{label}</div>
        <div className="truncate" style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>
          {value}
        </div>
      </div>
    );
  }
  return (
    <div style={{ flex: 1, padding: "12px 14px", borderRadius: 14, background: "rgb(var(--ink-rgb) / .04)" }}>
      <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .45)" }}>{label}</div>
      <div className="truncate" style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>
        {value}
      </div>
    </div>
  );
}
