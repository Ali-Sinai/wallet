import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import { useI18n } from "./i18n";

interface Me {
  username: string;
}

interface AuthContextValue {
  user: Me | null | undefined; // undefined = loading
  login: (username: string, password: string) => Promise<void>;
  /** Creates an account and signs it in. Throws the ApiError for the page to word. */
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginError: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const [loginError, setLoginError] = useState<string | null>(null);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api.get<Me>("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  // Every cached query belongs to whoever was signed in; the next person
  // must not see it, even for the moment a refetch takes.
  function signedInAs(me: Me | null) {
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
    qc.setQueryData(["me"], me);
  }

  async function login(username: string, password: string) {
    setLoginError(null);
    try {
      signedInAs(await api.post<Me>("/auth/login", { username, password }));
    } catch (e) {
      setLoginError(e instanceof ApiError ? t.loginFailed : t.serverError);
      throw e;
    }
  }

  async function register(username: string, password: string) {
    signedInAs(await api.post<Me>("/auth/register", { username, password }));
  }

  async function logout() {
    await api.post("/auth/logout");
    signedInAs(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loginError }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
