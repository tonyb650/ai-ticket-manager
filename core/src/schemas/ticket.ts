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

export const ticketSortFields = [
  "id",
  "subject",
  "fromEmail",
  "category",
  "status",
  "createdAt",
] as const;
export type TicketSortField = (typeof ticketSortFields)[number];

export const ticketSortOrders = ["asc", "desc"] as const;
export type TicketSortOrder = (typeof ticketSortOrders)[number];

export const UNCATEGORIZED = "none" as const;

export const ticketCategoryFilterValues = [
  ...Object.values(TicketCategory),
  UNCATEGORIZED,
] as const;

export const TICKET_PAGE_SIZES = [10, 25, 50, 100] as const;
export type TicketPageSize = (typeof TICKET_PAGE_SIZES)[number];
export const DEFAULT_TICKET_PAGE_SIZE: TicketPageSize = 25;

export const ticketsListQuerySchema = z.object({
  sort: z.enum(ticketSortFields).optional(),
  order: z.enum(ticketSortOrders).optional(),
  status: z.enum(TicketStatus).optional(),
  category: z.enum(ticketCategoryFilterValues).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce
    .number()
    .int()
    .refine((v): v is TicketPageSize =>
      (TICKET_PAGE_SIZES as readonly number[]).includes(v),
    )
    .optional(),
});
export type TicketsListQuery = z.infer<typeof ticketsListQuerySchema>;

export type Assignee = {
  id: string;
  name: string;
  email: string;
};

export type TicketDetail = {
  id: number;
  subject: string;
  body: string;
  fromEmail: string;
  fromName: string | null;
  category: TicketCategory | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  assignedTo: Assignee | null;
};

// Partial update of a ticket's mutable fields. Each key is optional so a
// caller can patch any subset; `assignedToId: null` unassigns and
// `category: null` clears the category.
export const updateTicketSchema = z.object({
  assignedToId: z.string().min(1).nullable().optional(),
  status: z.enum(TicketStatus).optional(),
  category: z.enum(TicketCategory).nullable().optional(),
});
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

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
