import "dotenv/config";
import { Role } from "@prisma/client";
import { auth } from "../lib/auth";

const email = process.env.ADMIN_EMAIL!;
const password = process.env.ADMIN_PASSWORD!;

if (!email || !password) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set");
  process.exit(1);
}

const ctx = await auth.$context;

const existing = await ctx.internalAdapter.findUserByEmail(email);
if (existing) {
  console.log(`Admin user ${email} already exists — skipping`);
  process.exit(0);
}

const hashedPassword = await ctx.password.hash(password);

const user = await ctx.internalAdapter.createUser({
  name: "Admin",
  email,
  emailVerified: true,
  role: Role.admin,
});

await ctx.internalAdapter.createAccount({
  userId: user.id,
  accountId: user.id,
  providerId: "credential",
  password: hashedPassword,
});

console.log(`Created admin user: ${email}`);
