import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserInput,
} from "core";
import { useForm } from "react-hook-form";
import type { User } from "./UsersTable";

type FormValues = CreateUserInput;

type Props = {
  user?: User;
  onClose: () => void;
};

export default function UserForm({ user, onClose }: Props) {
  const isEdit = user !== undefined;
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
    },
  });

  const submitUser = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit) {
        const res = await axios.patch(`/api/users/${user.id}`, values);
        return res.data.user;
      }
      const res = await axios.post("/api/users", values);
      return res.data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err) => {
      const isConflict =
        axios.isAxiosError(err) && err.response?.status === 409;
      const fallback = isEdit ? "Failed to update user" : "Failed to create user";
      setError("root", {
        message: isConflict ? "Email already in use" : fallback,
      });
    },
  });

  const onSubmit = handleSubmit((values) =>
    submitUser.mutateAsync(values).catch(() => {}),
  );

  const submitLabel = isEdit
    ? isSubmitting
      ? "Saving…"
      : "Save changes"
    : isSubmitting
      ? "Creating…"
      : "Create user";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="user-form-name">Name</Label>
        <Input
          id="user-form-name"
          autoComplete="name"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "user-form-name-error" : undefined}
          {...register("name")}
        />
        {errors.name && (
          <p id="user-form-name-error" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="user-form-email">Email</Label>
        <Input
          id="user-form-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "user-form-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="user-form-email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="user-form-password">
          Password
          {isEdit && (
            <span className="ml-1 text-muted-foreground font-normal">
              (leave blank to keep current)
            </span>
          )}
        </Label>
        <Input
          id="user-form-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={
            errors.password ? "user-form-password-error" : undefined
          }
          {...register("password")}
        />
        {errors.password && (
          <p
            id="user-form-password-error"
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
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
