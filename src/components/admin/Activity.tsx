import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  adminEventSummary,
  EVENT_LABELS,
  EVENT_NAMES,
  type EventCounts,
  type EventSummary,
} from "@/lib/site-events";

// Every number here is visits, not clicks: one visit can only write one row
// per thing, so "9 downloaded the CV" is nine people, not one person pressing
// it nine times.
function percent(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

function Funnel({ counts, title }: { counts: EventCounts; title: string }) {
  const visits = counts.visit;

  return (
    <div className="rounded-lg border border-border p-5">
      <p className="hairline mb-4">{title}</p>
      <div className="space-y-3">
        {EVENT_NAMES.map((name) => {
          const value = counts[name];
          const share = visits > 0 ? Math.min(100, (value / visits) * 100) : 0;
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
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${name === "visit" ? 100 : share}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Activity() {
  const [summary, setSummary] = useState<EventSummary | null>(null);
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
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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

      {summary?.ready ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Funnel counts={summary.last7} title="Last 7 days" />
            <Funnel counts={summary.last30} title="Last 30 days" />
          </div>
          <p className="text-xs text-muted-foreground">
            A visit is one tab session. Someone who comes back tomorrow counts twice; someone who
            presses the CV button twice counts once. Nothing older than 30 days is read here.
          </p>
        </>
      ) : null}

      {loading && !summary ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
    </div>
  );
}
