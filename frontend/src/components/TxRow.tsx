import { useI18n } from "../lib/i18n";
import { useModals } from "../lib/modals";
import { accountLabel, categoryColor, categoryName, signedCents, txTitle } from "../lib/domain";
import type { Account, Category, Transaction } from "../types";

interface RowProps {
  tx: Transaction;
  categories?: Category[];
  accounts?: Account[];
  /** The phone rows drop the account from the meta line. */
  withAccount?: boolean;
}

function useRowModel({ tx, categories, accounts, withAccount = true }: RowProps) {
  const { t, fa, money, digits, localize } = useI18n();
  const category = categories?.find((c) => c.id === tx.category_id);
  const account = accounts?.find((a) => a.id === tx.account_id);
  const signed = signedCents(tx);
  const catLabel = categoryName(category, fa, t.uncategorized);
  return {
    title: txTitle(tx, t.transaction),
    meta: withAccount && account ? `${catLabel} · ${accountLabel(account, fa, digits)}` : catLabel,
    amount: money(signed, true),
    color: signed < 0 ? "#ff7a6b" : "#3fd39a",
    accent: categoryColor(category),
    date: localize(tx.occurred_at_jalali),
  };
}

/** Activity row from Wallet Web.dc.html. */
export function TxRowDesktop(props: RowProps) {
  const { endAlign } = useI18n();
  const { openDetail } = useModals();
  const m = useRowModel(props);

  return (
    <div
      onClick={() => openDetail(props.tx)}
      className="grid cursor-pointer items-center"
      style={{
        gridTemplateColumns: "4px minmax(0,1fr) auto",
        gap: 14,
        padding: "13px 0",
        borderBottom: "1px solid rgba(255,255,255,.05)",
      }}
    >
      <div style={{ width: 4, height: 30, borderRadius: 2, background: m.accent }} />
      <div className="min-w-0">
        <div className="truncate" style={{ fontSize: 14, fontWeight: 700 }}>
          {m.title}
        </div>
        <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.42)", marginTop: 3 }}>{m.meta}</div>
      </div>
      <div style={{ textAlign: endAlign }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: m.color }}>{m.amount}</div>
        <div style={{ fontSize: 11, color: "rgba(232,234,236,.35)", marginTop: 3 }}>{m.date}</div>
      </div>
    </div>
  );
}

/** Activity / recent row from Toman Tracker App.dc.html. */
export function TxRowMobile(props: RowProps) {
  const { openDetail } = useModals();
  const m = useRowModel(props);

  return (
    <div
      onClick={() => openDetail(props.tx)}
      className="flex cursor-pointer items-center"
      style={{ gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}
    >
      <div className="flex-none" style={{ width: 3, height: 26, borderRadius: 2, background: m.accent }} />
      <div className="min-w-0 flex-1">
        <div className="truncate" style={{ fontSize: 13.5, fontWeight: 700 }}>
          {m.title}
        </div>
        <div className="truncate" style={{ fontSize: 11, color: "rgba(232,234,236,.42)", marginTop: 2 }}>
          {m.meta}
        </div>
      </div>
      <div className="flex-none" style={{ textAlign: "end" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.amount}</div>
        <div style={{ fontSize: 10.5, color: "rgba(232,234,236,.35)" }}>{m.date}</div>
      </div>
    </div>
  );
}
