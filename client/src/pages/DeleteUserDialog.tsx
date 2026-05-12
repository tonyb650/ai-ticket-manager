import { useState } from "react";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User } from "./UsersTable";

type Props = {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function DeleteUserDialog({ user, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deleteUser = useMutation({
    mutationFn: () => axios.delete(`/api/users/${user.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: () => {
      setErrorMessage("Failed to delete user");
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setErrorMessage(null);
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this user?</AlertDialogTitle>
          <AlertDialogDescription>
            {user.name} ({user.email}) will be deleted and signed out
            immediately. This cannot be undone from the UI.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {errorMessage && (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteUser.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteUser.isPending}
            onClick={(e) => {
              e.preventDefault();
              deleteUser.mutateAsync().catch(() => {});
            }}
          >
            {deleteUser.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
