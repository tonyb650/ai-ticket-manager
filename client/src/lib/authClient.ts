import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields({ user: { role: { type: "string" } } })], // Should potentially come from server/src/lib/auth instead of being manually provided here
});

export const { signIn, signOut, useSession } = authClient;
