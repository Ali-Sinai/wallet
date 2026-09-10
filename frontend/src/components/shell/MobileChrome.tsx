import { NavLink, useNavigate } from "react-router-dom";
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
      <button type="button" onClick={() => navigate("/settings")} className="flex items-center" style={{ gap: 7 }}>
        <span style={{ fontSize: 13, lineHeight: 1, color: "rgba(232,234,236,.45)" }}>⚙</span>
        {!online && (
          <span style={{ fontSize: 11, color: "#ff7a6b" }}>{t.offline}</span>
        )}
      </button>

      <div className="flex items-center" style={{ gap: 6 }}>
        <span>{t.currency}</span>
        <div
          className="flex"
          style={{ gap: 2, padding: 2, borderRadius: 99, background: "rgba(255,255,255,.07)" }}
        >
          <button type="button" onClick={() => setLang("en")} style={chip(lang === "en")}>
            EN
          </button>
          <button type="button" onClick={() => setLang("fa")} style={chip(lang === "fa")}>
            فا
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { to: "/", key: "navHome", end: true, radius: 6 },
  { to: "/activity", key: "navActivity", end: false, radius: 6 },
  { to: "/people", key: "navPeople", end: false, radius: 99 },
  { to: "/reports", key: "navReports", end: false, radius: 3 },
] as const;

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
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: item.radius,
                background: isActive ? "#0f9b6e" : "transparent",
                border: `1.5px solid ${isActive ? "#0f9b6e" : "rgba(232,234,236,.4)"}`,
              }}
            />
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
      <button
        type="button"
        onClick={openAdd}
        className="flex flex-none items-center justify-center"
        style={{
          width: 46,
          height: 46,
          borderRadius: 99,
          background: "#0f9b6e",
          color: "#04120c",
          fontSize: 24,
          fontWeight: 700,
          marginTop: -16,
        }}
      >
        +
      </button>
      {tab(TABS[2])}
      {tab(TABS[3])}
    </div>
  );
}
