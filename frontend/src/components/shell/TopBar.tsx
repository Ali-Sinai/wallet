import { NavLink, useNavigate } from "react-router-dom";
import { useI18n } from "../../lib/i18n";
import { useModals } from "../../lib/modals";
import { useUncategorized } from "../../lib/queries";

const NAV = [
  { to: "/", key: "dash", end: true },
  { to: "/activity", key: "activity", end: false },
  { to: "/people", key: "people", end: false },
  { to: "/reports", key: "reports", end: false },
] as const;

export function Wordmark({ size = 21 }: { size?: number }) {
  const { t } = useI18n();
  return (
    <div className="flex items-end" style={{ gap: 3 }}>
      <div style={{ fontSize: size, fontWeight: 700, letterSpacing: "-.9px", lineHeight: 1 }}>
        {t.appName}
      </div>
      <div
        className="flex-none bg-accent"
        style={{ width: 6, height: 6, borderRadius: 2, marginBottom: 3 }}
      />
    </div>
  );
}

export default function TopBar() {
  const { t, toggle, digits } = useI18n();
  const { openAdd } = useModals();
  const { data: uncategorized } = useUncategorized();
  const navigate = useNavigate();
  const pendingCount = uncategorized?.length ?? 0;

  return (
    <div
      className="sticky top-0 z-20 border-b border-line"
      style={{ backdropFilter: "blur(14px)", background: "rgba(8,9,10,.82)" }}
    >
      <div
        className="mx-auto flex flex-wrap items-center"
        style={{ maxWidth: 1240, padding: "14px 28px", gap: 26 }}
      >
        <Wordmark />

        <div className="flex flex-wrap" style={{ gap: 4 }}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              {({ isActive }) => (
                <div
                  style={{
                    padding: "8px 15px",
                    borderRadius: 10,
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: isActive ? "#04120c" : "rgba(232,234,236,.62)",
                    background: isActive ? "#0f9b6e" : "transparent",
                  }}
                >
                  {t[item.key]}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        <div className="flex-1" style={{ minWidth: 12 }} />

        <div className="flex items-center" style={{ gap: 10 }}>
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => navigate("/review")}
              className="flex items-center"
              style={{
                gap: 7,
                padding: "7px 12px",
                borderRadius: 99,
                background: "#101a16",
                border: "1px solid rgba(15,155,110,.35)",
                fontSize: 12,
                fontWeight: 700,
                color: "#3fd39a",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 99, background: "#0f9b6e" }} />
              {t.uncategorized} {digits(pendingCount)}
            </button>
          )}

          <button
            type="button"
            onClick={openAdd}
            style={{
              padding: "8px 13px",
              borderRadius: 10,
              background: "#0f9b6e",
              color: "#04120c",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {t.add}
          </button>

          <button
            type="button"
            onClick={toggle}
            style={{
              padding: "7px 11px",
              border: "1px solid rgba(232,234,236,.16)",
              borderRadius: 99,
              color: "rgba(232,234,236,.65)",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {t.langLabel}
          </button>

          <NavLink
            to="/settings"
            title={t.settings}
            style={{
              padding: "7px 11px",
              border: "1px solid rgba(232,234,236,.16)",
              borderRadius: 99,
              color: "rgba(232,234,236,.65)",
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            ⚙
          </NavLink>
        </div>
      </div>
    </div>
  );
}
