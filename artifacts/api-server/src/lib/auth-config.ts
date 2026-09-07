export const JWT_SECRET =
  process.env["SESSION_SECRET"] || "commonplace-dev-secret";

export const JWT_EXPIRES = "7d";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE_NAME = "session";
