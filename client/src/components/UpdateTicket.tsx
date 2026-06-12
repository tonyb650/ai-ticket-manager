import { useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  TicketCategory,
  TicketStatus,
  type Assignee,
  type TicketDetail as TicketDetailType,
  type UpdateTicketInput
} from "core";
import { ErrorMessage } from "@/components/ui/error-message";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  UNASSIGNED_VALUE,
  UNCATEGORIZED_VALUE
} from "@/pages/ticketDisplay";

type Props = {
  ticket: TicketDetailType;
};

export default function UpdateTicket({ ticket }: Props) {
  // The route param (and the ["ticket", id] query key) is a string, while
  // `ticket.id` is numeric — coerce so the invalidations below match the
  // page's ticket query.
  const ticketId = String(ticket.id);
  const queryClient = useQueryClient();
  const [updateError, setUpdateError] = useState<string | null>(null);

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: ({ signal }) =>
      axios
        .get<{ agents: Assignee[] }>("/api/agents", { signal })
        .then((res) => res.data.agents)
  });

  const updateMutation = useMutation({
    mutationFn: (update: UpdateTicketInput) =>
      axios
        .patch<{ ticket: TicketDetailType }>(`/api/tickets/${ticketId}`, update)
        .then((res) => res.data.ticket),
    onSuccess: () => {
      setUpdateError(null);
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => {
      setUpdateError("Failed to update ticket");
    }
  });

  return (
    <div className="md:order-2 md:w-80 md:shrink-0">
      <dl className="grid grid-cols-[max-content_1fr] items-center gap-x-4 gap-y-2 text-sm">
        <dt className="text-gray-500">Status</dt>
        <dd className="text-gray-900">
          <Select
            value={ticket.status}
            onValueChange={(value) =>
              updateMutation.mutate({ status: value as TicketStatus })
            }
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className="h-8 w-full" aria-label="Set status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(TicketStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </dd>

        <dt className="text-gray-500">Category</dt>
        <dd className="text-gray-900">
          <Select
            value={ticket.category ?? UNCATEGORIZED_VALUE}
            onValueChange={(value) =>
              updateMutation.mutate({
                category:
                  value === UNCATEGORIZED_VALUE
                    ? null
                    : (value as TicketCategory)
              })
            }
            disabled={updateMutation.isPending}
          >
            <SelectTrigger className="h-8 w-full" aria-label="Set category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNCATEGORIZED_VALUE}>Uncategorized</SelectItem>
              {Object.values(TicketCategory).map((category) => (
                <SelectItem key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </dd>

        <dt className="text-gray-500">Assigned to</dt>
        <dd className="text-gray-900">
          <Select
            value={ticket.assignedTo?.id ?? UNASSIGNED_VALUE}
            onValueChange={(value) =>
              updateMutation.mutate({
                assignedToId: value === UNASSIGNED_VALUE ? null : value
              })
            }
            disabled={!agents || updateMutation.isPending}
          >
            <SelectTrigger className="h-8 w-full" aria-label="Assign ticket">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
              {agents?.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}{" "}
                  <span className="text-gray-500">&lt;{agent.email}&gt;</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </dd>
      </dl>

      <ErrorMessage className="mt-2 text-xs" message={updateError ?? undefined} />
    </div>
  );
}
