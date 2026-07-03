import "dotenv/config";
import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/config/env";

async function runSentryTest() {
  console.log("=== SENTRY INTEGRATION TEST ===");
  console.log("Initializing Sentry...");

  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    debug: true, // Output debug logs from Sentry SDK
  });

  try {
    console.log("Throwing deliberate test error for DevBrain infrastructure check...");
    throw new Error("Deliberate DevBrain Scaffold Test Error - Infrastructure Verification");
  } catch (error: unknown) {
    console.log("Capturing exception in Sentry...");
    const eventId = Sentry.captureException(error);
    console.log(`Event captured with ID: ${eventId}`);

    console.log("Flushing events to Sentry servers...");
    const success = await Sentry.close(5000); // Flush and close within 5 seconds
    if (success) {
      console.log("[PASS] Sentry event flushed successfully!");
      console.log("\n=== SENTRY INTEGRATION TEST: 100% SUCCESS ===");
    } else {
      throw new Error("Sentry flush timed out or failed.");
    }
  }
}

runSentryTest().catch((err) => {
  console.error("=== SENTRY INTEGRATION TEST: FAILED ===");
  console.error(err);
  process.exit(1);
});
