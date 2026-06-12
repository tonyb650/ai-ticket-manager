import { Skeleton } from "@/components/ui/skeleton";

export default function TicketDetailSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <Skeleton className="h-8 w-96" />
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
