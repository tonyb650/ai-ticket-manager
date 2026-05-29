import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TicketCategory, TicketStatus, type TicketSortField } from "core";
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

const columns = [
  {
    id: "id",
    accessorKey: "id",
    header: "#",
    sortDescFirst: true,
    cell: ({ row }) => (
      <span className="text-gray-500">#{row.original.id}</span>
    ),
  },
  {
    id: "subject",
    accessorKey: "subject",
    header: "Subject",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.subject}</span>
    ),
  },
  {
    id: "fromEmail",
    accessorKey: "fromEmail",
    header: "From",
    cell: ({ row }) => {
      const { fromName, fromEmail } = row.original;
      return fromName ? (
        <div>
          <div>{fromName}</div>
          <div className="text-xs text-gray-500">{fromEmail}</div>
        </div>
      ) : (
        <>{fromEmail}</>
      );
    },
  },
  {
    id: "category",
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) =>
      row.original.category ? (
        <Badge variant="outline">{CATEGORY_LABELS[row.original.category]}</Badge>
      ) : (
        <span className="text-gray-400">—</span>
      ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === TicketStatus.open ? "default" : "secondary"}
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created",
    sortDescFirst: true,
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString(),
  },
] satisfies ReadonlyArray<ColumnDef<Ticket> & { id: TicketSortField }>;

const COLUMN_COUNT = columns.length;

export default function Tickets() {
  const [sorting, setSorting] = useState<SortingState>([ // SortingState is an array of ColumnSort objects
    { id: "createdAt", desc: true },                     // We start with one ColumnSort object in the array
  ]);
  const sortParam = sorting[0];                          // The first (and only) element in sorting will be our sortParam 

  const { data: tickets, error, isPending } = useQuery({
    queryKey: ["tickets", sortParam.id, sortParam.desc], // every new sortParam configuration is a queryKey
    queryFn: ({ signal }) =>
      axios
        .get<{ tickets: Ticket[] }>("/api/tickets", {
          signal,
          params: {                                      // sortParam gets passed to our back end calls
            sort: sortParam.id,
            order: sortParam.desc ? "desc" : "asc",
          },
        })
        .then((res) => res.data.tickets),
  });

  const table = useReactTable({
    data: tickets ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,   // <-- setSorting will be called within the 'table'. Handled by TanStack table.
    manualSorting: true,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
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
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sortDir = header.column.getIsSorted();
                  const ariaSort =
                    sortDir === "asc"
                      ? "ascending"
                      : sortDir === "desc"
                        ? "descending"
                        : "none";
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={canSort ? ariaSort : undefined}
                      onClick={
                        canSort ? header.column.getToggleSortingHandler() : undefined
                      }
                      className={
                        (header.column.id === "id" ? "w-16 " : "") +
                        (canSort ? "cursor-pointer select-none" : "")
                      }
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sortDir === "asc" && <ChevronUp className="h-3 w-3" />}
                        {sortDir === "desc" && <ChevronDown className="h-3 w-3" />}
                      </span>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
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
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
