import { useState } from "react";
import { Button } from "@/components/ui/button";
import DeleteUserDialog from "./DeleteUserDialog";
import UserForm from "./UserForm";
import UsersTable, { type User } from "./UsersTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; user: User }
  | { mode: "delete"; user: User }
  | null;

export default function Users() {
  const [dialog, setDialog] = useState<DialogState>(null);

  const close = () => setDialog(null);

  const formOpen = dialog?.mode === "create" || dialog?.mode === "edit";

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Button onClick={() => setDialog({ mode: "create" })}>New user</Button>
      </div>

      <div className="mt-6">
        <UsersTable
          onEdit={(user) => setDialog({ mode: "edit", user })}
          onDelete={(user) => setDialog({ mode: "delete", user })}
        />
      </div>

      <Dialog open={formOpen} onOpenChange={(next) => !next && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === "edit" ? "Edit user" : "New user"}
            </DialogTitle>
          </DialogHeader>
          <UserForm
            user={dialog?.mode === "edit" ? dialog.user : undefined}
            onClose={close}
          />
        </DialogContent>
      </Dialog>

      {dialog?.mode === "delete" && (
        <DeleteUserDialog
          user={dialog.user}
          open
          onOpenChange={(next) => !next && close()}
        />
      )}
    </div>
  );
}
