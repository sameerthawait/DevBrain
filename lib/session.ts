import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Returns the authenticated user's id, or throws.
 * Every DB query touching user data MUST scope by this id —
 * there is no RLS on Neon.
 */
export async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

/**
 * Like getUserId but returns null instead of throwing.
 * Use in pages that redirect unauthenticated users.
 */
export async function getOptionalUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}
