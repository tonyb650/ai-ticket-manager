import type { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";

export function requireWebhookSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.WEBHOOK_SECRET;
  const provided = req.header("x-inbound-token");
  if (!secret || !provided) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const expectedBuf = Buffer.from(secret);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
