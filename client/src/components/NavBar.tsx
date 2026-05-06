import { Link, useNavigate } from "react-router";
import { authClient, useSession } from "../lib/authClient";

export default function NavBar() {
  const navigate = useNavigate();
  const { data: session } = useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-6">
        <Link to="/" className="text-base font-semibold text-gray-900 hover:text-gray-700 transition">
          HelpDesk
        </Link>
        {session?.user.role === "admin" && (
          <Link
            to="/users"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
          >
            Users
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 transition"
      >
        Sign out
      </button>
    </nav>
  );
}
