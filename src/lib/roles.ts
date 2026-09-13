import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type Role = {
  id: string;
  period: string;
  title: string;
  company: string;
};

const ROLES_KEY = "experience.roles";

// Taken from the CV, in the order it lists them. The years aren't in the CV, so
// they start blank and the list renders without them.
export const DEFAULT_ROLES: Role[] = [
  { id: "v-and", period: "", title: "Associate Director, Project Consulting", company: "V&" },
  { id: "ogilvy", period: "", title: "Senior Account Director", company: "Ogilvy Thailand" },
  { id: "spicy-hakuhodo", period: "", title: "Account Director", company: "Spicy Hakuhodo & Hakuhodo International (Thailand)" },
  { id: "cj-worx", period: "", title: "Account Director", company: "CJ Worx" },
  { id: "delphys-hakuhodo", period: "", title: "Account Supervisor", company: "Delphys Hakuhodo (Thailand)" },
  { id: "cenergy", period: "", title: "Senior Account Executive", company: "Cenergy Innovation (Central Group)" },
  { id: "centerpoint", period: "", title: "Digital PR & Website Editor Supervisor", company: "CenterPoint Entertainment" },
];

const roleSchema = z.object({
  id: z.string().min(1).max(60),
  period: z.string().max(60),
  title: z.string().max(200),
  company: z.string().max(200),
});

type ContentTable = {
  from(table: "site_content"): {
    select(columns: string): PromiseLike<{
      data: { key: string; value: string }[] | null;
      error: { message: string } | null;
    }>;
    upsert(
      rows: { key: string; value: string }[],
      options?: { onConflict?: string },
    ): PromiseLike<{ error: { message: string } | null }>;
  };
};

async function contentTable() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return (supabaseAdmin as unknown as ContentTable).from("site_content");
}

// The roles used to be twenty-one flat content keys, one per field. Anything
// saved under those still counts, so upgrading doesn't quietly drop the years
// someone had already filled in.
function fromLegacyKeys(stored: Map<string, string>): Role[] | null {
  const roles = DEFAULT_ROLES.map((role, i) => ({
    id: role.id,
    period: stored.get(`role${i + 1}.period`) ?? role.period,
    title: stored.get(`role${i + 1}.title`) ?? role.title,
    company: stored.get(`role${i + 1}.company`) ?? role.company,
  }));
  const touched = roles.some(
    (role, i) =>
      role.period !== DEFAULT_ROLES[i]?.period ||
      role.title !== DEFAULT_ROLES[i]?.title ||
      role.company !== DEFAULT_ROLES[i]?.company,
  );
  return touched ? roles : null;
}

// Shaped from rows the caller already has, so the page can read site_content
// once and get roles out of the same trip. Unparseable JSON falls back here
// rather than throwing: a broken roles blob shouldn't cost the caller the rest
// of what it read.
export function rolesFromRows(stored: Map<string, string>): Role[] {
  const raw = stored.get(ROLES_KEY);
  if (raw) {
    try {
      const parsed = z.array(roleSchema).safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    } catch (cause) {
      console.error("[roles] Stored list unreadable; using the built-in one", cause);
      return DEFAULT_ROLES;
    }
  }
  return fromLegacyKeys(stored) ?? DEFAULT_ROLES;
}

// A role with nothing in it would render as an empty row on the site.
export function visibleRoles(roles: Role[]): Role[] {
  return roles.filter((role) => role.title || role.company);
}

async function loadRoles(): Promise<Role[]> {
  try {
    const { readContentRows } = await import("./site-content");
    const rows = await readContentRows();
    return rolesFromRows(new Map(rows.map((row) => [row.key, row.value])));
  } catch (cause) {
    console.error("[roles] Using the built-in list; load failed", cause);
    return DEFAULT_ROLES;
  }
}

export const getRoles = createServerFn({ method: "GET" }).handler(async (): Promise<Role[]> => {
  return visibleRoles(await loadRoles());
});

export const adminListRoles = createServerFn({ method: "POST" }).handler(async (): Promise<Role[]> => {
  const { requireAdmin } = await import("./admin-session");
  await requireAdmin();
  return loadRoles();
});

export const adminSaveRoles = createServerFn({ method: "POST" })
  .validator(z.object({ roles: z.array(roleSchema).max(40) }))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireAdmin } = await import("./admin-session");
    await requireAdmin();

    const { error } = await (await contentTable()).upsert(
      [{ key: ROLES_KEY, value: JSON.stringify(data.roles) }],
      { onConflict: "key" },
    );
    if (error) {
      throw new Error(
        `Couldn’t save the roles — ${error.message}. A missing site_content table means ` +
          `migration 0003 still needs running in the Cloud SQL editor.`,
      );
    }
    return { ok: true };
  });
