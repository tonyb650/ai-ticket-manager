import { Router } from "express";
import { Prisma } from "@prisma/client";
import {
  DEFAULT_TICKET_PAGE_SIZE,
  ticketsListQuerySchema,
  updateTicketAssignmentSchema,
  UNCATEGORIZED,
} from "core";
import prisma from "../lib/prisma";
import { parseBody } from "../lib/parseBody";
import { requireAuth } from "../middleware/requireAuth";

const ticketsRouter = Router();

ticketsRouter.use(requireAuth);

const ticketDetailSelect = {
  id: true,
  subject: true,
  body: true,
  fromEmail: true,
  fromName: true,
  category: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.TicketSelect;

ticketsRouter.get("/", async (req, res) => {
  const parsed = ticketsListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query", issues: parsed.error.issues });
    return;
  }
  const { sort, order, status, category, search, page, pageSize } = parsed.data;
  const orderBy = sort
    ? { [sort]: order ?? "asc" }
    : { createdAt: "desc" as const };

  const take = pageSize ?? DEFAULT_TICKET_PAGE_SIZE;
  const skip = ((page ?? 1) - 1) * take;

  const where: Prisma.TicketWhereInput = {};
  if (status) where.status = status;
  if (category) where.category = category === UNCATEGORIZED ? null : category;
  if (search) {
    where.OR = [
      { subject:   { contains: search, mode: "insensitive" } },
      { fromEmail: { contains: search, mode: "insensitive" } },
      { fromName:  { contains: search, mode: "insensitive" } },
    ];
  }

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      select: {
        id: true,
        subject: true,
        fromEmail: true,
        fromName: true,
        category: true,
        status: true,
        createdAt: true,
      },
      where,
      orderBy,
      skip,
      take,
    }),
    prisma.ticket.count({ where }),
  ]);
  res.json({ tickets, total });
});

ticketsRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 0) {
    res.status(400).json({ error: "Invalid ticket id" });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    select: ticketDetailSelect,
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json({ ticket });
});

ticketsRouter.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 0) {
    res.status(400).json({ error: "Invalid ticket id" });
    return;
  }

  const data = parseBody(res, updateTicketAssignmentSchema, req.body);
  if (!data) return;
  const { assignedToId } = data;

  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  if (assignedToId !== null) {
    const assignee = await prisma.user.findFirst({
      where: { id: assignedToId, deletedAt: null },
    });
    if (!assignee) {
      res.status(400).json({ error: "Invalid assignee" });
      return;
    }
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data: { assignedToId },
    select: ticketDetailSelect,
  });

  res.json({ ticket });
});

export default ticketsRouter;
