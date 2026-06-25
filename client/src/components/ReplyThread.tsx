import axios from "axios";
import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import {
  SenderType,
  type TicketDetail,
  type TicketReply,
} from "core";
import { ErrorMessage } from "@/components/ui/error-message";

type Props = {
  ticket: TicketDetail;
};

// Agent replies are attributed to their author; customer replies (future,
// inbound email) fall back to the ticket's sender identity.
function replySenderLabel(
  reply: TicketReply,
  fromName: string | null,
  fromEmail: string,
): string {
  if (reply.senderType === SenderType.agent) {
    return reply.author
      ? `${reply.author.name} <${reply.author.email}>`
      : "Unknown";
  }
  return fromName ? `${fromName} <${fromEmail}>` : fromEmail;
}

export default function ReplyThread({ ticket }: Props) {
  // The route param (and the ["ticket", id] query key) is a string, while
  // `ticket.id` is numeric — coerce so prefix-matched invalidations still hit.
  const ticketId = String(ticket.id);

  const {
    data: replies,
    error,
    isPending,
  } = useQuery({
    // Nested under the ticket key so posting a reply (which invalidates
    // ["ticket", id]) reloads the thread via prefix matching.
    queryKey: ["ticket", ticketId, "replies"],
    queryFn: ({ signal }) =>
      axios
        .get<{ replies: TicketReply[] }>(`/api/tickets/${ticketId}/replies`, {
          signal,
        })
        .then((res) => res.data.replies),
  });

  if (isPending) return null;

  if (error) {
    return (
      <ErrorMessage
        className="mt-8"
        message={`Failed to load replies: ${error.message}`}
      />
    );
  }

  if (replies.length === 0) return null;

  return (
    <div className="mt-8 space-y-4">
      {replies.map((reply) => {
        const isAgent = reply.senderType === SenderType.agent;
        return (
          <div
            key={reply.id}
            className={
              isAgent
                ? "rounded-lg border border-blue-100 bg-blue-50 p-4 md:ml-8"
                : "rounded-lg border border-gray-200 bg-white p-4 md:mr-8"
            }
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <span className="font-medium text-gray-900">
                {replySenderLabel(reply, ticket.fromName, ticket.fromEmail)}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(reply.createdAt).toLocaleString()}
              </span>
            </div>
            {reply.bodyHtml ? (
              <div
                className="mt-2 text-sm text-gray-800 [&_a]:underline [&_a]:text-blue-600"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(reply.bodyHtml),
                }}
              />
            ) : (
              <pre className="mt-2 whitespace-pre-wrap wrap-break-word font-sans text-sm text-gray-800">
                {reply.body}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}
