import pino from "pino";
import { AsyncLocalStorage } from "async_hooks";

// AsyncLocalStorage store for request/correlation IDs
export const requestStorage = new AsyncLocalStorage<{ requestId: string; correlationId?: string }>();

const baseLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Ensure output goes to stdout for cloud scraper logs ingestion
  browser: {
    asObject: true,
  },
});

// Proxy handler to automatically inject async context data into logs
export const logger = new Proxy(baseLogger, {
  get(target, prop, receiver) {
    const value = Reflect.get(target, prop, receiver);
    if (typeof value === "function" && ["info", "error", "warn", "debug", "trace", "fatal"].includes(prop as string)) {
      return (mergingObjectOrMessage: unknown, ...args: unknown[]) => {
        const store = requestStorage.getStore();
        if (store) {
          if (typeof mergingObjectOrMessage === "object" && mergingObjectOrMessage !== null) {
            const obj = mergingObjectOrMessage as Record<string, unknown>;
            return value.call(target, { ...store, ...obj }, ...args);
          } else {
            return value.call(target, store, mergingObjectOrMessage, ...args);
          }
        }
        return value.call(target, mergingObjectOrMessage, ...args);
      };
    }
    return value;
  },
});
