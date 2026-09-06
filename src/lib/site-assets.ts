import { createServerFn } from "@tanstack/react-start";

// Files people download from the site live in Cloud Storage, not the repo:
// the repo is public and its history can't be rewritten (Lovable syncs it), so
// anything committed there is committed forever. Storage can be replaced or
// removed at any time, which is what the back-office will do.
export const SITE_BUCKET = "site-assets";
export const CV_OBJECT = "Eddie-Nakharin-CV.pdf";

// Falls back to the file still in public/ so the button keeps working if the
// upload hasn't happened yet, or if the server env is missing.
const CV_FALLBACK = "/files/Eddie-Nakharin-CV.pdf";

function publicUrl(object: string): string | null {
  const base = process.env["SUPABASE_URL"];
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${SITE_BUCKET}/${object}`;
}

// Resolved on the server because the browser has no Supabase env in production.
// Going through a server function keeps the link correct in both SSR and
// client-side navigation, and means replacing the file never touches the code.
export const getCvUrl = createServerFn({ method: "GET" }).handler(async (): Promise<string> => {
  return publicUrl(CV_OBJECT) ?? CV_FALLBACK;
});
