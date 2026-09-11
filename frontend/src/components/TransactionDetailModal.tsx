import { useState } from "react";
import { DateTimeField } from "@/components/DateFields";
import { Button } from "@/components/ui/button";
import { BusyLabel, Chip, Field, Input, Overlay, OverlayHeader, Select } from "@/components/primitives";
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
            <Button variant="plain" size="plain"
              onClick={save}
              disabled={update.isPending}
              aria-busy={update.isPending}
              style={{
                flex: 1,
                textAlign: "center",
                padding: "12px 0",
                borderRadius: 14,
                background: "#0f9b6e",
                color: "#04120c",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <BusyLabel busy={update.isPending}>{t.saveChanges}</BusyLabel>
            </Button>
            <Button variant="plain" size="plain"
              onClick={() => setEditing(false)}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.14)",
                color: "rgba(232,234,236,.7)",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {t.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>{txTitle(tx, t.transaction)}</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginTop: 4, color: signed < 0 ? "#ff7a6b" : "#3fd39a" }}>
            {money(signed, true)}
          </div>

          <div className="flex" style={{ gap: 10, marginTop: 16 }}>
            <InfoBox label={t.account} value={accountLabel(account, fa, digits)} />
            <InfoBox label={t.date} value={localize(tx.occurred_at_jalali)} />
          </div>

          {tx.note && (
            <div className="flex" style={{ gap: 10, marginTop: 10 }}>
              <InfoBox label={t.note} value={tx.note} />
            </div>
          )}

          <div style={{ fontSize: 12, color: "rgba(232,234,236,.4)", marginTop: 18 }}>{t.category}</div>
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

          <div className="flex flex-wrap" style={{ gap: 8, marginTop: 22 }}>
            {tx.direction === "withdrawal" && !tx.is_shared && (
              <Button variant="plain" size="plain"
                onClick={onSplit}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 14,
                  background: "#0f9b6e",
                  color: "#04120c",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {t.splitBtn}
              </Button>
            )}

            {tx.is_shared && split && (
              <Button variant="plain" size="plain"
                onClick={() => deleteSplit.mutate(split.id)}
                disabled={deleteSplit.isPending}
                aria-busy={deleteSplit.isPending}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "12px 0",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.14)",
                  color: "rgba(232,234,236,.8)",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <BusyLabel busy={deleteSplit.isPending}>{t.unsplit}</BusyLabel>
              </Button>
            )}

            <Button variant="plain" size="plain"
              onClick={() => {
                setForm(formFrom(tx));
                setEditing(true);
              }}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.14)",
                color: "rgba(232,234,236,.8)",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {t.edit}
            </Button>

            <Button variant="plain" size="plain"
              onClick={() => remove.mutate(tx.id, { onSuccess: onClose })}
              disabled={remove.isPending}
              aria-busy={remove.isPending}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,122,107,.35)",
                color: "#ff7a6b",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <BusyLabel busy={remove.isPending}>{t.delete}</BusyLabel>
            </Button>
          </div>

          {deleteSplit.isError && (
            <div className="text-center" style={{ color: "#ff7a6b", fontSize: 12, marginTop: 10 }}>
              {(deleteSplit.error as Error).message}
            </div>
          )}
        </>
      )}
    </Overlay>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,.04)" }}>
      <div style={{ fontSize: 11, color: "rgba(232,234,236,.45)" }}>{label}</div>
      <div className="truncate" style={{ fontSize: 13, fontWeight: 700, marginTop: 3 }}>
        {value}
      </div>
    </div>
  );
}
