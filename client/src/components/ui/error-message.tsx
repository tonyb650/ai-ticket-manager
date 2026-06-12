import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type ErrorMessageProps = Omit<ComponentProps<"p">, "children"> & {
  /** The error text to render. Renders nothing when empty/undefined, so a
   * react-hook-form `errors.x?.message` can be passed without a guard. */
  message: string | undefined;
};

/**
 * Standard inline error text. Use for form-field validation messages, form
 * root errors (pass `role="alert"`), and data-loading failures.
 *
 * Pass `id` so the related input can reference it via `aria-describedby`.
 * Override layout/size with `className` — `cn` (tailwind-merge) lets callers
 * replace the default `text-sm` (e.g. `text-xs`) or add margins.
 */
export function ErrorMessage({
  message,
  className,
  ...props
}: ErrorMessageProps) {
  if (!message) return null;
  return (
    <p className={cn("text-sm text-destructive", className)} {...props}>
      {message}
    </p>
  );
}
