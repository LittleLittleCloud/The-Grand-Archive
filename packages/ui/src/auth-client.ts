import { createAuthClient } from "better-auth/react";
import { usernameClient, adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  plugins: [usernameClient(), adminClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
} = authClient;
