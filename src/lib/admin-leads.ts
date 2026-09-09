import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { SignInResult } from "./admin-session";

export const LEAD_STATUSES = ["new", "contacted", "archived"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string | null;
  source: string | null;
  status: string;
  created_at: string;
  attachment_name: string | null;
  attachment_size: number | null;
  attachment_type: string | null;
};

export const adminSignIn = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string().min(1).max(200) }))
  .handler(async ({ data }): Promise<{ result: SignInResult }> => {
    const { signInAdmin } = await import("./admin-session");
    return { result: await signInAdmin(data.password) };
  });

export const adminSignOut = createServerFn({ method: "POST" }).handler(async () => {
  const { signOutAdmin } = await import("./admin-session");
  signOutAdmin();
  return { ok: true };
});

// The attachment columns were added through the Cloud SQL editor, which costs
// no credits but leaves Lovable's generated types unaware of them — same as
// site_content. Describe just the reads we make rather than casting the whole
// client to any.
type LeadsReader = {
  from(table: "leads"): {
    select(columns: string): {
      order(
        column: string,
        options: { ascending: boolean },
      ): PromiseLike<{ data: Lead[] | null; error: { message: string } | null }>;
      eq(
        column: string,
        value: string,
      ): {
        single(): PromiseLike<{
          data: { attachment_path: string | null; attachment_name: string | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

// Every reader goes through here, so authorization is checked in exactly one
// place and the leads never travel to a browser that hasn't passed it.
export const adminListLeads = createServerFn({ method: "POST" }).handler(async (): Promise<Lead[]> => {
  const { requireAdmin } = await import("./admin-session");
  await requireAdmin();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as unknown as LeadsReader)
    .from("leads")
    .select(
      "id,name,email,phone,message,source,status,created_at,attachment_name,attachment_size,attachment_type",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load leads: ${error.message}`);
  return data ?? [];
});

type SignedUrlApi = {
  storage: {
    from(bucket: string): {
      createSignedUrl(
        path: string,
        expiresIn: number,
        options?: { download?: string },
      ): PromiseLike<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
    };
  };
};

// The bucket is private, so there is no URL to store or share — a link is
// minted per click and dies within the hour. Requiring admin here is what
// stands between an attached brief and anyone who guesses a lead id.
export const adminLeadAttachmentUrl = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ url: string }> => {
    const { requireAdmin } = await import("./admin-session");
    await requireAdmin();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lead, error } = await (supabaseAdmin as unknown as LeadsReader)
      .from("leads")
      .select("attachment_path,attachment_name")
      .eq("id", data.id)
      .single();

    if (error) throw new Error(`Couldn’t find that lead — ${error.message}`);
    if (!lead?.attachment_path) throw new Error("That lead has no attachment.");

    const { LEAD_BUCKET } = await import("./submit-lead");
    const { data: signed, error: signError } = await (supabaseAdmin as unknown as SignedUrlApi).storage
      .from(LEAD_BUCKET)
      .createSignedUrl(
        lead.attachment_path,
        60 * 60,
        // The stored path is ASCII-safe; this hands back the name they picked.
        lead.attachment_name ? { download: lead.attachment_name } : {},
      );

    if (signError || !signed) {
      throw new Error(`Couldn’t open the file — ${signError?.message ?? "no link returned"}`);
    }
    return { url: signed.signedUrl };
  });

// Both of these take a list. The back-office ticks rows and acts on them
// together — clearing a batch of test enquiries one confirmation at a time was
// the tedious part — and a single row is simply a list of one, so there is one
// code path rather than two that can drift apart.
const idList = z.array(z.string().uuid()).min(1).max(500);

export const adminSetLeadStatus = createServerFn({ method: "POST" })
  .validator(z.object({ ids: idList, status: z.enum(LEAD_STATUSES) }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireAdmin } = await import("./admin-session");
    await requireAdmin();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("leads")
      .update({ status: data.status })
      .in("id", data.ids);

    if (error) throw new Error(`Failed to update leads: ${error.message}`);
    return { ok: true };
  });

// Deleting throws away someone's enquiry for good, so the caller names what is
// about to go — the person, or the count — and asks before calling this.
export const adminDeleteLeads = createServerFn({ method: "POST" })
  .validator(z.object({ ids: idList }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireAdmin } = await import("./admin-session");
    await requireAdmin();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("leads").delete().in("id", data.ids);

    if (error) throw new Error(`Couldn’t delete — ${error.message}`);
    return { ok: true };
  });
