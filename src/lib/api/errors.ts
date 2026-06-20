import { NextResponse } from "next/server";

/**
 * Typed API errors with safe, user-facing messages. Thrown anywhere inside a
 * guarded route handler and converted to a JSON response by the guard, so
 * routes never leak stack traces or internal detail to the client.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const Errors = {
  unauthorized: (msg = "You must be signed in.") => new ApiError(401, msg, "unauthorized"),
  forbidden: (msg = "You don't have access to this.") => new ApiError(403, msg, "forbidden"),
  notFound: (msg = "Not found.") => new ApiError(404, msg, "not_found"),
  badRequest: (msg = "Invalid request.") => new ApiError(400, msg, "bad_request"),
  conflict: (msg = "Conflict.") => new ApiError(409, msg, "conflict"),
  tooManyRequests: (msg = "Too many attempts. Please wait and try again.") =>
    new ApiError(429, msg, "rate_limited"),
  paymentRequired: (msg = "Subscription payment required to continue.") =>
    new ApiError(402, msg, "payment_required"),
} as const;

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  // Unknown/unexpected — log server-side, return a generic message.
  console.error("[api] unhandled error:", err);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}
