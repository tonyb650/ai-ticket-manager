import { type ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft } from "lucide-react";

type Props = {
  to: string;
  children: ReactNode;
};

export default function BackLink({ to, children }: Props) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
    >
      <ChevronLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}
