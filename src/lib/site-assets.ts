import { createServerFn } from "@tanstack/react-start";

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

// Resolved on the server because the browser has no Supabase env in production.
// Going through a server function keeps the link correct in both SSR and
// client-side navigation, and means replacing the file never touches the code.
export const getCvUrl = createServerFn({ method: "GET" }).handler(async (): Promise<string> => {
  // Whatever the back-office points at wins, so replacing the CV — under any
  // filename — never needs a code change.
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (
      supabaseAdmin as unknown as {
        from(t: string): {
          select(c: string): {
            eq(col: string, val: string): {
              maybeSingle(): PromiseLike<{ data: { value: string } | null }>;
            };
          };
        };
      }
    )
      .from("site_content")
      .select("value")
      .eq("key", "cv.file")
      .maybeSingle();

    if (data?.value) return publicUrl(data.value) ?? CV_FALLBACK;
  } catch (cause) {
    console.error("[cv] Falling back to the shipped file", cause);
  }
  return publicUrl(CV_OBJECT) ?? CV_FALLBACK;
});
