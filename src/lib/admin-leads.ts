import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
};

export const adminSignIn = createServerFn({ method: "POST" })
  .validator(z.object({ password: z.string().min(1).max(200) }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { signInAdmin } = await import("./admin-session");
    return { ok: await signInAdmin(data.password) };
  });

export const adminSignOut = createServerFn({ method: "POST" }).handler(async () => {
  const { signOutAdmin } = await import("./admin-session");
  signOutAdmin();
  return { ok: true };
});

// Every reader goes through here, so authorization is checked in exactly one
// place and the leads never travel to a browser that hasn't passed it.
export const adminListLeads = createServerFn({ method: "POST" }).handler(async (): Promise<Lead[]> => {
  const { requireAdmin } = await import("./admin-session");
  await requireAdmin();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("id,name,email,phone,message,source,status,created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to load leads: ${error.message}`);
  return data ?? [];
});

export const adminSetLeadStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), status: z.enum(LEAD_STATUSES) }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireAdmin } = await import("./admin-session");
    await requireAdmin();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("leads")
      .update({ status: data.status })
      .eq("id", data.id);

    if (error) throw new Error(`Failed to update lead: ${error.message}`);
    return { ok: true };
  });
