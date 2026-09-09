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
