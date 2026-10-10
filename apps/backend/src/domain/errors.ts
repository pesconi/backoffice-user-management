export class DomainError extends Error {
    constructor(
        message: string,
        readonly statusCode: number,
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export class ForbiddenError extends DomainError {
    constructor(message: string) {
        super(message, 403);
    }
}

export class NotFoundError extends DomainError {
    constructor(message: string) {
        super(message, 404);
    }
}

export class ValidationError extends DomainError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class UnauthorizedError extends DomainError {
    constructor(message: string) {
        super(message, 401);
    }
}

export class ConflictError extends DomainError {
    constructor(message: string) {
        super(message, 409);
    }
}