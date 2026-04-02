import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
  fetchOptions: {
    credentials: "include",
    onError(context) {
      console.error("Auth client error:", context.error?.status, context.error?.message, context.error);
    },
  },
});
