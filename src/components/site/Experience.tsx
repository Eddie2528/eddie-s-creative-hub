import type { ResolvedLogo } from "@/lib/logos";
import type { Role } from "@/lib/roles";
import { resolveLogo } from "@/lib/bundled-logos";

// Logos sit on a light chip rather than the page's dark card: they arrive in
// their own brand colours, and one of them has no transparency at all, so a
// dark tile would swallow some and box others in white.
function LogoTile({ name, logo }: { name: string; logo: string }) {
  return (
    <div className="flex h-20 w-[clamp(9rem,22vw,11.5rem)] shrink-0 items-center justify-center rounded-sm border border-border bg-white px-5 transition-colors hover:border-primary">
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
  // Two tiles pointing at the same file would read as one logo printed twice,
  // so only the first of each image makes it onto the track.
  const unique = logos.filter(
    (logo, i) => logos.findIndex((other) => other.src === logo.src) === i,
  );

  // Exactly two passes. The animation travels -50%, so two copies put the
  // second where the first began and the loop closes without a jump — three
  // copies land it mid-set and the strip visibly snaps.
  const track = [...unique, ...unique];

  return (
    <div className="relative overflow-hidden py-2">
      <div className="marquee-track gap-3">
        {track.map((logo, i) => (
          <LogoTile key={`${logo.id}-${i}`} name={logo.name} logo={resolveLogo(logo.src) ?? ""} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
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
          {/* hairline sets its own colour, so this has to win outright rather
              than depend on which utility the stylesheet emits last. Lighter
              than muted, short of the title's white. */}
          <span className="hairline !text-foreground/80 md:col-span-3">{role.period || "—"}</span>
          <h3 className="display text-2xl md:col-span-5 md:text-3xl">{role.title}</h3>
          <p className="text-sm text-foreground/80 md:col-span-4">{role.company}</p>
        </li>
      ))}
    </ul>
  );
}
