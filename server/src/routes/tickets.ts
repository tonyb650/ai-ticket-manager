import { Router } from "express";
import { ticketsListQuerySchema } from "core";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

ticketsRouter.get("/", async (req, res) => {
  const parsed = ticketsListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query", issues: parsed.error.issues });
    return;
  }
  const { sort, order } = parsed.data;
  const orderBy = sort
    ? { [sort]: order ?? "asc" }
    : { createdAt: "desc" as const };

  const tickets = await prisma.ticket.findMany({
    select: {
      id: true,
      subject: true,
      fromEmail: true,
      fromName: true,
      category: true,
      status: true,
      createdAt: true,
    },
    orderBy,
  });
  res.json({ tickets });
});

export default ticketsRouter;
