import { Navigate, Outlet } from "react-router";
import { useSession } from "../lib/authClient";
import NavBar from "./NavBar";

export default function ProtectedRoute() {
  const { data: session, isPending } = useSession();

  if (isPending) return null;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <Outlet />
    </div>
  );
}
