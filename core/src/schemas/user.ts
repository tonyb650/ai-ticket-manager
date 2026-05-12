import { z } from "zod";

export const Role = {
  admin: "admin",
  agent: "agent",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const createUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.email("Enter a valid email"),
  password: z.string().trim().min(8, "Password must be at least 8 characters"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.email("Enter a valid email"),
  password: z.union([
    z.literal(""),
    z.string().trim().min(8, "Password must be at least 8 characters"),
  ]),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
