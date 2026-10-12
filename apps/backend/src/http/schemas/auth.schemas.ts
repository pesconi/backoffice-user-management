import { z } from "zod";

const passwordSchema = z.string().min(12).max(128);
const emailSchema = z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((email) => email.toLowerCase());

export const signUpSchema = z
    .object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        email: emailSchema,
        password: passwordSchema,
    })
    .strict();

export const signInSchema = z
    .object({ email: emailSchema, password: passwordSchema })
    .strict();