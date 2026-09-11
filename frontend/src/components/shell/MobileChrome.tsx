import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "../../lib/i18n";
import { useModals } from "../../lib/modals";
import { useOnlineStatus } from "../../lib/useOnlineStatus";

/** The status strip from the phone design: currency + language chips. */
export function MobileStatusBar() {
  const { t, lang, setLang } = useI18n();
  const online = useOnlineStatus();
  const navigate = useNavigate();

  const chip = (active: boolean) => ({
    padding: "3px 9px",
    borderRadius: 99,
    fontSize: 10.5,
    fontWeight: 700 as const,
    background: active ? "#0f9b6e" : "transparent",
    color: active ? "#04120c" : "rgba(232,234,236,.55)",
  });

  return (
    <div
      className="flex flex-none items-center justify-between"
      style={{
        padding: "calc(14px + env(safe-area-inset-top)) 22px 2px",
        fontSize: 12,
        color: "rgba(232,234,236,.45)",
      }}
    >
      <Button variant="plain" size="plain" onClick={() => navigate("/settings")} className="flex items-center" style={{ gap: 7 }}>
        <span style={{ fontSize: 13, lineHeight: 1, color: "rgba(232,234,236,.45)" }}>⚙</span>
        {!online && (
          <span style={{ fontSize: 11, color: "#ff7a6b" }}>{t.offline}</span>
        )}
      </Button>

      <div className="flex items-center" style={{ gap: 6 }}>
        <span>{t.currency}</span>
        <div
          className="flex"
          style={{ gap: 2, padding: 2, borderRadius: 99, background: "rgba(255,255,255,.07)" }}
        >
          <Button variant="plain" size="plain" onClick={() => setLang("en")} style={chip(lang === "en")}>
            EN
          </Button>
          <Button variant="plain" size="plain" onClick={() => setLang("fa")} style={chip(lang === "fa")}>
            فا
          </Button>
        </div>
      </div>
    </div>
  );
}

// Icons: "UI" pack by Rajan Pyakurel on Flaticon (credited in Settings).
const TABS = [
  { to: "/", key: "navHome", end: true, icon: "home" },
  { to: "/activity", key: "navActivity", end: false, icon: "activity" },
  { to: "/people", key: "navPeople", end: false, icon: "people" },
  { to: "/reports", key: "navReports", end: false, icon: "reports" },
] as const;

/** The PNGs are black-on-transparent, so they're used as masks and tinted with `color`. */
function TabIcon({ name, size, color }: { name: string; size: number; color: string }) {
  const url = `url(/icons/tabs/${name}.png)`;
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        width: size,
        height: size,
        background: color,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

export function MobileTabBar() {
  const { t } = useI18n();
  const { openAdd } = useModals();

  function tab(item: (typeof TABS)[number]) {
    return (
      <NavLink key={item.to} to={item.to} end={item.end} className="flex-1">
        {({ isActive }) => (
          <div
            className="flex flex-col items-center"
            style={{ gap: 4, color: isActive ? "#0f9b6e" : "rgba(232,234,236,.4)" }}
          >
            <TabIcon name={item.icon} size={22} color="currentColor" />
            {t[item.key]}
          </div>
        )}
      </NavLink>
    );
  }

  return (
    <div
      className="z-30 flex flex-none items-center justify-around border-t border-line"
      style={{
        padding: "12px 18px calc(22px + env(safe-area-inset-bottom))",
        background: "#0a0c0b",
        fontSize: 10,
      }}
    >
      {tab(TABS[0])}
      {tab(TABS[1])}
      <Button variant="plain" size="plain"
        onClick={openAdd}
        aria-label={t.add}
        className="flex flex-none items-center justify-center"
        style={{
          width: 46,
          height: 46,
          borderRadius: 99,
          background: "#0f9b6e",
          marginTop: -16,
        }}
      >
        <TabIcon name="add" size={22} color="#04120c" />
      </Button>
      {tab(TABS[2])}
      {tab(TABS[3])}
    </div>
  );
}
