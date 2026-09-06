import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Bots fill every field they find, including ones a person never sees.
export const HONEYPOT = "company_website";
export const MIN_FILL_MS = 2000;

const leadInput = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(1).max(50),
  message: z.string().trim().max(5000).optional(),
  source: z.string().trim().max(200).optional(),
  [HONEYPOT]: z.string().optional(),
  elapsedMs: z.number().nonnegative(),
});

export type LeadInput = z.infer<typeof leadInput>;

export type SubmitLeadResult = { ok: true } | { ok: false; reason: "too_fast" };

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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("leads").insert({
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message || null,
      source: data.source || null,
    });

    if (error) throw new Error(`Failed to save lead: ${error.message}`);

    return { ok: true };
  });
