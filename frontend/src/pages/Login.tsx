import { useState, type FormEvent } from "react";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { Wordmark } from "../components/shell/TopBar";

export default function Login() {
  const { login, loginError } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(username, password);
    } catch {
      // loginError is set by the auth provider.
    } finally {
      setBusy(false);
    }
  }

  const field = {
    borderRadius: 14,
    background: "#0e1110",
    border: "1px solid rgba(255,255,255,.07)",
    padding: "13px 16px",
    fontSize: 13.5,
    color: "#e8eaec",
    outline: "none",
  } as const;

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: "radial-gradient(90% 60% at 50% 0%,#12241d 0%,#08090a 60%)" }}
    >
      <form onSubmit={onSubmit} className="flex w-full flex-col" style={{ maxWidth: 340, gap: 10 }}>
        <div className="flex justify-center" style={{ marginBottom: 18 }}>
          <Wordmark size={26} />
        </div>

        <input
          style={field}
          placeholder={t.username}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
        />
        <input
          style={field}
          placeholder={t.password}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {loginError && (
          <div className="text-center" style={{ color: "#ff7a6b", fontSize: 12 }}>
            {loginError}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            borderRadius: 14,
            background: "#0f9b6e",
            color: "#04120c",
            fontWeight: 700,
            padding: "13px 0",
            fontSize: 13.5,
            marginTop: 6,
            opacity: busy ? 0.5 : 1,
          }}
        >
          {t.login}
        </button>

        <button
          type="button"
          onClick={() => setLang(lang === "fa" ? "en" : "fa")}
          className="self-center"
          style={{
            marginTop: 10,
            padding: "6px 12px",
            border: "1px solid rgba(232,234,236,.16)",
            borderRadius: 99,
            color: "rgba(232,234,236,.65)",
            fontSize: 11.5,
            fontWeight: 700,
          }}
        >
          {lang === "fa" ? "EN" : "فا"}
        </button>
      </form>
    </div>
  );
}
