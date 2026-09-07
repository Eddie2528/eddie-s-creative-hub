import vAnd from "@/assets/logos/v-and.png";
import ogilvy from "@/assets/logos/ogilvy.png";
import spicyHakuhodo from "@/assets/logos/spicy-hakuhodo.png";
import cjWorx from "@/assets/logos/cj-worx.png";
import delphysHakuhodo from "@/assets/logos/delphys-hakuhodo.png";
import cenergy from "@/assets/logos/cenergy-innovation.png";
import centerpoint from "@/assets/logos/centerpoint-entertainment.png";

// Logos that ship with the build, for the agencies the site started with.
export const BUNDLED_LOGOS: Record<string, string> = {
  "v-and": vAnd,
  ogilvy,
  "spicy-hakuhodo": spicyHakuhodo,
  "cj-worx": cjWorx,
  "delphys-hakuhodo": delphysHakuhodo,
  "cenergy-innovation": cenergy,
  "centerpoint-entertainment": centerpoint,
};

export function resolveLogo(src: string): string | null {
  if (!src) return null;
  return src.startsWith("bundled:") ? (BUNDLED_LOGOS[src.slice(8)] ?? null) : src;
}
