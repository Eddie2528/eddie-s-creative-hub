import { useEffect } from "react";

import { EVENT_NAMES, recordEvent, type EventName } from "@/lib/site-events";

// Counts five things and sends them to Eddie's own database. Everything here
// is best-effort by design: it runs after the page has rendered, it never
// awaits anything the page is waiting for, and every call is wrapped — a
// counter that can break the page is worse than no counter.

const VISIT_KEY = "site-visit";
const SENT_KEY = "site-visit-sent";

// Per tab session: sessionStorage is gone when the tab closes, so nothing here
// follows anyone between visits, let alone between sites. In a browser that
// refuses storage this falls back to a fresh id each render, which costs a
// duplicate the unique index throws away.
function visitId(): string {
  try {
    const existing = sessionStorage.getItem(VISIT_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(VISIT_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function alreadySent(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SENT_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function remember(sent: Set<string>) {
  try {
    sessionStorage.setItem(SENT_KEY, JSON.stringify([...sent]));
  } catch {
    // Private windows and blocked storage: the request still went, and the
    // database drops the duplicate.
  }
}

export function Track() {
  useEffect(() => {
    const visit = visitId();
    const sent = alreadySent();

    const track = (name: EventName) => {
      // Every event implies a visit, so ask for that one first. Normally it is
      // already sent and this returns immediately; when it isn't — a cold
      // worker, or the table not existing yet — this is the second chance.
      // Without it a lost visit row leaves the funnel dividing by too little
      // and a step reading over 100%, which is the kind of wrong number you
      // can't tell from a right one later.
      if (name !== "visit") track("visit");

      if (sent.has(name)) return;
      sent.add(name);
      remember(sent);
      // Deliberately not awaited. If it fails, it fails quietly — the same
      // rule the loaders follow — but it stops counting as sent, so the next
      // event on the page tries it again.
      void recordEvent({ data: { name, visit } }).catch(() => {
        sent.delete(name);
        remember(sent);
      });
    };

    track("visit");

    // A section counts as seen when it reaches the middle of the screen, which
    // is the difference between scrolling past something and looking at it.
    //
    // Deliberately not a threshold: "25% of the element visible" never becomes
    // true for a section taller than the viewport, and the works grid is four
    // times taller than one. That version counted the short closing section
    // and silently never counted the work — the thing the whole page is for.
    const sections: { id: string; event: EventName }[] = [
      { id: "works", event: "works_seen" },
      { id: "contact", event: "contact_seen" },
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const match = sections.find((section) => section.id === entry.target.id);
          if (match) {
            track(match.event);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0, rootMargin: "-25% 0px -25% 0px" },
    );
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    }

    // One delegated listener rather than a handler on every button: the
    // elements worth counting say so themselves with data-track, so adding a
    // second CV button somewhere is an attribute, not a wiring job.
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.("[data-track]");
      const name = target?.getAttribute("data-track");
      if (name && (EVENT_NAMES as readonly string[]).includes(name)) track(name as EventName);
    };
    document.addEventListener("click", onClick, { capture: true });

    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, []);

  return null;
}
