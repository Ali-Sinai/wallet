import { FormEvent, useState } from "react";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { login, loginError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(username, password);
    } catch {
      // loginError already set by the auth hook
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <div className="flex items-end gap-1 justify-center mb-4">
          <div className="text-2xl font-bold tracking-tight">کیف پول</div>
          <div className="w-1.5 h-1.5 rounded-sm bg-accent mb-1" />
        </div>
        <input
          className="rounded-2xl bg-card border border-border px-4 py-3 text-sm outline-none focus:border-accent"
          placeholder="نام کاربری"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
        <input
          className="rounded-2xl bg-card border border-border px-4 py-3 text-sm outline-none focus:border-accent"
          placeholder="رمز عبور"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {loginError && <div className="text-expense text-xs text-center">{loginError}</div>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-2xl bg-accent text-[#04120c] font-bold py-3 text-sm disabled:opacity-50"
        >
          ورود
        </button>
      </form>
    </div>
  );
}
