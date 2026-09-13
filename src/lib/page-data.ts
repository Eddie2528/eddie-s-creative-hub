import { createServerFn } from "@tanstack/react-start";

import { cvUrlFrom } from "./site-assets";
import {
  CONTENT_DEFAULTS,
  imageUrls,
  mergeContent,
  readContentRows,
  rowsToRecord,
  type SiteContent,
} from "./site-content";
import { DEFAULT_ROLES, rolesFromRows, visibleRoles, type Role } from "./roles";
import { DEFAULT_LOGOS, logosFromRows, resolveLogos, type ResolvedLogo } from "./logos";

export type PageData = {
  cvUrl: string;
  content: SiteContent;
  images: Record<string, string>;
  roles: Role[];
  logos: ResolvedLogo[];
};

// Everything the page needs from site_content, in one read.
//
// It used to be five — copy, photos, the CV, the roles, the logos — each its
// own server function running its own `select` against the same table, which
// is five chances for one to come back empty while the other four succeed.
// That is not theoretical: on 13 September a visitor got the copy from the
// database and the photos from the built-in fallbacks on the same render, and
// the fallbacks at the time were of somebody else. One read can't do that. It
// either has the rows or it doesn't, and what the page shows is coherent
// either way.
//
// The per-thing server functions are still there for the back-office, which
// asks for one thing at a time and doesn't care.
export const getPageData = createServerFn({ method: "GET" }).handler(async (): Promise<PageData> => {
  try {
    const rows = await readContentRows();
    const stored = rowsToRecord(rows);
    const map = new Map(rows.map((row) => [row.key, row.value]));

    return {
      cvUrl: cvUrlFrom(stored),
      content: mergeContent(stored),
      images: imageUrls(stored),
      roles: visibleRoles(rolesFromRows(map)),
      logos: resolveLogos(logosFromRows(map)),
    };
  } catch (cause) {
    // Never throws: the page has to render, and everything here has a built-in
    // default that is correct on its own.
    console.error("[page] Using the built-in content; load failed", cause);
    return {
      cvUrl: cvUrlFrom({}),
      content: CONTENT_DEFAULTS,
      images: {},
      roles: visibleRoles(DEFAULT_ROLES),
      logos: resolveLogos(DEFAULT_LOGOS),
    };
  }
});
