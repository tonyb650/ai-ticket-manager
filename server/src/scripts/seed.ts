import "dotenv/config";
import { Role } from "@prisma/client";
import { auth } from "../lib/auth";

const ctx = await auth.$context;

async function seedUser(name: string, email: string, password: string, role: Role) {
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) {
    console.log(`${role} user ${email} already exists — skipping`);
    return;
  }

  const hashedPassword = await ctx.password.hash(password);

  const user = await ctx.internalAdapter.createUser({
    name,
    email,
    emailVerified: true,
    role,
  });

  await ctx.internalAdapter.createAccount({
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: hashedPassword,
  });

  console.log(`Created ${role} user: ${email}`);
}

const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
  process.exit(1);
}

await seedUser("Admin", adminEmail, adminPassword, Role.admin);

// Optional agent user — only seeded when both vars are set (used by e2e tests).
const agentEmail = process.env.AGENT_EMAIL;
const agentPassword = process.env.AGENT_PASSWORD;

if (agentEmail && agentPassword) {
  await seedUser("Agent", agentEmail, agentPassword, Role.agent);
}
