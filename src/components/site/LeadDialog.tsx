import { useState, type FormEvent, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function LeadDialog({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTimeout(() => setSent(false), 250);
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
            <Button type="submit" size="lg" className="w-full font-semibold">
              Submit
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
