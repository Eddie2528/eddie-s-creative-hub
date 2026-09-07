import type { ResolvedLogo } from "@/lib/logos";
import type { Role } from "@/lib/roles";
import { resolveLogo } from "@/lib/bundled-logos";

// Logos sit on a light chip rather than the page's dark card: they arrive in
// their own brand colours, and one of them has no transparency at all, so a
// dark tile would swallow some and box others in white.
function LogoTile({ name, logo }: { name: string; logo: string }) {
  return (
    <div className="flex h-20 w-[clamp(9rem,22vw,11.5rem)] items-center justify-center rounded-sm border border-border bg-white px-5 transition-colors hover:border-primary">
      <img
        src={logo}
        alt={name}
        loading="lazy"
        className="max-h-10 w-auto max-w-full object-contain"
      />
    </div>
  );
}

export function ExperienceMarquee({ logos = [] }: { logos?: ResolvedLogo[] }) {
  // A static row, one tile per logo. It used to scroll, which meant repeating
  // the set three times to keep the track full — and the repeats read as
  // duplicates rather than as motion.
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-wrap justify-center gap-3 px-[clamp(1rem,4vw,2.5rem)]">
      {logos.map((logo) => (
        <LogoTile key={logo.id} name={logo.name} logo={resolveLogo(logo.src) ?? ""} />
      ))}
    </div>
  );
}

export function RoleList({ roles = [] }: { roles?: Role[] }) {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {roles.map((role) => (
        <li
          key={role.id}
          className="grid gap-2 py-6 transition-colors hover:bg-card md:grid-cols-12 md:items-baseline md:gap-6 md:px-4"
        >
          {/* The years are blank until someone fills them in, so the column
              holds its width rather than letting the titles jump left. */}
          <span className="hairline md:col-span-3">{role.period || "—"}</span>
          <h3 className="display text-2xl md:col-span-5 md:text-3xl">{role.title}</h3>
          <p className="text-sm text-muted-foreground md:col-span-4">{role.company}</p>
        </li>
      ))}
    </ul>
  );
}
