import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { HONEYPOT, submitLead } from "@/lib/submit-lead";

export function LeadDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openedAt = useRef(0);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);

    setSubmitting(true);
    setError(null);

    try {
      // Anything here can throw, not just reject — a network failure or a
      // server misconfiguration both land here. Catch it, or the button sits
      // on "Sending…" forever and the lead is lost with no way to retry.
      const result = await submitLead({
        data: {
          name: String(data.get("name") ?? "").trim(),
          email: String(data.get("email") ?? "").trim(),
          phone: String(data.get("phone") ?? "").trim(),
          message: String(data.get("message") ?? "").trim(),
          source: window.location.pathname,
          [HONEYPOT]: String(data.get(HONEYPOT) ?? ""),
          elapsedMs: Date.now() - openedAt.current,
        },
      });

      if (!result.ok) {
        setError("That was quick — take a moment and submit again.");
        return;
      }

      setSent(true);
    } catch (cause) {
      console.error("Lead submission failed", cause);
      // The form is left as-is so nothing typed is lost.
      setError("Couldn't send that — please try again, or email me directly.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          openedAt.current = Date.now();
        } else {
          setTimeout(() => {
            setSent(false);
            setError(null);
          }, 250);
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="display text-3xl">
            {sent ? "Message sent" : "Get in touch"}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-7" />
            </span>
            <p className="text-lg font-medium">Got it! thanks! I&rsquo;ll be in touch soon.</p>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="lead-name">Name / Company&rsquo;s name</Label>
              <Input id="lead-name" name="name" required placeholder="Your name or company" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lead-email">Email</Label>
                <Input id="lead-email" name="email" type="email" required placeholder="you@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-phone">Phone number</Label>
                <Input id="lead-phone" name="phone" type="tel" required placeholder="+66 ..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-message">How can I help?</Label>
              <Textarea id="lead-message" name="message" rows={4} placeholder="Tell me about your project" />
            </div>

            <div aria-hidden className="absolute left-[-9999px] top-0 size-0 overflow-hidden">
              <Input name={HONEYPOT} tabIndex={-1} autoComplete="off" />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" disabled={submitting} className="w-full font-semibold">
              {submitting ? "Sending…" : "Submit"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
