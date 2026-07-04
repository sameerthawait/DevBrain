import { logger } from "./logger";

export interface SuccessResponse<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ErrorResponse {
  success: false;
  code: string;
  message: string;
  requestId: string;
}

/**
 * Send standard success JSON response.
 */
export function sendSuccess<T>(data: T, requestId: string, status = 200): Response {
  const payload: SuccessResponse<T> = {
    success: true,
    data,
    requestId,
  };
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Send standard failure JSON error response.
 */
export function sendError(code: string, message: string, requestId: string, status = 400): Response {
  const payload: ErrorResponse = {
    success: false,
    code,
    message,
    requestId,
  };
  logger.warn({ msg: "API error response returned", code, message, requestId });
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
