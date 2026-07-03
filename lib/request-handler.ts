import { headers } from "next/headers";
import { requestStorage } from "./logger";

/**
 * Higher-order function to wrap Next.js API route handlers.
 * Extracts propagation headers from the request context and binds them
 * to the AsyncLocalStorage logging store.
 */
export function withLogging(handler: () => Promise<Response>) {
  return async () => {
    const reqHeaders = await headers();
    const requestId = reqHeaders.get("x-request-id") || crypto.randomUUID();
    const correlationId = reqHeaders.get("x-correlation-id") || requestId;

    return requestStorage.run({ requestId, correlationId }, handler);
  };
}
