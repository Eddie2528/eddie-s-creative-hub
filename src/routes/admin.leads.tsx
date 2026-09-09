import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDownUp, Download, LogOut, Paperclip, RefreshCw, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentEditor } from "@/components/admin/ContentEditor";
import { AssetManager } from "@/components/admin/AssetManager";
import { WorksEditor } from "@/components/admin/WorksEditor";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  adminDeleteLeads,
  adminLeadAttachmentUrl,
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
      { title: "Back-office" },
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

const SORTS = {
  newest: "Newest first",
  oldest: "Oldest first",
  status: "Status — new first",
  name: "Name A–Z",
} as const;
type Sort = keyof typeof SORTS;

// LEAD_STATUSES is already in the order a lead moves through, so its index is
// the sort key. Anything unrecognised sorts last rather than jumping the queue.
function statusRank(status: string) {
  const index = LEAD_STATUSES.indexOf(status as LeadStatus);
  return index === -1 ? LEAD_STATUSES.length : index;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

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

// Matched against a failed save so an expired session shows the sign-in form
// rather than a message the reader can do nothing with.
export const SESSION_EXPIRED = "Your session has expired";

function AdminLeads() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Lead | null>(null);
  const [fetchingFile, setFetchingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);

  function handleExpired() {
    setExpired(true);
    setAuthed(false);
  }

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
      const { result } = await adminSignIn({ data: { password } });
      if (result === "not_configured") {
        setError("No admin password is set on the server. Add ADMIN_PASSWORD as a Cloud secret, then publish.");
        return;
      }
      if (result === "wrong") {
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

  async function applyStatus(ids: string[], status: LeadStatus) {
    if (ids.length === 0) return;
    const chosen = new Set(ids);
    const previous = leads;
    // Update in place first: the round trip is slow enough to feel broken.
    setLeads((current) => current.map((l) => (chosen.has(l.id) ? { ...l, status } : l)));
    setOpen((current) => (current && chosen.has(current.id) ? { ...current, status } : current));
    try {
      await adminSetLeadStatus({ data: { ids, status } });
    } catch (cause) {
      console.error("Status update failed", cause);
      setLeads(previous);
      const message = cause instanceof Error ? cause.message : "";
      if (message.startsWith(SESSION_EXPIRED)) handleExpired();
    }
  }

  async function removeLeads(ids: string[]) {
    if (ids.length === 0) return;
    const chosen = new Set(ids);
    const going = leads.filter((l) => chosen.has(l.id));
    const first = going[0];
    // One lead is named, several are counted — "Delete 6 enquiries" says more
    // than six names would.
    const what =
      going.length === 1 && first
        ? `the enquiry from ${first.name} (${first.email})`
        : `${going.length} enquiries`;
    if (!confirm(`Delete ${what}? This can't be undone.`)) return;

    const previous = leads;
    setLeads((current) => current.filter((l) => !chosen.has(l.id)));
    setSelectedIds(new Set());
    setOpen(null);
    try {
      await adminDeleteLeads({ data: { ids } });
    } catch (cause) {
      console.error("Deleting leads failed", cause);
      setLeads(previous);
      const message = cause instanceof Error ? cause.message : "Couldn't delete.";
      if (message.startsWith(SESSION_EXPIRED)) handleExpired();
    }
  }

  async function openAttachment(lead: Lead) {
    setFetchingFile(true);
    setFileError(null);
    try {
      const { url } = await adminLeadAttachmentUrl({ data: { id: lead.id } });
      // The bucket is private and the link expires within the hour, so it is
      // used the moment it arrives rather than stored anywhere.
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (cause) {
      console.error("Opening the attachment failed", cause);
      const message = cause instanceof Error ? cause.message : "Couldn\u2019t open the file.";
      if (message.startsWith(SESSION_EXPIRED)) handleExpired();
      setFileError(message);
    } finally {
      setFetchingFile(false);
    }
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = leads.filter((lead) => {
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      if (!needle) return true;
      return [lead.name, lead.email, lead.phone, lead.message ?? ""].some((field) =>
        field.toLowerCase().includes(needle),
      );
    });

    // Sorting a copy: `leads` is what the optimistic updates roll back to.
    return [...matched].sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        case "name":
          return a.name.localeCompare(b.name);
        case "status":
          // Newest first inside each status, so the freshest unanswered
          // enquiry is the first row on the page.
          return (
            statusRank(a.status) - statusRank(b.status) ||
            b.created_at.localeCompare(a.created_at)
          );
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
  }, [leads, query, statusFilter, sort]);

  // A tick you can't see is one you can't reason about: filtering, searching or
  // acting on a row drops anything no longer on screen, so the count in the bar
  // always matches the ticked rows.
  useEffect(() => {
    setSelectedIds((current) => {
      if (current.size === 0) return current;
      const onScreen = new Set(visible.map((lead) => lead.id));
      const next = new Set([...current].filter((id) => onScreen.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visible]);

  const allSelected = visible.length > 0 && visible.every((lead) => selectedIds.has(lead.id));

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(visible.map((lead) => lead.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

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
            <h1 className="display text-3xl">Back-office</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {expired
                ? "Your session expired. Sign in again — anything you were editing in another tab is still there, and saving will work once you're back in."
                : "Enter the admin password to continue."}
            </p>
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
          <h1 className="display text-3xl sm:text-4xl">Back-office</h1>
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

      <Tabs defaultValue="leads" className="mt-8">
        <TabsList>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="works">Works</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        <TabsContent value="works" className="mt-6">
          <WorksEditor onSessionExpired={handleExpired} />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <AssetManager />
        </TabsContent>

        <TabsContent value="content" className="mt-6">
          <ContentEditor onSessionExpired={handleExpired} />
        </TabsContent>

        <TabsContent value="leads">
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
        {/* The buttons above narrow the list down to one status; this orders
            whatever is left. Sorting by status is the one that answers "what
            still needs a reply" without hiding the rest. */}
        <Select value={sort} onValueChange={(next) => setSort(next as Sort)}>
          <SelectTrigger className="w-52" aria-label="Sort leads">
            <ArrowDownUp className="size-4 shrink-0 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORTS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedIds.size > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-3">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <span className="text-sm text-muted-foreground">— set status to</span>
          <div className="flex flex-wrap gap-1">
            {LEAD_STATUSES.map((status) => (
              <Button
                key={status}
                size="sm"
                variant="outline"
                className="capitalize"
                onClick={() => void applyStatus([...selectedIds], status)}
              >
                {status}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="outline" onClick={() => void removeLeads([...selectedIds])}>
              <Trash2 className="size-4" /> Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  disabled={visible.length === 0}
                  onCheckedChange={toggleAll}
                  aria-label={allSelected ? "Clear selection" : "Select every row shown"}
                />
              </TableHead>
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
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {leads.length ? "No leads match those filters." : "No leads yet."}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((lead) => (
                <TableRow
                  key={lead.id}
                  onClick={() => setOpen(lead)}
                  className={`cursor-pointer ${selectedIds.has(lead.id) ? "bg-secondary/50" : ""}`}
                >
                  {/* The row opens the lead; the tick box must not, or picking
                      rows to delete would open six panels on the way. */}
                  <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(lead.id)}
                      onCheckedChange={() => toggleOne(lead.id)}
                      aria-label={`Select ${lead.name}`}
                    />
                  </TableCell>
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

        </TabsContent>
      </Tabs>

      <Sheet
        open={open !== null}
        onOpenChange={(next) => {
          if (!next) setOpen(null);
          setFileError(null);
        }}
      >
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
                {open.attachment_name ? (
                  <div>
                    <dt className="mb-2 text-muted-foreground">Attachment</dt>
                    <dd>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={fetchingFile}
                        onClick={() => void openAttachment(open)}
                        className="max-w-full"
                      >
                        <Paperclip className="size-4 shrink-0" />
                        <span className="min-w-0 truncate">{open.attachment_name}</span>
                        {open.attachment_size ? (
                          // Dimmed by opacity rather than a fixed grey: the
                          // button turns amber on hover, and a muted colour
                          // that ignores the state disappears into it.
                          <span className="shrink-0 opacity-70">
                            {formatSize(open.attachment_size)}
                          </span>
                        ) : null}
                      </Button>
                      {fileError ? (
                        <p role="alert" className="mt-2 text-sm text-destructive">
                          {fileError}
                        </p>
                      ) : null}
                    </dd>
                  </div>
                ) : null}
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
                        onClick={() => void applyStatus([open.id], status)}
                        className="capitalize"
                      >
                        {status}
                      </Button>
                    ))}
                  </dd>
                </div>
              </dl>
              <div className="mt-8 border-t border-border px-4 pt-4">
                <Button variant="outline" size="sm" onClick={() => void removeLeads([open.id])}>
                  <Trash2 className="size-4" /> Delete this lead
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </main>
  );
}
