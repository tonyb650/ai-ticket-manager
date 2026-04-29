import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields({ user: { role: { type: "string" } } })], // Mirror of additionalFields in server/src/lib/auth.ts — keep in sync. Tighter literal-union typing requires sharing types across packages (out of scope here).
});

export const { signIn, signOut, useSession } = authClient;
