import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

// Server-only. Import it from inside a server function handler, never at the
// top level of anything the client bundles.

const COOKIE = "admin_session";
const TTL_MS = 12 * 60 * 60 * 1000;

export class NotAuthorized extends Error {
  constructor() {
    super("Not authorized");
  }
}

function adminPassword(): string {
  const password = process.env["ADMIN_PASSWORD"];
  // No password configured means no way in — never a way past.
  if (!password) throw new NotAuthorized();
  return password;
}

// Web Crypto rather than node:crypto: the deployed server is a Cloudflare
// worker, where node:crypto isn't there to import.
async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(adminPassword()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Compares every character even after a mismatch, so how long the comparison
// takes says nothing about how much of the secret was right.
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signInAdmin(password: string): Promise<boolean> {
  if (!equals(password, adminPassword())) {
    // Slows a guessing script to a crawl while costing a real person nothing.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return false;
  }

  const expires = Date.now() + TTL_MS;
  setCookie(COOKIE, `${expires}.${await sign(String(expires))}`, {
    httpOnly: true, // page scripts can't read it, so an XSS can't steal the session
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
  return true;
}

export function signOutAdmin(): void {
  deleteCookie(COOKIE, { path: "/" });
}

export async function requireAdmin(): Promise<void> {
  const cookie = getCookie(COOKIE);
  if (!cookie) throw new NotAuthorized();

  const [expires, signature] = cookie.split(".");
  if (!expires || !signature) throw new NotAuthorized();
  if (Number(expires) < Date.now()) throw new NotAuthorized();
  if (!equals(signature, await sign(expires))) throw new NotAuthorized();
}
