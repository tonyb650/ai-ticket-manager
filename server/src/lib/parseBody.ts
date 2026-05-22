import type { Response } from "express";
import type { z } from "zod";

export function parseBody<T extends z.ZodTypeAny>(
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
