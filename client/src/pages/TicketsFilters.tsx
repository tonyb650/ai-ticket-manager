import { TicketCategory, TicketStatus, UNCATEGORIZED } from "core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// shadcn Select disallows value=""; this is the "no filter" sentinel for the
// dropdowns only — translated to undefined before bubbling up to the parent.
const ALL = "all" as const;

export type CategoryFilter = TicketCategory | typeof UNCATEGORIZED;

export type TicketFilters = {
  status: TicketStatus | undefined;
  category: CategoryFilter | undefined;
  search: string;
};

export const EMPTY_TICKET_FILTERS: TicketFilters = {
  status: undefined,
  category: undefined,
  search: "",
};

type Props = {
  filters: TicketFilters;
  onChange: (filters: TicketFilters) => void;
};

export function TicketsFilters({ filters, onChange }: Props) {
  const { status, category, search } = filters;
  const hasActiveFilter =
    status !== undefined || category !== undefined || search !== "";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <Select
        value={status ?? ALL}
        onValueChange={(v) =>
          onChange({
            ...filters,
            status: v === ALL ? undefined : (v as TicketStatus),
          })
        }
      >
        <SelectTrigger className="w-36" aria-label="Filter by status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          <SelectItem value={TicketStatus.open}>Open</SelectItem>
          <SelectItem value={TicketStatus.closed}>Closed</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={category ?? ALL}
        onValueChange={(v) =>
          onChange({
            ...filters,
            category: v === ALL ? undefined : (v as CategoryFilter),
          })
        }
      >
        <SelectTrigger className="w-44" aria-label="Filter by category">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          <SelectItem value={TicketCategory.general_question}>General</SelectItem>
          <SelectItem value={TicketCategory.technical_question}>Technical</SelectItem>
          <SelectItem value={TicketCategory.refund_request}>Refund</SelectItem>
          <SelectItem value={UNCATEGORIZED}>Uncategorized</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="search"
        value={search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="Search subject, name, or email"
        className="max-w-xs"
        aria-label="Search tickets"
      />

      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(EMPTY_TICKET_FILTERS)}
        >
          Clear
        </Button>
      )}
    </div>
  );
}
