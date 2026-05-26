import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { TicketCategory, TicketStatus } from "core";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Ticket = {
  id: number;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  category: TicketCategory | null;
  status: TicketStatus;
  createdAt: string;
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.general_question]: "General",
  [TicketCategory.technical_question]: "Technical",
  [TicketCategory.refund_request]: "Refund",
};

const COLUMN_COUNT = 6;

export default function Tickets() {
  const { data: tickets, error, isPending } = useQuery({
    queryKey: ["tickets"],
    queryFn: ({ signal }) =>
      axios
        .get<{ tickets: Ticket[] }>("/api/tickets", { signal })
        .then((res) => res.data.tickets),
  });

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
        <p className="mt-6 text-sm text-red-600">
          Failed to load tickets: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>

      <div className="mt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>From</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-56" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} className="text-center text-gray-500">
                  No tickets yet.
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="text-gray-500">#{ticket.id}</TableCell>
                  <TableCell className="font-medium">{ticket.subject}</TableCell>
                  <TableCell>
                    {ticket.fromName ? (
                      <div>
                        <div>{ticket.fromName}</div>
                        <div className="text-xs text-gray-500">{ticket.fromEmail}</div>
                      </div>
                    ) : (
                      ticket.fromEmail
                    )}
                  </TableCell>
                  <TableCell>
                    {ticket.category ? (
                      <Badge variant="outline">{CATEGORY_LABELS[ticket.category]}</Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={ticket.status === TicketStatus.open ? "default" : "secondary"}
                    >
                      {ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
