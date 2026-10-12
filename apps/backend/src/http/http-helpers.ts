import { type User } from "@prisma/client";
import { z, ZodError } from "zod";
import { ValidationError } from "../domain/errors.js";

export type UserResponse = Omit<User, "passwordHash">;

export const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
    try {
        return schema.parse(value);
    } catch (error) {
        if (error instanceof ZodError) {
            throw new ValidationError(
                error.issues.map((issue) => issue.message).join(" "),
            );
        }
        throw error;
    }
};

export const toUserResponse = ({
    passwordHash: _passwordHash,
    ...user
}: User): UserResponse => user;

export const isHttpError = (error: unknown): error is { statusCode: number } =>
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number";