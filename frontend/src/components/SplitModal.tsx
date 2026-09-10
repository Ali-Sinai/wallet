import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, Chip, Overlay, OverlayHeader } from "./ui";
import { usePeople } from "../lib/queries";
import { api } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { initials, txTitle } from "../lib/domain";
import type { SplitMode, Transaction } from "../types";

type Method = "equal" | "amounts" | "percentages" | "items";

interface LineItemRow {
  id: string;
  label: string;
  amount: string; // Toman, as typed
  participant: string; // "me" or a person id
}

export default function SplitModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const { t, fa, digits, group, money, short } = useI18n();
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

  const participants = useMemo(
    () => (includeMe ? ["me", ...selected.map(String)] : selected.map(String)),
    [includeMe, selected],
  );

  const perPerson = Math.floor(total / Math.max(1, ways));

  const equalShares = useMemo(() => {
    const n = Math.max(1, ways);
    const base = Math.floor(total / n);
    const remainder = total % n;
    return participants.slice(0, n).map((key, i) => ({ key, amount: base + (i < remainder ? 1 : 0) }));
  }, [total, ways, participants]);

  const customRemaining = useMemo(
    () => total - participants.reduce((acc, k) => acc + (Number(customAmounts[k] || "0") * 100 || 0), 0),
    [customAmounts, participants, total],
  );
  const percentRemaining = useMemo(
    () => 100 - participants.reduce((acc, k) => acc + Number(percentages[k] || "0"), 0),
    [percentages, participants],
  );
  const itemsRemaining = useMemo(
    () => total - items.reduce((acc, i) => acc + (Number(i.amount || "0") * 100 || 0), 0),
    [items, total],
  );

  function nameOf(key: string): string {
    if (key === "me") return t.you;
    return people?.find((p) => String(p.id) === key)?.name ?? key;
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

  const shareColor = mode === "i_paid" ? "#3fd39a" : "#ff7a6b";
  const shareSub = mode === "i_paid" ? t.owes : t.youOwe;

  return (
    <Overlay onClose={onClose} maxWidth={520} sheetMaxHeight="88%">
      <OverlayHeader title={t.splitTitle} onClose={onClose} closeLabel={t.close} />

      <div style={{ fontSize: 16, fontWeight: 700, marginTop: 10 }}>{txTitle(tx, t.transaction)}</div>
      <div className="flex items-baseline" style={{ gap: 6 }}>
        <span style={{ fontSize: 30, fontWeight: 700 }}>{group(total)}</span>
        <span style={{ fontSize: 13, color: "rgba(232,234,236,.45)" }}>{t.tomanShort}</span>
      </div>

      <div className="flex flex-col" style={{ gap: 7, marginTop: 16 }}>
        {(
          [
            ["i_paid", t.iPaid],
            ["they_paid", t.weSplit],
          ] as [SplitMode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            style={{
              padding: "12px 15px",
              borderRadius: 13,
              fontSize: 13,
              fontWeight: 700,
              textAlign: "start",
              background: mode === m ? "#0f9b6e" : "transparent",
              color: mode === m ? "#04120c" : "rgba(232,234,236,.7)",
              border: `1px solid ${mode === m ? "#0f9b6e" : "rgba(255,255,255,.14)"}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap" style={{ gap: 6, marginTop: 12 }}>
        {(
          [
            ["equal", t.equal],
            ["amounts", t.customAmounts],
            ["percentages", t.percentages],
            ["items", t.itemized],
          ] as [Method, string][]
        ).map(([m, label]) => (
          <Chip key={m} active={method === m} onClick={() => setMethod(m)} className="px-[12px] py-[7px]">
            {label}
          </Chip>
        ))}
      </div>

      <label
        className="flex cursor-pointer items-center"
        style={{ gap: 8, marginTop: 12, fontSize: 12, color: "rgba(232,234,236,.6)" }}
      >
        <input type="checkbox" checked={includeMe} onChange={(e) => setIncludeMe(e.target.checked)} />
        {t.includeMe}
      </label>

      {method === "equal" && (
        <>
          <div style={{ fontSize: 12, color: "rgba(232,234,236,.4)", marginTop: 18 }}>{t.quick}</div>
          <div className="flex" style={{ gap: 8, marginTop: 9 }}>
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setWays(n)}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  textAlign: "center",
                  borderRadius: 15,
                  background: ways === n ? "#12241d" : "#141820",
                  border: `1px solid ${ways === n ? "#0f9b6e" : "rgba(255,255,255,.07)"}`,
                }}
              >
                <div style={{ fontSize: 17, fontWeight: 700 }}>÷{digits(n)}</div>
                <div style={{ fontSize: 10.5, color: "rgba(232,234,236,.45)", marginTop: 3 }}>
                  {short(Math.floor(total / n))}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <div style={{ fontSize: 12, color: "rgba(232,234,236,.4)", marginTop: 18 }}>{t.who}</div>
      <div className="flex flex-wrap" style={{ gap: 7, marginTop: 9 }}>
        {people?.map((p) => (
          <Chip
            key={p.id}
            active={selected.includes(p.id)}
            onClick={() =>
              setSelected((prev) => (prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]))
            }
          >
            {p.name}
          </Chip>
        ))}
      </div>

      {method === "equal" && (
        <>
          <div className="flex items-baseline justify-between" style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12, color: "rgba(232,234,236,.4)" }}>{t.perPerson}</div>
            <div style={{ fontSize: 12, color: "rgba(232,234,236,.5)" }}>
              ÷ {digits(ways)} · {group(perPerson)}
            </div>
          </div>
          <div className="flex flex-col" style={{ gap: 8, marginTop: 10 }}>
            {equalShares.map(({ key, amount }) => (
              <ShareRow
                key={key}
                name={nameOf(key)}
                sub={key === "me" ? t.settled : shareSub}
                amount={money(amount)}
                color={key === "me" ? "rgba(232,234,236,.6)" : shareColor}
              />
            ))}
          </div>
        </>
      )}

      {method === "amounts" && (
        <EditorList
          label={t.perPerson}
          remainingLabel={t.remaining}
          remainingText={money(customRemaining)}
          ok={customRemaining === 0}
        >
          {participants.map((key) => (
            <AmountRow
              key={key}
              label={nameOf(key)}
              value={customAmounts[key] ?? ""}
              onChange={(v) => setCustomAmounts((prev) => ({ ...prev, [key]: v }))}
              unit={t.tomanShort}
            />
          ))}
        </EditorList>
      )}

      {method === "percentages" && (
        <EditorList
          label={t.perPerson}
          remainingLabel={t.remaining}
          remainingText={`${digits(percentRemaining)}${fa ? "٪" : "%"}`}
          ok={percentRemaining === 0}
        >
          {participants.map((key) => (
            <AmountRow
              key={key}
              label={nameOf(key)}
              value={percentages[key] ?? ""}
              onChange={(v) => setPercentages((prev) => ({ ...prev, [key]: v }))}
              unit={fa ? "٪" : "%"}
            />
          ))}
        </EditorList>
      )}

      {method === "items" && (
        <EditorList
          label={t.itemized}
          remainingLabel={t.remaining}
          remainingText={money(itemsRemaining)}
          ok={itemsRemaining === 0}
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center"
              style={{ gap: 6, padding: "10px 12px", borderRadius: 15, background: "rgba(255,255,255,.04)" }}
            >
              <input
                value={item.label}
                onChange={(e) =>
                  setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, label: e.target.value } : i)))
                }
                placeholder={t.itemName}
                className="min-w-0 flex-1 bg-transparent outline-none"
                style={{ fontSize: 12.5 }}
              />
              <input
                type="number"
                inputMode="decimal"
                value={item.amount}
                onChange={(e) =>
                  setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, amount: e.target.value } : i)))
                }
                placeholder="0"
                className="bg-transparent font-bold outline-none"
                style={{ width: 70, fontSize: 12.5, textAlign: "end" }}
              />
              <select
                value={item.participant}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((i) => (i.id === item.id ? { ...i, participant: e.target.value } : i)),
                  )
                }
                className="rounded-lg outline-none"
                style={{ background: "rgba(0,0,0,.3)", fontSize: 11, padding: "4px 6px" }}
              >
                {participants.map((key) => (
                  <option key={key} value={key}>
                    {nameOf(key)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                style={{ color: "#ff7a6b", fontSize: 13, padding: "0 4px" }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setItems((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  label: "",
                  amount: "",
                  participant: participants[0] ?? "me",
                },
              ])
            }
            className="self-start"
            style={{ fontSize: 12, color: "#0f9b6e" }}
          >
            {t.addItem}
          </button>
        </EditorList>
      )}

      <button
        type="button"
        onClick={() => splitMutation.mutate()}
        disabled={!canSave || splitMutation.isPending}
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
          opacity: !canSave || splitMutation.isPending ? 0.5 : 1,
        }}
      >
        {t.save}
      </button>

      {splitMutation.isError && (
        <div className="text-center" style={{ color: "#ff7a6b", fontSize: 12, marginTop: 8 }}>
          {(splitMutation.error as Error).message}
        </div>
      )}
    </Overlay>
  );
}

function ShareRow({
  name,
  sub,
  amount,
  color,
}: {
  name: string;
  sub: string;
  amount: string;
  color: string;
}) {
  return (
    <div
      className="flex items-center"
      style={{ gap: 11, padding: "12px 14px", borderRadius: 15, background: "rgba(255,255,255,.04)" }}
    >
      <Avatar size={32} color={color} background="#1a201e">
        {initials(name)}
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: "rgba(232,234,236,.4)", marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color }}>{amount}</div>
    </div>
  );
}

function EditorList({
  label,
  remainingLabel,
  remainingText,
  ok,
  children,
}: {
  label: string;
  remainingLabel: string;
  remainingText: string;
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <div style={{ fontSize: 12, color: "rgba(232,234,236,.4)", marginTop: 18 }}>{label}</div>
      <div className="flex flex-col" style={{ gap: 8, marginTop: 9 }}>
        {children}
        <div className="flex justify-between" style={{ fontSize: 12, marginTop: 2 }}>
          <span style={{ color: "rgba(232,234,236,.4)" }}>{remainingLabel}</span>
          <span style={{ color: ok ? "#3fd39a" : "#ff7a6b", fontWeight: 700 }}>{remainingText}</span>
        </div>
      </div>
    </>
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
    <div
      className="flex items-center"
      style={{ gap: 11, padding: "10px 14px", borderRadius: 15, background: "rgba(255,255,255,.04)" }}
    >
      <div className="min-w-0 flex-1 truncate" style={{ fontSize: 13, fontWeight: 700 }}>
        {label}
      </div>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="bg-transparent font-bold outline-none"
        style={{ width: 96, fontSize: 13.5, textAlign: "end" }}
      />
      <span style={{ fontSize: 12, color: "rgba(232,234,236,.45)" }}>{unit}</span>
    </div>
  );
}
