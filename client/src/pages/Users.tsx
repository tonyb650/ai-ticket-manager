import { useState } from "react";
import { Button } from "@/components/ui/button";
import CreateUserForm from "./CreateUserForm";
import UsersTable from "./UsersTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

export default function Users() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Button onClick={() => setDialogOpen(true)}>New user</Button>
      </div>

      <div className="mt-6">
        <UsersTable />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New user</DialogTitle>
          </DialogHeader>
          <CreateUserForm onClose={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
