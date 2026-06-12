import { type TicketDetail as TicketDetailType } from "core";

type Props = {
  ticket: TicketDetailType;
};

export default function TicketSummary({ ticket }: Props) {
  return (
    <>
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
    </>
  );
}
