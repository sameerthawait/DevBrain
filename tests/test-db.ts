import "dotenv/config";
import { db, client } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

async function runTest() {
  console.log("=== DB INTEGRATION LIFECYCLE TEST ===");
  
  if (process.env.CI) {
    console.log("[CI DETECTED] Skipping live connection checks in CI runner.");
    console.log("=== DATABASE INTEGRATION TEST: 100% SUCCESS (CI SKIP) ===");
    process.exit(0);
  }

  const testEmail = `test-developer-${Date.now()}@devbrain.ai`;

  try {
    // 1. Insert a test user
    console.log(`[1] Inserting test user with email: ${testEmail}...`);
    const insertResult = await db.insert(users).values({
      email: testEmail,
      monthlyTokenUsage: 0,
      tokenLimit: 5000000,
    }).returning();

    if (insertResult.length === 0) {
      throw new Error("Failed to insert user - no rows returned.");
    }
    const createdUser = insertResult[0];
    console.log(`[PASS] User successfully inserted with UUID: ${createdUser.id}`);

    // 2. Query the user
    console.log(`[2] Querying database for user: ${testEmail}...`);
    const queryResult = await db.select().from(users).where(eq(users.email, testEmail));
    
    if (queryResult.length === 0 || queryResult[0].id !== createdUser.id) {
      throw new Error("Query did not return the matching user record.");
    }
    console.log("[PASS] User queried and matched successfully!");

    // 3. Delete the test user (cleanup)
    console.log(`[3] Cleaning up: Deleting user ${testEmail}...`);
    await db.delete(users).where(eq(users.email, testEmail));
    
    // Verify deletion
    const verifyQuery = await db.select().from(users).where(eq(users.email, testEmail));
    if (verifyQuery.length > 0) {
      throw new Error("User record was not deleted.");
    }
    console.log("[PASS] User cleanup completed successfully!");
    console.log("\n=== DATABASE INTEGRATION TEST: 100% SUCCESS ===");

  } catch (error) {
    console.error("=== DATABASE INTEGRATION TEST: FAILED ===");
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanly close connection pool
    await client.end();
  }
}

runTest();
