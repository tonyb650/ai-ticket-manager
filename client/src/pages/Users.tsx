import { useState } from "react";
import { Button } from "@/components/ui/button";
import CreateUserDialog from "./CreateUserDialog";
import UsersTable from "./UsersTable";

export default function Users() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <Button onClick={() => setCreateOpen(true)}>New user</Button>
      </div>

      <div className="mt-6">
        <UsersTable />
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
