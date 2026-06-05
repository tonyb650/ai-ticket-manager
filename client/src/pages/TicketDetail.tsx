import { Link, useParams } from "react-router";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import type { TicketDetail as TicketDetailType } from "core";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryBadge, StatusBadge } from "./ticketDisplay";

export default function TicketDetail() {
  const { id } = useParams();

  const { data: ticket, error, isPending } = useQuery({
    queryKey: ["ticket", id],
    queryFn: ({ signal }) =>
      axios
        .get<{ ticket: TicketDetailType }>(`/api/tickets/${id}`, { signal })
        .then((res) => res.data.ticket),
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
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>#{ticket.id}</span>
            <StatusBadge status={ticket.status} />
            <CategoryBadge category={ticket.category} />
          </div>

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

          <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-gray-500">Assigned to</dt>
            <dd className="text-gray-900">
              {ticket.assignedTo ? (
                <>
                  <span className="font-medium">{ticket.assignedTo.name}</span>{" "}
                  <span className="text-gray-500">
                    &lt;{ticket.assignedTo.email}&gt;
                  </span>
                </>
              ) : (
                <span className="text-gray-400">Unassigned</span>
              )}
            </dd>
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
      )}
    </div>
  );
}
