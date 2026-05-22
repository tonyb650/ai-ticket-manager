import { z } from "zod";

export const TicketStatus = {
  open: "open",
  closed: "closed",
} as const;

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketCategory = {
  general_question: "general_question",
  technical_question: "technical_question",
  refund_request: "refund_request",
} as const;

export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const inboundEmailSchema = z.object({
  from: z.email(),
  fromName: z.string().trim().optional(),
  subject: z.string().trim().max(998).default(""),
  text: z.string(),
  html: z.string().optional(),
  category: z.enum(TicketCategory).optional(),
  messageId: z.string().trim().optional(),
  inReplyTo: z.string().trim().optional(),
  autoSubmitted: z.string().trim().optional(),
  precedence: z.string().trim().optional(),
});

export type InboundEmailInput = z.infer<typeof inboundEmailSchema>;
