import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  adminEventSummary,
  EVENT_LABELS,
  EVENT_NAMES,
  type Breakdown,
  type EventSummary,
  type EventWindow,
} from "@/lib/site-events";

// Every number here is visits, not clicks: one visit can only write one row
// per thing, so "9 downloaded the CV" is nine people, not one person pressing
// it nine times.
function percent(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

// Two letters is what the request carries, and a flag reads faster than a code
// in a list. Anything unexpected falls through as itself.
function countryLabel(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return code;
  const flag = String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    return `${flag}  ${name ?? code}`;
  } catch {
    // DisplayNames is missing in a few older browsers. A flag and two letters
    // still read fine; a tab that throws on render does not.
    return `${flag}  ${code}`;
  }
}

function Bar({ share }: { share: number }) {
  return (
    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
    </div>
  );
}

function Funnel({ counts }: { counts: EventWindow["counts"] }) {
  const visits = counts.visit;

  return (
    <div className="rounded-lg border border-border p-5">
      <p className="hairline mb-4">How far they got</p>
      <div className="space-y-3">
        {EVENT_NAMES.map((name) => {
          const value = counts[name];
          return (
            <div key={name}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={name === "visit" ? "font-medium" : "text-muted-foreground"}>
                  {EVENT_LABELS[name]}
                </span>
                <span className="tabular-nums">
                  {value}
                  {name !== "visit" ? (
                    <span className="ml-2 text-muted-foreground">{percent(value, visits)}</span>
                  ) : null}
                </span>
              </div>
              {/* The bar is the share of visits, so the eye reads the drop-off
                  down the list rather than four numbers that need comparing. */}
              <Bar share={name === "visit" ? 100 : visits > 0 ? Math.min(100, (value / visits) * 100) : 0} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Split({
  title,
  rows,
  format,
}: {
  title: string;
  rows: Breakdown;
  format?: (label: string) => string;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="rounded-lg border border-border p-5">
      <p className="hairline mb-4">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.slice(0, 6).map((row) => (
            <div key={row.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-muted-foreground">
                  {format ? format(row.label) : row.label}
                </span>
                <span className="tabular-nums">
                  {row.value}
                  <span className="ml-2 text-muted-foreground">{percent(row.value, total)}</span>
                </span>
              </div>
              <Bar share={total > 0 ? (row.value / total) * 100 : 0} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Activity() {
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [days, setDays] = useState<7 | 30>(7);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await adminEventSummary());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t load activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const shown: EventWindow | null = summary ? (days === 7 ? summary.last7 : summary.last30) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="display text-2xl">What visitors did</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Counted on this site, stored in this database. No third party, nothing that identifies
            anyone, and your own visits are left out.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Seven days answers "is anything happening"; thirty answers "is it
              working". Both are one query — the switch is local. */}
          <div className="flex overflow-hidden rounded-md border border-border">
            {([7, 30] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  days === option
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option} days
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {summary && !summary.ready ? (
        <div className="rounded-lg border border-border p-5 text-sm">
          <p className="font-medium">Nothing is being counted yet.</p>
          <p className="mt-2 text-muted-foreground">
            The <code>site_events</code> table doesn’t exist. Open Cloud → SQL editor, paste
            <code className="mx-1">supabase/migrations/0008_site_events.sql</code>
            and run it — it costs no credits. The page is already sending; it just has nowhere to
            put anything.
          </p>
        </div>
      ) : null}

      {summary?.ready && !summary.hasContext ? (
        <div className="rounded-lg border border-border p-5 text-sm">
          <p className="font-medium">Where, how and from whom isn’t recorded yet.</p>
          <p className="mt-2 text-muted-foreground">
            The funnel below works. For the source, device and country breakdowns, run
            <code className="mx-1">supabase/migrations/0009_event_context.sql</code>
            in the SQL editor — visits from then on will carry them.
          </p>
        </div>
      ) : null}

      {shown ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Funnel counts={shown.counts} />
            <Split title="Where they came from" rows={shown.source} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Split title="Device" rows={shown.device} />
            <Split title="Country" rows={shown.country} format={countryLabel} />
          </div>
          <p className="text-xs text-muted-foreground">
            A visit is one tab session. Someone who comes back tomorrow counts twice; someone who
            presses the CV button twice counts once. Nothing older than 30 days is read here, and
            the three breakdowns only cover visits — the source is a hostname with no path, the
            device is one of three words, and the country is what the request already carried.
          </p>
        </>
      ) : null}

      {loading && !summary ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  );
}
