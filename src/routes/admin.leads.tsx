import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, LogOut, RefreshCw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  adminListLeads,
  adminSetLeadStatus,
  adminSignIn,
  adminSignOut,
  LEAD_STATUSES,
  type Lead,
  type LeadStatus,
} from "@/lib/admin-leads";

export const Route = createFileRoute("/admin/leads")({
  head: () => ({
    meta: [
      { title: "Leads" },
      // Keep the lead list out of search results even though it needs a password.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLeads,
});

const STATUS_STYLES: Record<string, string> = {
  new: "bg-primary text-primary-foreground",
  contacted: "bg-muted text-muted-foreground",
  archived: "bg-transparent text-muted-foreground border border-border",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toCsv(leads: Lead[]) {
  const cell = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`;
  return [
    "name,email,phone,message,source,status,created_at",
    ...leads.map((lead) =>
      [lead.name, lead.email, lead.phone, lead.message, lead.source, lead.status, lead.created_at]
        .map(cell)
        .join(","),
    ),
  ].join("\n");
}

function AdminLeads() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [open, setOpen] = useState<Lead | null>(null);

  async function load() {
    setLoading(true);
    try {
      setLeads(await adminListLeads());
      setAuthed(true);
    } catch {
      // The only way to know whether the cookie is still good is to ask.
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    setError(null);
    try {
      const { ok } = await adminSignIn({ data: { password } });
      if (!ok) {
        setError("Wrong password.");
        return;
      }
      setPassword("");
      await load();
    } catch (cause) {
      console.error("Sign-in failed", cause);
      setError("Couldn't sign in — try again.");
    } finally {
      setSigningIn(false);
    }
  }

  async function setStatus(lead: Lead, status: LeadStatus) {
    const previous = leads;
    // Update in place first: the round trip is slow enough to feel broken.
    setLeads((current) => current.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    setOpen((current) => (current && current.id === lead.id ? { ...current, status } : current));
    try {
      await adminSetLeadStatus({ data: { id: lead.id, status } });
    } catch (cause) {
      console.error("Status update failed", cause);
      setLeads(previous);
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (!needle) return true;
      return [lead.name, lead.email, lead.phone, lead.message ?? ""].some((field) =>
        field.toLowerCase().includes(needle),
      );
    });
  }, [leads, query, statusFilter]);

  function exportCsv() {
    const blob = new Blob([toCsv(visible)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <main className="grid min-h-dvh place-items-center text-muted-foreground">Loading…</main>;
  }

  if (!authed) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <form onSubmit={handleSignIn} className="w-full max-w-sm space-y-4">
          <div>
            <h1 className="display text-3xl">Leads</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter the admin password to continue.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={signingIn} className="w-full font-semibold">
            {signingIn ? "Checking…" : "Sign in"}
          </Button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl sm:text-4xl">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {leads.length} total · {leads.filter((l) => l.status === "new").length} new
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!visible.length}>
            <Download className="size-4" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await adminSignOut();
              setAuthed(false);
              setLeads([]);
            }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone, message"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["all", ...LEAD_STATUSES] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {leads.length ? "No leads match those filters." : "No leads yet."}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((lead) => (
                <TableRow key={lead.id} onClick={() => setOpen(lead)} className="cursor-pointer">
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell className="text-muted-foreground">{lead.email}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{lead.phone}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(lead.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_STYLES[lead.status] ?? ""}>{lead.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {open ? (
            <>
              <SheetHeader>
                <SheetTitle className="display text-2xl">{open.name}</SheetTitle>
              </SheetHeader>
              <dl className="space-y-4 px-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>
                    <a className="underline" href={`mailto:${open.email}`}>
                      {open.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd>
                    <a className="underline" href={`tel:${open.phone}`}>
                      {open.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Message</dt>
                  <dd className="whitespace-pre-wrap">{open.message || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Received</dt>
                  <dd>
                    {formatDate(open.created_at)} · from {open.source || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="mb-2 text-muted-foreground">Status</dt>
                  <dd className="flex gap-2">
                    {LEAD_STATUSES.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={open.status === status ? "default" : "outline"}
                        onClick={() => void setStatus(open, status)}
                        className="capitalize"
                      >
                        {status}
                      </Button>
                    ))}
                  </dd>
                </div>
              </dl>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}
