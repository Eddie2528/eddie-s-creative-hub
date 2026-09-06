import vAnd from "@/assets/logos/v-and.png";
import ogilvy from "@/assets/logos/ogilvy.png";
import spicyHakuhodo from "@/assets/logos/spicy-hakuhodo.png";
import cjWorx from "@/assets/logos/cj-worx.png";
import delphysHakuhodo from "@/assets/logos/delphys-hakuhodo.png";
import cenergy from "@/assets/logos/cenergy-innovation.png";
import centerpoint from "@/assets/logos/centerpoint-entertainment.png";

const companies = [
  { id: "v-and", name: "V&", logo: vAnd },
  { id: "ogilvy", name: "Ogilvy", logo: ogilvy },
  { id: "spicy-hakuhodo", name: "Spicy Hakuhodo", logo: spicyHakuhodo },
  { id: "cj-worx", name: "CJ Worx", logo: cjWorx },
  { id: "delphys-hakuhodo", name: "Delphys Hakuhodo", logo: delphysHakuhodo },
  { id: "cenergy-innovation", name: "Cenergy Innovation", logo: cenergy },
  { id: "centerpoint-entertainment", name: "CenterPoint Entertainment", logo: centerpoint },
];

export type ImageOverrides = Record<string, string>;

// Logos sit on a light chip rather than the page's dark card: they arrive in
// their own brand colours, and one of them has no transparency at all, so a
// dark tile would swallow some and box others in white.
function LogoTile({ name, logo }: { name: string; logo: string }) {
  return (
    <div className="mx-2 flex h-20 w-[clamp(10rem,30vw,13rem)] shrink-0 items-center justify-center rounded-sm border border-border bg-white px-6 transition-colors hover:border-primary">
      <img
        src={logo}
        alt={name}
        loading="lazy"
        className="max-h-10 w-auto max-w-full object-contain"
      />
    </div>
  );
}

export function ExperienceMarquee({ images = {} }: { images?: ImageOverrides }) {
  return (
    <div className="relative overflow-hidden py-2">
      <div className="marquee-track">
        {[...companies, ...companies, ...companies].map((company, i) => (
          <LogoTile
            key={`${company.id}-${i}`}
            name={company.name}
            logo={images[`logo.${company.id}`] ?? company.logo}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}

const roles = [
  {
    period: "2019 — Now",
    title: "Business Development Director",
    detail: "Leading new business, pitches and client growth across integrated communications.",
  },
  {
    period: "2014 — 2019",
    title: "Client Service Director",
    detail: "Running key accounts across advertising, branding and integrated campaigns.",
  },
  {
    period: "2010 — 2014",
    title: "PR & Brand Manager",
    detail: "Brand storytelling, media relations and launch programmes for regional brands.",
  },
  {
    period: "2008 — 2010",
    title: "Designer / Art Director",
    detail: "Where it started: communication design, identity and campaign craft.",
  },
];

export function RoleList() {
  return (
    <ul className="divide-y divide-border border-y border-border">
      {roles.map((role) => (
        <li
          key={role.title}
          className="grid gap-2 py-6 transition-colors hover:bg-card md:grid-cols-12 md:items-baseline md:gap-6 md:px-4"
        >
          <span className="hairline md:col-span-3">{role.period}</span>
          <h3 className="display text-2xl md:col-span-4 md:text-3xl">{role.title}</h3>
          <p className="text-sm text-muted-foreground md:col-span-5">{role.detail}</p>
        </li>
      ))}
    </ul>
  );
}
