import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { Role } from "core";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

type Props = {
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
};

export default function UsersTable({ onEdit, onDelete }: Props) {
  const { data: users, error, isPending } = useQuery({
    queryKey: ["users"],
    queryFn: ({ signal }) =>
      axios
        .get<{ users: User[] }>("/api/users", { signal })
        .then((res) => res.data.users),
  });

  if (error) {
    return (
      <p className="text-sm text-red-600">Failed to load users: {error.message}</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="w-px text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending ? (
          Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-32" /></TableCell>
              <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-7 w-7 rounded-md" /></TableCell>
            </TableRow>
          ))
        ) : users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-gray-500">
              No users found.
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === Role.admin ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit(user)}
                  aria-label={`Edit ${user.name}`}
                >
                  <Pencil />
                </Button>
                {user.role !== Role.admin && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(user)}
                    aria-label={`Delete ${user.name}`}
                  >
                    <Trash2 />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
