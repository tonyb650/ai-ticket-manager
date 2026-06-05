import { TicketCategory, TicketStatus } from "core";
import { Badge } from "@/components/ui/badge";

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.general_question]: "General",
  [TicketCategory.technical_question]: "Technical",
  [TicketCategory.refund_request]: "Refund",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant={status === TicketStatus.open ? "default" : "secondary"}>
      {status}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: TicketCategory | null }) {
  return category ? (
    <Badge variant="outline">{CATEGORY_LABELS[category]}</Badge>
  ) : (
    <span className="text-gray-400">—</span>
  );
}
