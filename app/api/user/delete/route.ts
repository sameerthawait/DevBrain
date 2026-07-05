import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendSuccess, sendError } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { withLogging } from "@/lib/request-handler";

async function deleteUserHandler(request: NextRequest): Promise<Response> {
  const requestId = crypto.randomUUID();

  // 1. Resolve Authorization bearer token
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError("UNAUTHORIZED", "Credentials missing", requestId, 401);
  }

  const sessionToken = authHeader.substring(7);

  // Validate session
  const sessionResult = await db
    .select({
      userId: schema.userSessions.userId,
    })
    .from(schema.userSessions)
    .where(eq(schema.userSessions.token, sessionToken))
    .limit(1);

  if (sessionResult.length === 0) {
    return sendError("UNAUTHORIZED", "Invalid session token", requestId, 401);
  }

  const authenticatedUserId = sessionResult[0].userId;

  try {
    // 2. Perform cascade purging (ON DELETE CASCADE in database takes care of dependencies)
    logger.info({ msg: "Initiating secure developer data purge", userId: authenticatedUserId, requestId });

    // Delete user session logs and records (foreign keys are cascade deleted)
    await db.delete(schema.users).where(eq(schema.users.id, authenticatedUserId));

    logger.info({ msg: "Secure developer data purge completed successfully", userId: authenticatedUserId });

    return sendSuccess({ deleted: true }, requestId);

  } catch (error: unknown) {
    logger.error({ msg: "User data deletion failed", error: String(error) });
    return sendError("INTERNAL_ERROR", "Data deletion request failed", requestId, 500);
  }
}

export const DELETE = withLogging(deleteUserHandler);
