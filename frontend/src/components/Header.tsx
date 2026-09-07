import { useOnlineStatus } from "../lib/useOnlineStatus";
import { useModals } from "../lib/modals";

export default function Header({ title }: { title: string }) {
  const online = useOnlineStatus();
  const { openAdd } = useModals();

  return (
    <>
      <div className="sticky top-0 z-20 backdrop-blur bg-bg/85 border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center gap-3">
          <div className="text-lg font-bold">{title}</div>
          <div className="flex-1" />
          <button
            onClick={openAdd}
            className="px-3.5 py-2 rounded-xl bg-accent text-[#04120c] text-[13px] font-bold"
          >
            ثبت دستی
          </button>
        </div>
      </div>
      {!online && (
        <div className="max-w-lg mx-auto px-4 py-2 text-[11px] text-center text-expense bg-expense/10">
          آفلاین — نمایش آخرین داده‌های دریافتی
        </div>
      )}
    </>
  );
}
