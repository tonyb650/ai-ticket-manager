import { Navigate, Outlet } from "react-router";
import { useSession } from "../lib/authClient";

export default function AdminRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) return null;
  if (session?.user.role !== "admin") return <Navigate to="/" replace />;

  return <Outlet />;
}
