const companies = [
  { name: "Ogilvy", mark: "OG" },
  { name: "Leo Burnett", mark: "LB" },
  { name: "Dentsu", mark: "DT" },
  { name: "Wunderman", mark: "WT" },
  { name: "VML", mark: "VM" },
  { name: "Publicis", mark: "PB" },
  { name: "TBWA", mark: "TB" },
  { name: "Edelman", mark: "ED" },
  { name: "Index Creative", mark: "IX" },
  { name: "GREYnJ", mark: "GJ" },
];

function LogoTile({ name, mark }: { name: string; mark: string }) {
  return (
    <div className="mx-2 flex w-44 shrink-0 items-center gap-3 rounded-sm border border-border bg-card px-5 py-4 transition-colors hover:border-primary">
      <span className="display flex size-9 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
        {mark}
      </span>
      <span className="truncate text-sm font-medium tracking-wide">{name}</span>
    </div>
  );
}

export function ExperienceMarquee() {
  return (
    <div className="relative overflow-hidden py-2">
      <div className="marquee-track">
        {[...companies, ...companies].map((company, i) => (
          <LogoTile key={`${company.name}-${i}`} {...company} />
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
