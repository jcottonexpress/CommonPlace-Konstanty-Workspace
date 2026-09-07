import { setAuthTokenGetter } from "@workspace/api-client-react";

// Web authentication is handled via httpOnly session cookies set by the server.
// The browser sends the cookie automatically on every request — no manual token
// management is needed. These stubs are kept so call-sites don't need to change.

// Explicitly clear any previously registered bearer-token getter so the API
// client does not attach an Authorization header for web requests.
setAuthTokenGetter(null);

export function getAuthToken(): string | null {
  return null;
}

export function setAuthToken(_token: string): void {
  // No-op: the server sets the session cookie directly via Set-Cookie.
}

export function removeAuthToken(): void {
  // No-op: the server clears the cookie on logout via Set-Cookie.
}
