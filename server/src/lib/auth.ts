import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [process.env.CLIENT_URL ?? "http://localhost:5173"],
  emailAndPassword: { enabled: true, disableSignUp: true },
  advanced: {
    cookiePrefix: "helpdesk",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  },
  user: {
    additionalFields: {
      role: {
        type: ["admin", "agent"] as const,
        required: true,
        defaultValue: "agent",
        input: false,
      },
    },
  },
});
