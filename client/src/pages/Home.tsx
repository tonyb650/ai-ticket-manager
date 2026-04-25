import { useSession } from "../lib/authClient";

export default function Home() {
  const { data: session } = useSession();
  const name = session?.user.name ?? "";

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Welcome, {name}</h1>
      <p className="mt-2 text-sm text-gray-600">
        You're signed in. Ticket management UI coming soon.
      </p>
    </div>
  );
}
