import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import {
  DEFAULT_TICKET_PAGE_SIZE,
  TICKET_PAGE_SIZES,
  TicketCategory,
  TicketStatus,
  type TicketPageSize,
  type TicketSortField,
} from "core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounce } from "@/lib/useDebounce";
import type { TicketFilters } from "./TicketsFilters";

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

type Props = {
  filters: TicketFilters;
};

export function TicketsTable({ filters }: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const sortParam = sorting[0];

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_TICKET_PAGE_SIZE,
  });

  const debouncedSearch = useDebounce(filters.search, 300);
  const searchParam = debouncedSearch.trim() || undefined;

  const hasActiveFilter =
    filters.status !== undefined ||
    filters.category !== undefined ||
    filters.search !== "";

  useEffect(() => {
    setPagination((p) => (p.pageIndex === 0 ? p : { ...p, pageIndex: 0 }));
  }, [filters.status, filters.category, searchParam, sortParam.id, sortParam.desc]);

  const { data, error, isPending } = useQuery({
    queryKey: [
      "tickets",
      sortParam.id,
      sortParam.desc,
      filters.status,
      filters.category,
      searchParam,
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: ({ signal }) =>
      axios
        .get<{ tickets: Ticket[]; total: number }>("/api/tickets", {
          signal,
          params: {
            sort: sortParam.id,
            order: sortParam.desc ? "desc" : "asc",
            page: pagination.pageIndex + 1,
            pageSize: pagination.pageSize,
            ...(filters.status && { status: filters.status }),
            ...(filters.category && { category: filters.category }),
            ...(searchParam && { search: searchParam }),
          },
        })
        .then((res) => res.data),
  });

  const tickets = data?.tickets ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));

  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualSorting: true,
    manualPagination: true,
    pageCount,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
  });

  if (error) {
    return (
      <p className="mt-6 text-sm text-red-600">
        Failed to load tickets: {error.message}
      </p>
    );
  }

  return (
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
                {hasActiveFilter ? "No tickets match these filters." : "No tickets yet."}
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
        <span>
          {total} {total === 1 ? "ticket" : "tickets"}
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Rows per page</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(v) =>
                setPagination({
                  pageIndex: 0,
                  pageSize: Number(v) as TicketPageSize,
                })
              }
            >
              <SelectTrigger className="w-20" aria-label="Rows per page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span>
            Page {pagination.pageIndex + 1} of {pageCount}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
