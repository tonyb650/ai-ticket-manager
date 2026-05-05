import "dotenv/config";
import express from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import prisma from "./lib/prisma";
import { requireAuth } from "./middleware/requireAuth";
import { requireAdmin } from "./middleware/requireAdmin";

if (process.env.NODE_ENV === "production") {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret === "change-me-in-production" || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET is missing, default, or shorter than 32 characters");
  }
  if (!process.env.BETTER_AUTH_URL?.startsWith("https://")) {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production");
  }
}

const app = express();
const PORT = process.env.PORT ?? 3030;

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true,
  })
);

const authHandlers: express.RequestHandler[] = [];
if (process.env.NODE_ENV === "production") {
  authHandlers.push(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many login attempts, please try again later" },
    })
  );
}
authHandlers.push(toNodeHandler(auth));

// Better Auth handler must come before express.json()
app.all("/api/auth/*splat", ...authHandlers);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/me", requireAuth, (req, res) => {
  const { id, name, email, role } = req.session.user;
  res.json({ id, name, email, role });
});

app.get("/api/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
