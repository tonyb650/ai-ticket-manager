import { useParams } from "react-router";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { type TicketDetail as TicketDetailType } from "core";
import BackLink from "@/components/BackLink";
import ReplyForm from "@/components/ReplyForm";
import ReplyThread from "@/components/ReplyThread";
import TicketDetail from "@/components/TicketDetail";
import TicketDetailSkeleton from "@/components/TicketDetailSkeleton";
import TicketSummary from "@/components/TicketSummary";
import UpdateTicket from "@/components/UpdateTicket";
import { ErrorMessage } from "@/components/ui/error-message";

export default function TicketDetailPage() {
  const { id } = useParams();

  const {
    data: ticket,
    error,
    isPending
  } = useQuery({
    queryKey: ["ticket", id],
    queryFn: ({ signal }) =>
      axios
        .get<{ ticket: TicketDetailType }>(`/api/tickets/${id}`, { signal })
        .then((res) => res.data.ticket)
  });

  const notFound = axios.isAxiosError(error) && error.response?.status === 404;

  return (
    <div className="p-8">
      <BackLink to="/tickets">Back to tickets</BackLink>

      {isPending && <TicketDetailSkeleton />}
      {error && (
        <ErrorMessage
          className="mt-6"
          message={
            notFound
              ? "Ticket not found."
              : `Failed to load ticket: ${error.message}`
          }
        />
      )}
      {ticket && id && (
        <>
          <div className="mt-6">
            <div className="mt-4 md:flex">
              <UpdateTicket ticket={ticket} />
              <div className="w-full">
                <TicketSummary ticket={ticket} />
                <TicketDetail ticket={ticket} />
                <ReplyThread ticket={ticket} />
                <ReplyForm ticketId={id} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
