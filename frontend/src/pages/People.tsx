import Header from "../components/Header";
import { usePeopleBalances, useSettleAllMutation } from "../lib/queries";
import { formatToman } from "../lib/money";

export default function People() {
  const { data: balances, isLoading } = usePeopleBalances();
  const settleAll = useSettleAllMutation();

  const owedToMe = balances?.filter((b) => b.net_cents > 0).reduce((a, b) => a + b.net_cents, 0) ?? 0;
  const iOwe = balances?.filter((b) => b.net_cents < 0).reduce((a, b) => a + Math.abs(b.net_cents), 0) ?? 0;

  return (
    <div className="max-w-lg mx-auto pb-24">
      <Header title="افراد" />
      <div className="px-4 mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3.5">
          <div className="p-4.5 rounded-card bg-card border" style={{ borderColor: "rgba(63,211,154,.25)" }}>
            <div className="text-[11.5px] text-muted">طلب من</div>
            <div className="text-2xl font-bold mt-2 text-income">{formatToman(owedToMe)}</div>
          </div>
          <div className="p-4.5 rounded-card bg-card border" style={{ borderColor: "rgba(255,122,107,.25)" }}>
            <div className="text-[11.5px] text-muted">بدهی من</div>
            <div className="text-2xl font-bold mt-2 text-expense">{formatToman(iOwe)}</div>
          </div>
        </div>

        <div className="p-4.5 rounded-card bg-card border border-border">
          <div className="text-[15px] font-bold">افراد</div>
          {isLoading && <div className="text-center text-muted py-6 text-sm">در حال بارگذاری…</div>}
          <div className="flex flex-col mt-2">
            {balances?.map((b) => (
              <div key={b.person_id} className="flex items-center gap-3 py-3.5 border-b border-border last:border-0">
                <div className="w-9 h-9 rounded-pill bg-[#161c1a] flex items-center justify-center text-xs font-bold flex-none">
                  {b.name.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{b.name}</div>
                  <div className="text-[11.5px] text-mutedSoft mt-0.5">
                    {b.net_cents > 0 ? "بدهکار به شما" : b.net_cents < 0 ? "بدهی شما" : "تسویه"}
                  </div>
                </div>
                <div className={`text-sm font-bold ${b.net_cents >= 0 ? "text-income" : "text-expense"}`}>
                  {formatToman(b.net_cents)}
                </div>
                {b.open_debt_count > 0 && (
                  <button
                    onClick={() => settleAll.mutate(b.person_id)}
                    className="px-3 py-2 rounded-xl border border-border text-xs font-bold text-text/80"
                  >
                    تسویه
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
