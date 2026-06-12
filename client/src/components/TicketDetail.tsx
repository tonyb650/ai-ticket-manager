import { type TicketDetail as TicketDetailType } from "core";

type Props = {
  ticket: Pick<TicketDetailType, "body" | "updatedAt" | "createdAt">;
};

export default function TicketDetail({ ticket }: Props) {
  return (
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
  );
}
