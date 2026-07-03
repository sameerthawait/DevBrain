import * as Sentry from "@sentry/nextjs";

const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";
const debug = environment === "development";
const tracesSampleRate = environment === "development" ? 1.0 : 0.1;

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://85a7464ed711ccec44d8dcd2b88fc325@o4511669258813440.ingest.us.sentry.io/4511669262680064",
  environment,
  debug,
  tracesSampleRate,
  beforeSend(event, hint) {
    // Prevent reporting in test or CI environment
    if (process.env.NODE_ENV === "test" || process.env.CI === "true") {
      return null;
    }

    // Filter by exception messages
    const error = hint?.originalException as unknown;
    if (error instanceof Error) {
      const msg = error.message;
      if (
        msg.includes("Deliberate DevBrain Scaffold Test Error") ||
        msg.includes("Infrastructure Verification")
      ) {
        return null;
      }
    }

    // Filter by event message string
    const eventMessage = event.message || "";
    if (
      eventMessage.includes("Deliberate DevBrain Scaffold Test Error") ||
      eventMessage.includes("Infrastructure Verification")
    ) {
      return null;
    }

    // Filter by test folder stack frame origins
    const exception = event.exception?.values?.[0];
    if (exception && exception.stacktrace?.frames) {
      const hasTestFrame = exception.stacktrace.frames.some((frame) => {
        const filename = frame.filename || "";
        return filename.includes("tests/") || filename.includes("test-sentry");
      });
      if (hasTestFrame) {
        return null;
      }
    }

    return event;
  },
});
