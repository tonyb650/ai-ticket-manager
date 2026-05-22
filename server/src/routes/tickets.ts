import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

ticketsRouter.get("/", async (_req, res) => {
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
    orderBy: { createdAt: "desc" },
  });
  res.json({ tickets });
});

export default ticketsRouter;
