import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Add other standard next.js configuration settings here if needed
};

// Wrap the configuration with Sentry build settings
export default withSentryConfig(nextConfig, {
  org: "devbrain-io",
  project: "devbrain",
  silent: true, // Suppresses source map uploading logs during builds
  widenClientFileUpload: true,
  disableLogger: true,
});
