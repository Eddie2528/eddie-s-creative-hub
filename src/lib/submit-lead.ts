import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Bots fill every field they find, including ones a person never sees.
export const HONEYPOT = "company_website";
export const MIN_FILL_MS = 2000;

// Files land in a private bucket the public URL endpoint won't serve.
export const LEAD_BUCKET = "lead-files";
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

// What a brief, a job description or a portfolio request actually arrives as.
// Anything else is refused rather than stored: this endpoint takes uploads from
// anyone on the internet, so the narrower the list the better.
export const ALLOWED_ATTACHMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export const ATTACHMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.txt,.doc,.docx,.ppt,.pptx";

// base64 carries three bytes in every four characters, so the encoded form of
// the largest file we accept is a third longer again. The real check is on the
// decoded length below; this only stops an absurd payload before it is parsed.
const MAX_BASE64_LENGTH = Math.ceil((MAX_ATTACHMENT_BYTES * 4) / 3) + 1024;

const attachment = z.object({
  name: z.string().trim().min(1).max(200),
  contentType: z.string().max(128),
  base64: z.string().min(1).max(MAX_BASE64_LENGTH),
});

const leadInput = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(1).max(50),
  message: z.string().trim().max(5000).optional(),
  source: z.string().trim().max(200).optional(),
  attachment: attachment.optional(),
  [HONEYPOT]: z.string().optional(),
  elapsedMs: z.number().nonnegative(),
});

export type LeadInput = z.infer<typeof leadInput>;

export type SubmitLeadResult =
  | { ok: true; attachmentStored?: boolean }
  | { ok: false; reason: "too_fast" | "file_too_large" | "file_type" };

// Storage keys stay ASCII so a file picked from a Thai-named folder still lands
// on a path that survives a signed URL round trip. The extension is carried
// across separately: stripping a wholly Thai name leaves nothing, and
// "ตำแหน่งงาน.pdf" collapsing to a bare "pdf" would lose it entirely. The name
// the visitor chose is preserved anyway — the back-office signs the link with
// it, so that is what downloads.
export function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const extension =
    dot > 0 ? name.slice(dot + 1).replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toLowerCase() : "";
  const stem = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 100);
  return `${stem || "attachment"}${extension ? `.${extension}` : ""}`;
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Same reason as the reader in admin-leads: these columns exist in the
// database but not yet in the generated types.
type LeadsWriter = {
  from(table: "leads"): {
    update(values: {
      attachment_path: string;
      attachment_name: string;
      attachment_size: number;
      attachment_type: string;
    }): {
      eq(column: string, value: string): PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

type StorageApi = {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        body: Uint8Array,
        options: { contentType?: string; upsert?: boolean },
      ): PromiseLike<{ error: { message: string } | null }>;
    };
  };
};

// Runs on the server, so the browser never sees Supabase credentials and the
// checks below can't be skipped by editing the request. The client's own
// validation stays for fast feedback; this is what actually decides.
export const submitLead = createServerFn({ method: "POST" })
  .validator(leadInput)
  .handler(async ({ data }): Promise<SubmitLeadResult> => {
    // A filled honeypot gets the same success it would get from a real
    // submission — telling a bot it was caught only teaches it to adapt.
    if (data[HONEYPOT]) return { ok: true };
    if (data.elapsedMs < MIN_FILL_MS) return { ok: false, reason: "too_fast" };

    let bytes: Uint8Array | null = null;
    if (data.attachment) {
      const allowed: readonly string[] = ALLOWED_ATTACHMENT_TYPES;
      if (!allowed.includes(data.attachment.contentType)) {
        return { ok: false, reason: "file_type" };
      }
      bytes = decodeBase64(data.attachment.base64);
      if (bytes.length > MAX_ATTACHMENT_BYTES) return { ok: false, reason: "file_too_large" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const lead = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message || null,
      source: data.source || null,
    };

    const { data: saved, error } = await supabaseAdmin
      .from("leads")
      .insert(lead)
      .select("id")
      .single();

    if (error) throw new Error(`Failed to save lead: ${error.message}`);

    // The enquiry is already safe before the file is touched. If storage is
    // down or the bucket is missing, the lead still stands and the notification
    // says a file was attached but didn't make it — far better than refusing
    // the whole submission and losing the enquiry with it.
    let attachmentName: string | null = null;
    let attachmentStored = false;

    if (data.attachment && bytes) {
      attachmentName = data.attachment.name;
      const path = `${saved.id}/${safeName(data.attachment.name)}`;
      try {
        const { error: uploadError } = await (supabaseAdmin as unknown as StorageApi).storage
          .from(LEAD_BUCKET)
          .upload(path, bytes, { contentType: data.attachment.contentType, upsert: true });
        if (uploadError) throw new Error(uploadError.message);

        const { error: linkError } = await (supabaseAdmin as unknown as LeadsWriter)
          .from("leads")
          .update({
            attachment_path: path,
            attachment_name: data.attachment.name,
            attachment_size: bytes.length,
            attachment_type: data.attachment.contentType,
          })
          .eq("id", saved.id);
        if (linkError) throw new Error(linkError.message);

        attachmentStored = true;
      } catch (cause) {
        console.error("[lead] Attachment upload failed; the lead itself was saved", cause);
      }
    }

    // After the insert, and awaited so the notification isn't cut short when
    // the serverless invocation ends. notifyNewLead swallows its own failures:
    // the lead is saved either way, and asking a visitor to submit again
    // because our mail provider is down would be the worse outcome.
    const { notifyNewLead } = await import("./notify-lead");
    await notifyNewLead({ id: saved.id, ...lead, attachmentName, attachmentStored });

    return { ok: true, attachmentStored };
  });
