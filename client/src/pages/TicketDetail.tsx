import { useState } from "react";
import { Link, useParams } from "react-router";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import {
  TicketCategory,
  TicketStatus,
  type Assignee,
  type TicketDetail as TicketDetailType,
  type UpdateTicketInput,
} from "core";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  UNASSIGNED_VALUE,
  UNCATEGORIZED_VALUE,
} from "./ticketDisplay";

export default function TicketDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [updateError, setUpdateError] = useState<string | null>(null);

  const { data: ticket, error, isPending } = useQuery({
    queryKey: ["ticket", id],
    queryFn: ({ signal }) =>
      axios
        .get<{ ticket: TicketDetailType }>(`/api/tickets/${id}`, { signal })
        .then((res) => res.data.ticket),
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: ({ signal }) =>
      axios
        .get<{ agents: Assignee[] }>("/api/agents", { signal })
        .then((res) => res.data.agents),
  });

  const updateMutation = useMutation({
    mutationFn: (update: UpdateTicketInput) =>
      axios
        .patch<{ ticket: TicketDetailType }>(`/api/tickets/${id}`, update)
        .then((res) => res.data.ticket),
    onSuccess: () => {
      setUpdateError(null);
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => {
      setUpdateError("Failed to update ticket");
    },
  });

  const notFound = axios.isAxiosError(error) && error.response?.status === 404;

  return (
    <div className="p-8">
      <Link
        to="/tickets"
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to tickets
      </Link>

      {isPending ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-8 w-96" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <p className="mt-6 text-sm text-red-600">
          {notFound
            ? "Ticket not found."
            : `Failed to load ticket: ${error.message}`}
        </p>
      ) : (
        <div className="mt-6">
          <div className="text-sm text-gray-500">#{ticket.id}</div>

          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {ticket.subject}
          </h1>

          <div className="mt-3 text-sm text-gray-600">
            <span>
              From{" "}
              {ticket.fromName ? (
                <>
                  <span className="font-medium text-gray-900">
                    {ticket.fromName}
                  </span>{" "}
                  &lt;{ticket.fromEmail}&gt;
                </>
              ) : (
                <span className="font-medium text-gray-900">
                  {ticket.fromEmail}
                </span>
              )}
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-6 md:flex-row md:gap-10">
            {/* Editable controls — moved into a second column on tablet/desktop */}
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
                            : (value as TicketCategory),
                      })
                    }
                    disabled={updateMutation.isPending}
                  >
                    <SelectTrigger className="h-8 w-full" aria-label="Set category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNCATEGORIZED_VALUE}>
                        Uncategorized
                      </SelectItem>
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
                        assignedToId: value === UNASSIGNED_VALUE ? null : value,
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
                          <span className="text-gray-500">
                            &lt;{agent.email}&gt;
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </dd>
              </dl>

              {updateError && (
                <p className="mt-2 text-xs text-red-600">{updateError}</p>
              )}
            </div>

            {/* Ticket detail — main column */}
            <div className="md:order-1 md:flex-1">
              <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900">
                  {new Date(ticket.createdAt).toLocaleString()}
                </dd>
                <dt className="text-gray-500">Last updated</dt>
                <dd className="text-gray-900">
                  {new Date(ticket.updatedAt).toLocaleString()}
                </dd>
              </dl>

              <pre className="mt-6 whitespace-pre-wrap wrap-break-word font-sans text-sm text-gray-800">
                {ticket.body}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
