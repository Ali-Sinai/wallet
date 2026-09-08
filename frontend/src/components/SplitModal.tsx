import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal, { ModalHeader } from "./Modal";
import { usePeople } from "../lib/queries";
import { api } from "../lib/api";
import { formatToman, toPersianDigits } from "../lib/money";
import type { SplitMode, Transaction } from "../types";

type Method = "equal" | "amounts" | "percentages" | "items";

interface LineItemRow {
  id: string;
  label: string;
  amount: string; // Toman, as typed
  participant: string; // "me" or person id as string
}

export default function SplitModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const { data: people } = usePeople();
  const qc = useQueryClient();

  const [mode, setMode] = useState<SplitMode>("i_paid");
  const [method, setMethod] = useState<Method>("equal");
  const [includeMe, setIncludeMe] = useState(true);
  const [selected, setSelected] = useState<number[]>([]);
  const [ways, setWays] = useState(2);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [items, setItems] = useState<LineItemRow[]>([]);

  const total = tx.amount_cents;

  function toggle(personId: number) {
    setSelected((prev) => (prev.includes(personId) ? prev.filter((p) => p !== personId) : [...prev, personId]));
  }

  const participants = useMemo(() => {
    const keys = includeMe ? ["me", ...selected.map(String)] : selected.map(String);
    return keys;
  }, [includeMe, selected]);

  const equalShares = useMemo(() => {
    const n = Math.max(1, ways);
    const base = Math.floor(total / n);
    const remainder = total % n;
    const keys = participants.slice(0, n);
    return keys.map((k, i) => ({ key: k, amount: base + (i < remainder ? 1 : 0) }));
  }, [total, ways, participants]);

  const customRemaining = useMemo(() => {
    const sum = participants.reduce((acc, k) => acc + (Number(customAmounts[k] || "0") * 100 || 0), 0);
    return total - sum;
  }, [customAmounts, participants, total]);

  const percentRemaining = useMemo(() => {
    const sum = participants.reduce((acc, k) => acc + Number(percentages[k] || "0"), 0);
    return 100 - sum;
  }, [percentages, participants]);

  const itemsRemaining = useMemo(() => {
    const sum = items.reduce((acc, i) => acc + (Number(i.amount || "0") * 100 || 0), 0);
    return total - sum;
  }, [items, total]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", amount: "", participant: participants[0] ?? "me" },
    ]);
  }

  function updateItem(id: string, patch: Partial<LineItemRow>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const splitMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        mode,
        include_me: includeMe,
        participant_person_ids: selected,
      };
      if (method === "equal") {
        body.method = "equal";
      } else if (method === "amounts") {
        body.method = "custom";
        body.custom_amounts = Object.fromEntries(
          participants.map((k) => [k, Math.round(Number(customAmounts[k] || "0") * 100)]),
        );
      } else if (method === "percentages") {
        body.method = "percentage";
        body.percentages = Object.fromEntries(participants.map((k) => [k, Number(percentages[k] || "0")]));
      } else {
        body.method = "itemized";
        body.line_items = items
          .filter((i) => i.amount)
          .map((i) => ({
            participant: i.participant,
            amount_cents: Math.round(Number(i.amount) * 100),
            label: i.label || null,
          }));
      }
      return api.post(`/transactions/${tx.id}/split`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["people"] });
      qc.invalidateQueries({ queryKey: ["debts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
  });

  const canSave =
    selected.length > 0 &&
    (method !== "amounts" || customRemaining === 0) &&
    (method !== "percentages" || percentRemaining === 0) &&
    (method !== "items" || (items.length > 0 && itemsRemaining === 0));

  return (
    <Modal onClose={onClose} maxWidth={520}>
      <ModalHeader title="تقسیم هزینه" onClose={onClose} />
      <div className="text-base font-bold mt-2">{tx.merchant_text ?? tx.note ?? "تراکنش"}</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[30px] font-bold">{formatToman(total)}</span>
        <span className="text-[13px] text-muted">ت</span>
      </div>

      <div className="flex flex-col gap-1.5 mt-4">
        {(
          [
            ["i_paid", "من پرداخت کردم، آن‌ها بدهکارند"],
            ["they_paid", "آن‌ها پرداخت کردند، من بدهکارم"],
          ] as [SplitMode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-3 rounded-2xl text-[13px] font-bold text-right border ${
              mode === m ? "bg-accent text-[#04120c] border-accent" : "border-border text-text/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 mt-4">
        {(
          [
            ["equal", "برابر"],
            ["amounts", "مبلغ دلخواه"],
            ["percentages", "درصد"],
            ["items", "آیتمی"],
          ] as [Method, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border ${
              method === m ? "bg-accent text-[#04120c] border-accent" : "border-border text-text/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 mt-3 text-xs text-text/70">
        <input type="checkbox" checked={includeMe} onChange={(e) => setIncludeMe(e.target.checked)} />
        شامل خودم شود
      </label>

      {method === "equal" && (
        <>
          <div className="text-xs text-muted mt-4">تقسیم سریع</div>
          <div className="flex gap-2 mt-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setWays(n)}
                className={`flex-1 py-3 text-center rounded-2xl border ${
                  ways === n ? "bg-[#12241d] border-accent" : "border-border"
                }`}
              >
                <div className="text-[17px] font-bold">÷{toPersianDigits(String(n))}</div>
                <div className="text-[10.5px] text-muted mt-0.5">{formatToman(Math.floor(total / n))}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="text-xs text-muted mt-4">با چه کسی؟</div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {people?.map((p) => (
          <button
            key={p.id}
            onClick={() => toggle(p.id)}
            className={`px-3 py-2 rounded-pill text-xs font-bold border ${
              selected.includes(p.id) ? "bg-accent text-[#04120c] border-accent" : "border-border text-text/70"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {method === "equal" && (
        <div className="flex flex-col gap-2 mt-4">
          {equalShares.map(({ key, amount }) => (
            <ShareRow key={key} name={key === "me" ? "شما" : people?.find((p) => String(p.id) === key)?.name ?? key}>
              {formatToman(amount)}
            </ShareRow>
          ))}
        </div>
      )}

      {method === "amounts" && (
        <div className="flex flex-col gap-2 mt-4">
          {participants.map((key) => (
            <AmountRow
              key={key}
              label={key === "me" ? "شما" : people?.find((p) => String(p.id) === key)?.name ?? key}
              value={customAmounts[key] ?? ""}
              onChange={(v) => setCustomAmounts((prev) => ({ ...prev, [key]: v }))}
              unit="ت"
            />
          ))}
          <div className="flex justify-between text-xs mt-1">
            <span className="text-muted">باقی‌مانده</span>
            <span className={customRemaining === 0 ? "text-income" : "text-expense"}>
              {formatToman(customRemaining)}
            </span>
          </div>
        </div>
      )}

      {method === "percentages" && (
        <div className="flex flex-col gap-2 mt-4">
          {participants.map((key) => (
            <AmountRow
              key={key}
              label={key === "me" ? "شما" : people?.find((p) => String(p.id) === key)?.name ?? key}
              value={percentages[key] ?? ""}
              onChange={(v) => setPercentages((prev) => ({ ...prev, [key]: v }))}
              unit="٪"
            />
          ))}
          <div className="flex justify-between text-xs mt-1">
            <span className="text-muted">باقی‌مانده</span>
            <span className={percentRemaining === 0 ? "text-income" : "text-expense"}>
              {toPersianDigits(String(percentRemaining))}٪
            </span>
          </div>
        </div>
      )}

      {method === "items" && (
        <div className="flex flex-col gap-2 mt-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5 p-2.5 rounded-2xl bg-white/5">
              <input
                value={item.label}
                onChange={(e) => updateItem(item.id, { label: e.target.value })}
                placeholder="نام آیتم"
                className="flex-1 min-w-0 bg-transparent text-[12.5px] outline-none"
              />
              <input
                type="number"
                inputMode="decimal"
                value={item.amount}
                onChange={(e) => updateItem(item.id, { amount: e.target.value })}
                placeholder="۰"
                className="w-16 bg-transparent text-left text-[12.5px] font-bold outline-none"
              />
              <select
                value={item.participant}
                onChange={(e) => updateItem(item.id, { participant: e.target.value })}
                className="bg-black/30 rounded-lg text-[11px] px-1 py-1 outline-none"
              >
                {participants.map((key) => (
                  <option key={key} value={key}>
                    {key === "me" ? "شما" : people?.find((p) => String(p.id) === key)?.name ?? key}
                  </option>
                ))}
              </select>
              <button onClick={() => removeItem(item.id)} className="text-expense text-xs px-1">
                ×
              </button>
            </div>
          ))}
          <button onClick={addItem} className="text-xs text-accent self-start">
            + افزودن آیتم
          </button>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-muted">باقی‌مانده</span>
            <span className={itemsRemaining === 0 ? "text-income" : "text-expense"}>
              {formatToman(itemsRemaining)}
            </span>
          </div>
        </div>
      )}

      <button
        onClick={() => splitMutation.mutate()}
        disabled={!canSave || splitMutation.isPending}
        className="w-full text-center py-3 rounded-2xl bg-accent text-[#04120c] font-bold text-sm mt-5 disabled:opacity-50"
      >
        ثبت رکوردها
      </button>
      {splitMutation.isError && (
        <div className="text-expense text-xs text-center mt-2">{(splitMutation.error as Error).message}</div>
      )}
    </Modal>
  );
}

function ShareRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl bg-white/5">
      <div className="flex-1 text-[13px] font-bold">{name}</div>
      <div className="text-[13.5px] font-bold">{children}</div>
    </div>
  );
}

function AmountRow({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/5">
      <div className="flex-1 text-[13px] font-bold">{label}</div>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-24 bg-transparent text-left text-[13.5px] font-bold outline-none"
        placeholder="۰"
      />
      <span className="text-xs text-muted">{unit}</span>
    </div>
  );
}
