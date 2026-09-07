import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "داشبورد", icon: "🏠", end: true },
  { to: "/activity", label: "تراکنش‌ها", icon: "📋", end: false },
  { to: "/people", label: "افراد", icon: "🤝", end: false },
  { to: "/reports", label: "گزارش", icon: "📊", end: false },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#0b0d0c]/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-lg mx-auto grid grid-cols-4">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${
                isActive ? "text-accent" : "text-muted"
              }`
            }
          >
            <span className="text-lg leading-none">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
