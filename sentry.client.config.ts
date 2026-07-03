import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Use public DSN if available, or fall back
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "https://85a7464ed711ccec44d8dcd2b88fc325@o4511669258813440.ingest.us.sentry.io/4511669262680064",
  tracesSampleRate: 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
