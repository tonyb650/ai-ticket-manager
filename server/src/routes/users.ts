import { Router, type Response } from "express";
import { Role } from "@prisma/client";
import { createUserSchema, updateUserSchema } from "core";
import type { z } from "zod";
import { auth } from "../lib/auth";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { requireAdmin } from "../middleware/requireAdmin";

const usersRouter = Router();

usersRouter.use(requireAuth, requireAdmin);

function parseBody<T extends z.ZodTypeAny>(
  res: Response,
  schema: T,
  body: unknown,
): z.infer<T> | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
    return null;
  }
  return parsed.data;
}

usersRouter.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ users });
});

usersRouter.post("/", async (req, res) => {
  const data = parseBody(res, createUserSchema, req.body);
  if (!data) return;
  const { name, email, password } = data;

  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const hashedPassword = await ctx.password.hash(password);
  const user = await ctx.internalAdapter.createUser({
    name,
    email,
    emailVerified: false,
    role: Role.agent,
  });
  await ctx.internalAdapter.createAccount({
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: hashedPassword,
  });

  res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
});

usersRouter.patch("/:id", async (req, res) => {
  const data = parseBody(res, updateUserSchema, req.body);
  if (!data) return;
  const { id } = req.params;
  const { name, email, password } = data;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const ctx = await auth.$context;

  if (email !== existing.email) {
    const conflict = await ctx.internalAdapter.findUserByEmail(email);
    if (conflict && conflict.user.id !== id) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { name, email },
  });

  if (password) { // Empty string is falsey here
    const hashedPassword = await ctx.password.hash(password);
    await prisma.account.updateMany({
      where: { userId: id, providerId: "credential" },
      data: { password: hashedPassword },
    });
  }

  res.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      createdAt: updated.createdAt,
    },
  });
});

export default usersRouter;
