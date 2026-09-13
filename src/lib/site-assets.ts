// Files people download from the site live in Cloud Storage, not the repo:
// the repo is public and its history can't be rewritten (Lovable syncs it), so
// anything committed there is committed forever. Storage can be replaced or
// removed at any time, which is what the back-office will do.
export const SITE_BUCKET = "site-assets";
// Used when nothing is chosen in the back-office, for the case where a file
// was uploaded under the name this shipped with.
export const CV_OBJECT = "Eddie-Nakharin-CV.pdf";

// Falls back to the file still in public/ so the button keeps working if the
// upload hasn't happened yet, or if the server env is missing.
const CV_FALLBACK = "/files/Eddie-Nakharin-CV.pdf";

function publicUrl(object: string): string | null {
  const base = process.env["SUPABASE_URL"];
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${SITE_BUCKET}/${object}`;
}

// Resolved on the server because the browser has no Supabase env in production,
// and shaped from rows the caller already read rather than a query of its own:
// the CV lives in site_content beside the copy and the photos, and the page
// reads that table once.
//
// Whatever the back-office points at wins, so replacing the CV — under any
// filename — never needs a code change.
export function cvUrlFrom(stored: Record<string, string>): string {
  const chosen = stored["cv.file"];
  return publicUrl(chosen || CV_OBJECT) ?? CV_FALLBACK;
}
