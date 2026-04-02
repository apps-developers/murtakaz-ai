"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthContextValue = {
  user: typeof authClient.$Infer.Session.user | null;
  session: typeof authClient.$Infer.Session.session | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending, error } = authClient.useSession();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  useEffect(() => {
    if (isPending) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
        console.error("Auth session loading timeout - forcing reload");
      }, 10000);

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isPending]);

  useEffect(() => {
    if (error) {
      console.error("Auth session error:", error);
    }
  }, [error]);

  const refresh = async () => {
    try {
      await authClient.getSession();
    } catch (err) {
      console.error("Failed to refresh session:", err);
    }
  };

  const signOut = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/";
          },
          onError: (ctx) => {
            console.error("Sign out error:", ctx.error);
            window.location.href = "/";
          },
        },
      });
    } catch (err) {
      console.error("Sign out failed:", err);
      window.location.href = "/";
    }
  };

  const value: AuthContextValue = {
    user: data?.user ?? null,
    session: data?.session ?? null,
    loading: isPending && !loadingTimeout,
    refresh,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

