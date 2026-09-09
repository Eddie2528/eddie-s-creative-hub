import { createFileRoute } from "@tanstack/react-router";

import { getCvUrl } from "@/lib/site-assets";
import { getSiteContent, getSiteImages } from "@/lib/site-content";
import { getCampaigns } from "@/lib/works";
import { getRoles } from "@/lib/roles";
import { getLogos } from "@/lib/logos";
import { ArrowUpRight, Download, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LeadDialog } from "@/components/site/LeadDialog";
import { DirectContact } from "@/components/site/DirectContact";
import { SocialLinks } from "@/components/site/SocialLinks";
import { PhotoCarousel } from "@/components/site/PhotoCarousel";
import { Works } from "@/components/site/Works";
import { ExperienceMarquee, RoleList } from "@/components/site/Experience";

import eddie1 from "@/assets/eddie-1.jpg";
import eddie2 from "@/assets/eddie-2.jpg";
import eddie3 from "@/assets/eddie-3.jpg";

const TITLE = "Eddie Nakharin — Brand, Communications & Business Development";
const DESCRIPTION =
  "18 years across advertising, branding, PR, events and business development. Portfolio, work experience and CV of Eddie Nakharin.";

export const Route = createFileRoute("/")({
  head: ({ loaderData }) => {
    const title = loaderData?.content["meta.title"] ?? TITLE;
    const description = loaderData?.content["meta.description"] ?? DESCRIPTION;
    return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    };
  },
  // Six independent reads. Awaited one after another the page couldn't render
  // until all six round trips had finished in series — measured at 4.4s to
  // first byte on a cold worker, 0.9–1.5s warm. Nothing here depends on
  // anything else here, so they go together.
  loader: async () => {
    const [cvUrl, content, images, campaigns, roles, logos] = await Promise.all([
      getCvUrl(),
      getSiteContent(),
      getSiteImages(),
      getCampaigns(),
      getRoles(),
      getLogos(),
    ]);
    return { cvUrl, content, images, campaigns, roles, logos };
  },
  component: Index,
});

function Index() {
  const { cvUrl: CV_URL, content, images, campaigns, roles, logos } = Route.useLoaderData();
  const heroSlots = [
    { key: "hero.photo1", fallback: eddie1, alt: "Portrait of Eddie Nakharin" },
    { key: "hero.photo2", fallback: eddie2, alt: "Eddie presenting brand strategy to a team" },
    { key: "hero.photo3", fallback: eddie3, alt: "Eddie on a rooftop in Bangkok at dusk" },
    { key: "hero.photo4", fallback: null, alt: "Eddie Nakharin" },
    { key: "hero.photo5", fallback: null, alt: "Eddie Nakharin" },
  ];
  const profileSlots = [
    { key: "profile.photo", fallback: eddie2, alt: "Eddie Nakharin leading a workshop" },
    { key: "profile.photo2", fallback: null, alt: "Eddie Nakharin" },
    { key: "profile.photo3", fallback: null, alt: "Eddie Nakharin" },
    { key: "profile.photo4", fallback: null, alt: "Eddie Nakharin" },
    { key: "profile.photo5", fallback: null, alt: "Eddie Nakharin" },
  ];

  // Choosing one photo means one photo — the carousel drops its arrows, dots
  // and auto-advance on its own once it has nothing to advance to. Only when
  // no slot has been set at all do the built-in photos stand in.
  const gallery = (slots: { key: string; fallback: string | null; alt: string }[]) => {
    const chosen = slots.filter((slot) => images[slot.key]);
    const used = chosen.length > 0 ? chosen : slots.filter((slot) => slot.fallback);
    return used.map((slot) => ({
      src: images[slot.key] ?? (slot.fallback as string),
      alt: images[slot.key] ? "Eddie Nakharin" : slot.alt,
    }));
  };

  const heroPhotos = gallery(heroSlots);
  const profilePhotos = gallery(profileSlots);
  const universityLogos = ["education.logo1", "education.logo2"]
    .map((key) => images[key])
    .filter((src): src is string => Boolean(src));

  return (
    <div className="grain min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="#top" className="display text-lg tracking-wide">
            {content["header.wordmark"]}
            <span className="text-primary">.</span>
          </a>
          <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
            <a href="#experience" className="transition-colors hover:text-foreground">
              Experience
            </a>
            <a href="#works" className="transition-colors hover:text-foreground">
              Works
            </a>
            <a href="#profile" className="transition-colors hover:text-foreground">
              Profile
            </a>
          </nav>
          <Button asChild variant="outline" size="sm">
            <a href={CV_URL} download>
              <Download className="size-4" />
              CV
            </a>
          </Button>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="mx-auto w-full max-w-6xl px-[clamp(1rem,4vw,2.5rem)] pb-[clamp(3.5rem,9vw,6rem)] pt-[clamp(2.5rem,7vw,6rem)]">
          <p className="hairline">{content["hero.kicker"]}</p>
          <h1 className="display mt-6 text-[clamp(2.75rem,11vw,8rem)]">
            {content["hero.headline1"]}
            <br />
            <span className="text-primary">{content["hero.headline2"]}</span>{" "}
            {content["hero.headline3"]}
          </h1>

          {/* What he's looking for, above the fold at every width. The site
              said plenty about who Eddie is and nothing about what he wants. */}
          {content["hero.availability"] ? (
            <p className="mt-7 inline-flex max-w-full items-center gap-2.5 rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-sm text-foreground/90">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              {content["hero.availability"]}
            </p>
          ) : null}

          <div className="mt-[clamp(2rem,6vw,3rem)] grid gap-[clamp(1.5rem,4vw,2.5rem)] md:grid-cols-12 md:items-start">
            <div className="md:col-span-5">
              <PhotoCarousel photos={heroPhotos} />
            </div>
            <div className="space-y-6 text-lg leading-relaxed text-muted-foreground md:col-span-7">
              <p className="display text-3xl text-foreground md:text-4xl">{content["hero.greeting"]}</p>
              <p>{content["hero.intro1"]}</p>
              <p>{content["hero.intro2"]}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <LeadDialog content={content}>
                  <Button size="lg" className="font-semibold">
                    <Mail className="size-4" />
                    {content["cta.primary"]}
                  </Button>
                </LeadDialog>
                <Button asChild size="lg" variant="outline">
                  <a href={CV_URL} download>
                    <Download className="size-4" />
                    {content["cta.secondary"]}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Experience */}
        <section id="experience" className="border-t border-border py-[clamp(3.5rem,9vw,6rem)]">
          <div className="mx-auto w-full max-w-6xl px-[clamp(1rem,4vw,2.5rem)]">
            <p className="hairline">{content["experience.kicker"]}</p>
            <h2 className="display mt-4 text-[clamp(1.9rem,6vw,4rem)]">{content["experience.heading"]}</h2>
          </div>
          <div className="mt-10">
            <ExperienceMarquee logos={logos} />
          </div>
          <div className="mx-auto mt-14 w-full max-w-6xl px-[clamp(1rem,4vw,2.5rem)]">
            <RoleList roles={roles} />
          </div>
        </section>

        {/* Works */}
        <section id="works" className="border-t border-border py-[clamp(3.5rem,9vw,6rem)]">
          <div className="mx-auto w-full max-w-6xl px-[clamp(1rem,4vw,2.5rem)]">
            <p className="hairline">{content["works.kicker"]}</p>
            <h2 className="display mt-4 text-[clamp(1.9rem,6vw,4rem)]">{content["works.heading"]}</h2>
            <p className="mt-4 max-w-xl text-muted-foreground">{content["works.note"]}</p>
            <div className="mt-10">
              <Works campaigns={campaigns} />
            </div>
          </div>
        </section>

        {/* Profile */}
        <section id="profile" className="border-t border-border py-[clamp(3.5rem,9vw,6rem)]">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-[clamp(1rem,4vw,2.5rem)] md:grid-cols-12 md:items-center">
            <div className="md:col-span-5">
              <PhotoCarousel photos={profilePhotos} />
            </div>
            <div className="space-y-5 md:col-span-7">
              <p className="hairline">{content["profile.kicker"]}</p>
              <h2 className="display text-[clamp(2rem,6vw,3.5rem)]">{content["profile.heading"]}</h2>
              <p className="text-muted-foreground">{content["profile.para1"]}</p>
              <p className="text-muted-foreground">{content["profile.para2"]}</p>
              {/* Four across only once there's room for them. At tablet width four
                  columns left 88px a cell, which is narrower than a single
                  tracked-out word like ADVERTISING. */}
              <dl className="grid grid-cols-2 gap-6 pt-4 lg:grid-cols-4">
                {[1, 2, 3, 4].map((n) => [
                  content[`profile.stat${n}.value`],
                  content[`profile.stat${n}.label`],
                ]).map(([value, label]) => (
                  // Grid items default to min-width:auto, which stops them
                  // shrinking below their content and is what let the label
                  // push past its column in the first place.
                  <div key={label} className="min-w-0">
                    <dt className="display text-3xl text-primary">{value}</dt>
                    <dd className="hairline mt-1">{label}</dd>
                  </div>
                ))}
              </dl>

              {universityLogos.length > 0 ? (
                // Side by side under the numbers. On a light chip, like the
                // agency logos: these arrive as dark marks on white and would
                // vanish into the page otherwise.
                <div className="grid grid-cols-2 gap-6 pt-2">
                  {/* Two columns across the same width as the stats above, so
                      the chips line up with the copy rather than floating at
                      whatever width their artwork happens to be. */}
                  {universityLogos.map((src) => (
                    <span
                      key={src}
                      className="flex h-24 items-center justify-center rounded-sm bg-white px-3"
                    >
                      <img
                        src={src}
                        alt="University"
                        loading="lazy"
                        className="max-h-[4.5rem] max-w-full object-contain"
                      />
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border py-[clamp(4rem,11vw,7rem)]">
          <div className="mx-auto w-full max-w-6xl px-[clamp(1rem,4vw,2.5rem)] text-center">
            <h2 className="display text-[clamp(2.25rem,9vw,6rem)]">
              {content["cta.heading"]}
              <span className="text-primary">.</span>
            </h2>
            {/* One row, one gap, one height: the round buttons use the same
                size token as the wide ones so nothing sits a pixel proud. */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <SocialLinks content={content} />
              <LeadDialog content={content}>
                <Button size="lg" className="font-semibold">
                  {content["cta.primary"]}
                  <ArrowUpRight className="size-4" />
                </Button>
              </LeadDialog>
              <Button asChild size="lg" variant="outline">
                <a href={CV_URL} download>
                  <Download className="size-4" />
                  {content["cta.secondary"]}
                </a>
              </Button>
            </div>
            <DirectContact content={content} />
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} {content["footer.name"]}</span>
          <span>{content["footer.location"]}</span>
        </div>
      </footer>

      {/* Sticky lead button */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8">
        <SocialLinks content={content} floating />
        <LeadDialog content={content}>
          <Button size="lg" className="rounded-full px-6 font-semibold shadow-lg">
            <Mail className="size-4" />
            {content["cta.primary"]}
          </Button>
        </LeadDialog>
      </div>
    </div>
  );
}
