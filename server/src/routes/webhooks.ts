import { Router } from "express";
import { TicketStatus } from "@prisma/client";
import { inboundEmailSchema } from "core";
import prisma from "../lib/prisma";
import { parseBody } from "../lib/parseBody";
import { requireWebhookSecret } from "../middleware/requireWebhookSecret";
import { normalizeSubject } from "../lib/normalizeSubject";

const TICKET_SUMMARY_SELECT = {
  id: true,
  subject: true,
  fromEmail: true,
  category: true,
  status: true,
  createdAt: true,
} as const;

const webhooksRouter = Router();

const BULK_PRECEDENCES = new Set(["bulk", "list", "junk"]);

webhooksRouter.post("/inbound-email", requireWebhookSecret, async (req, res) => {
  const data = parseBody(res, inboundEmailSchema, req.body);
  if (!data) return;

  if (data.autoSubmitted && data.autoSubmitted !== "no") {
    res.status(202).json({ accepted: false, reason: "auto-submitted" });
    return;
  }
  if (data.precedence && BULK_PRECEDENCES.has(data.precedence.toLowerCase())) {
    res.status(202).json({ accepted: false, reason: "bulk-precedence" });
    return;
  }

  const normalizedSubject = normalizeSubject(data.subject);
  const subject = normalizedSubject === "" ? "(no subject)" : normalizedSubject;

  const existing = await prisma.ticket.findFirst({
    where: {
      subject,
      fromEmail: { equals: data.from, mode: "insensitive" },
      status: TicketStatus.open,
    },
    select: TICKET_SUMMARY_SELECT,
  });

  if (existing) {
    res.status(200).json({ ticket: existing });
    return;
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      body: data.text,
      bodyHtml: data.html,
      fromEmail: data.from,
      fromName: data.fromName,
      category: data.category,
      messageId: data.messageId,
      inReplyTo: data.inReplyTo,
    },
    select: TICKET_SUMMARY_SELECT,
  });

  res.status(201).json({ ticket });
});

export default webhooksRouter;
