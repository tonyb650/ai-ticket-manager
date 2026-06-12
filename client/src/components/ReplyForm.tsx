import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { createReplySchema, type CreateReplyInput } from "core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  ticketId: string;
};

export default function ReplyForm({ ticketId }: Props) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { body: "" },
  });

  const submitReply = useMutation({
    mutationFn: (values: CreateReplyInput) =>
      axios
        .post(`/api/tickets/${ticketId}/replies`, values)
        .then((res) => res.data.reply),
    onSuccess: () => {
      // Refetch the thread; a reply may have reopened a closed ticket, so the
      // list view's status can change too.
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      reset();
    },
    onError: () => {
      setError("root", { message: "Failed to send reply" });
    },
  });

  const onSubmit = handleSubmit((values) =>
    submitReply.mutateAsync(values).catch(() => {}),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 space-y-2">
      <Label htmlFor="reply-form-body">Reply</Label>
      <Textarea
        id="reply-form-body"
        rows={4}
        placeholder="Write a reply…"
        aria-invalid={errors.body ? true : undefined}
        aria-describedby={errors.body ? "reply-form-body-error" : undefined}
        {...register("body")}
      />
      <ErrorMessage id="reply-form-body-error" message={errors.body?.message} />
      <ErrorMessage role="alert" message={errors.root?.message} />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending…" : "Send reply"}
        </Button>
      </div>
    </form>
  );
}
