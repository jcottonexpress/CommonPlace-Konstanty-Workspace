import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const sessionSecret = process.env["SESSION_SECRET"];
if (process.env["NODE_ENV"] === "production") {
  if (!sessionSecret || sessionSecret.length < 32) {
    logger.error(
      "SESSION_SECRET must be set to a string of at least 32 characters in production. Refusing to start.",
    );
    process.exit(1);
  }
} else if (!sessionSecret) {
  logger.warn(
    "SESSION_SECRET is not set. Using insecure default — do not use in production.",
  );
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
