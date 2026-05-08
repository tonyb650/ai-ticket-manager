import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { createUserSchema, type CreateUserInput } from "core";
import { useForm } from "react-hook-form";

type Props = {
  onClose: () => void;
};

export default function CreateUserForm({ onClose }: Props) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "" }
  });

  const createUser = useMutation({
    mutationFn: (values: CreateUserInput) =>
      axios.post("/api/users", values).then((r) => r.data.user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => {
      const message =
        axios.isAxiosError(err) && err.response?.status === 409
          ? "Email already in use"
          : "Failed to create user";
      setError("root", { message });
    }
  });

  const onSubmit = handleSubmit((values) =>
    createUser.mutateAsync(values).catch(() => {})
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="create-user-name">Name</Label>
        <Input
          id="create-user-name"
          autoComplete="name"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "create-user-name-error" : undefined}
          {...register("name")}
        />
        {errors.name && (
          <p id="create-user-name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="create-user-email">Email</Label>
        <Input
          id="create-user-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={
            errors.email ? "create-user-email-error" : undefined
          }
          {...register("email")}
        />
        {errors.email && (
          <p id="create-user-email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="create-user-password">Password</Label>
        <Input
          id="create-user-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={
            errors.password ? "create-user-password-error" : undefined
          }
          {...register("password")}
        />
        {errors.password && (
          <p
            id="create-user-password-error"
            className="text-sm text-destructive"
          >
            {errors.password.message}
          </p>
        )}
      </div>

      {errors.root && (
        <p role="alert" className="text-sm text-destructive">
          {errors.root.message}
        </p>
      )}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create user"}
        </Button>
      </div>
    </form>
  );
}
