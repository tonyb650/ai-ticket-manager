import { useState } from "react";
import {
  TicketsFilters,
  EMPTY_TICKET_FILTERS,
  type TicketFilters,
} from "./TicketsFilters";
import { TicketsTable } from "./TicketsTable";

export default function TicketsPage() {
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_TICKET_FILTERS);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
      <TicketsFilters filters={filters} onChange={setFilters} />
      <TicketsTable filters={filters} />
    </div>
  );
}
