import { UserStatus } from "@prisma/client";
import { z } from "zod";
import { signUpSchema } from "./auth.schemas.js";

export const createUserSchema = signUpSchema;

export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    status: z.enum(UserStatus).optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required.",
  );

export const idParamsSchema = z.object({ id: z.uuid() });

export const usersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce
    .number()
    .int()
    .default(6)
    .refine((value) => value === 6, "Limit must be 6."),
});
