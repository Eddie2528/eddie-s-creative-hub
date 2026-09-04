import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Download, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LeadDialog } from "@/components/site/LeadDialog";
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
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const CV_URL = "/files/Eddie-Nakharin-CV.pdf";

function Index() {
  return (
    <div className="grain min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="#top" className="display text-lg tracking-wide">
            Eddie<span className="text-primary">.</span>
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
          <p className="hairline">Bangkok — Advertising, Branding, PR, Events, BD</p>
          <h1 className="display mt-6 text-[clamp(2.75rem,11vw,8rem)]">
            Creative mind,
            <br />
            <span className="text-primary">business</span> instinct.
          </h1>

          <div className="mt-[clamp(2rem,6vw,3rem)] grid gap-[clamp(1.5rem,4vw,2.5rem)] md:grid-cols-12 md:items-start">
            <div className="md:col-span-5">
              <PhotoCarousel
                photos={[
                  { src: eddie1, alt: "Portrait of Eddie Nakharin" },
                  { src: eddie2, alt: "Eddie presenting brand strategy to a team" },
                  { src: eddie3, alt: "Eddie on a rooftop in Bangkok at dusk" },
                ]}
              />
            </div>
            <div className="space-y-6 text-lg leading-relaxed text-muted-foreground md:col-span-7">
              <p className="display text-3xl text-foreground md:text-4xl">Hi, I&rsquo;m Eddie.</p>
              <p>
                I&rsquo;ve spent the past 18 years working across advertising, branding, PR, events, and
                business development.
              </p>
              <p>
                My career started from a creative background. I studied Communication Design before
                continuing with a Master&rsquo;s degree in Communication Arts, and over time I moved from
                design and PR into client service and business leadership. That journey has shaped the way
                I work today. I naturally look at a challenge from both the creative and business side.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <LeadDialog>
                  <Button size="lg" className="font-semibold">
                    <Mail className="size-4" />
                    Get in Touch
                  </Button>
                </LeadDialog>
                <Button asChild size="lg" variant="outline">
                  <a href={CV_URL} download>
                    <Download className="size-4" />
                    Download my CV
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Experience */}
        <section id="experience" className="border-t border-border py-[clamp(3.5rem,9vw,6rem)]">
          <div className="mx-auto w-full max-w-6xl px-[clamp(1rem,4vw,2.5rem)]">
            <p className="hairline">01 — Experience</p>
            <h2 className="display mt-4 text-[clamp(1.9rem,6vw,4rem)]">Brands & teams I&rsquo;ve worked with</h2>
          </div>
          <div className="mt-10">
            <ExperienceMarquee />
          </div>
          <div className="mx-auto mt-14 w-full max-w-6xl px-[clamp(1rem,4vw,2.5rem)]">
            <RoleList />
          </div>
        </section>

        {/* Works */}
        <section id="works" className="border-t border-border py-[clamp(3.5rem,9vw,6rem)]">
          <div className="mx-auto w-full max-w-6xl px-[clamp(1rem,4vw,2.5rem)]">
            <p className="hairline">02 — Selected works</p>
            <h2 className="display mt-4 text-[clamp(1.9rem,6vw,4rem)]">
              Campaigns, brands & experiences
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Hover a film to preview, click any piece to open it full size.
            </p>
            <div className="mt-10">
              <Works />
            </div>
          </div>
        </section>

        {/* Profile */}
        <section id="profile" className="border-t border-border py-[clamp(3.5rem,9vw,6rem)]">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-[clamp(1rem,4vw,2.5rem)] md:grid-cols-12 md:items-center">
            <div className="md:col-span-5">
              <img
                src={eddie2}
                alt="Eddie Nakharin leading a workshop"
                width={1024}
                height={1280}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-sm object-cover"
              />
            </div>
            <div className="space-y-5 md:col-span-7">
              <p className="hairline">03 — Personal profile</p>
              <h2 className="display text-[clamp(2rem,6vw,3.5rem)]">Half maker, half dealmaker</h2>
              <p className="text-muted-foreground">
                I build relationships the same way I build campaigns: with a clear idea, honest
                conversation and a plan that actually works commercially. Days are split between pitching,
                shaping strategy with creative teams, and keeping clients close.
              </p>
              <p className="text-muted-foreground">
                Outside work you&rsquo;ll find me shooting photos around Bangkok, collecting design books,
                and mentoring young planners and designers who are figuring out their own path.
              </p>
              <dl className="grid grid-cols-2 gap-6 pt-4 sm:grid-cols-4">
                {[
                  ["18+", "Years"],
                  ["120+", "Campaigns"],
                  ["40+", "Brands"],
                  ["MA", "Comm. Arts"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="display text-3xl text-primary">{value}</dt>
                    <dd className="hairline mt-1">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border py-[clamp(4rem,11vw,7rem)]">
          <div className="mx-auto w-full max-w-6xl px-[clamp(1rem,4vw,2.5rem)] text-center">
            <h2 className="display text-[clamp(2.25rem,9vw,6rem)]">
              Let&rsquo;s make something<span className="text-primary">.</span>
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <LeadDialog>
                <Button size="lg" className="font-semibold">
                  Get in Touch
                  <ArrowUpRight className="size-4" />
                </Button>
              </LeadDialog>
              <Button asChild size="lg" variant="outline">
                <a href={CV_URL} download>
                  <Download className="size-4" />
                  Download my CV
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} Eddie Nakharin</span>
          <span>Bangkok, Thailand</span>
        </div>
      </footer>

      {/* Sticky lead button */}
      <div className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8">
        <LeadDialog>
          <Button size="lg" className="rounded-full px-6 font-semibold shadow-lg">
            <Mail className="size-4" />
            Get in Touch
          </Button>
        </LeadDialog>
      </div>
    </div>
  );
}
