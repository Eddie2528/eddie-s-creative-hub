import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Check, Paperclip, X } from "lucide-react";
import {
  ATTACHMENT_ACCEPT,
  HONEYPOT,
  MAX_ATTACHMENT_BYTES,
  submitLead,
} from "@/lib/submit-lead";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

export function LeadDialog({
  children,
  content = {},
}: {
  children: ReactNode;
  content?: Record<string, string>;
}) {
  const t = (key: string, fallback: string) => content[key] || fallback;
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const openedAt = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  function chooseFile(chosen: File | null) {
    setError(null);
    if (chosen && chosen.size > MAX_ATTACHMENT_BYTES) {
      // Rejected here rather than after a slow upload that was always going to
      // be refused — the server checks the same limit again regardless.
      setError(`That file is ${formatSize(chosen.size)}. The limit is 5 MB.`);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFile(chosen);
  }

  function clearFile() {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  }

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
          ...(file
            ? {
                attachment: {
                  name: file.name,
                  contentType: file.type || "application/octet-stream",
                  base64: await toBase64(file),
                },
              }
            : {}),
          [HONEYPOT]: String(data.get(HONEYPOT) ?? ""),
          elapsedMs: Date.now() - openedAt.current,
        },
      });

      if (!result.ok) {
        setError(
          result.reason === "file_too_large"
            ? "That file is over the 5 MB limit."
            : result.reason === "file_type"
              ? "That kind of file isn't accepted. Try a PDF, an image or a document."
              : "That was quick — take a moment and submit again.",
        );
        return;
      }

      // The enquiry is saved either way, so this is a note rather than a
      // failure — and it has to ride along with the success panel, which
      // replaces the form and any error shown in it.
      if (file && !result.attachmentStored) {
        setNotice("Your message is in, but the file didn\u2019t attach. Please email it over separately.");
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
            setNotice(null);
            clearFile();
          }, 250);
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="display text-3xl">
            {sent ? t("form.sent.title", "Message sent") : t("form.title", "Get in touch")}
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-7" />
            </span>
            <p className="text-lg font-medium">{t("form.sent.body", "Got it! thanks! I\u2019ll be in touch soon.")}</p>
            {notice ? (
              <p role="alert" className="text-sm text-destructive">
                {notice}
              </p>
            ) : null}
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("form.close", "Close")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="lead-name">{t("form.name.label", "Name / Company\u2019s name")}</Label>
              <Input id="lead-name" name="name" required placeholder={t("form.name.placeholder", "Your name or company")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lead-email">{t("form.email.label", "Email")}</Label>
                <Input id="lead-email" name="email" type="email" required placeholder={t("form.email.placeholder", "you@company.com")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lead-phone">{t("form.phone.label", "Phone number")}</Label>
                <Input id="lead-phone" name="phone" type="tel" required placeholder={t("form.phone.placeholder", "+66 ...")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-message">{t("form.message.label", "Leave your message")}</Label>
              <Textarea id="lead-message" name="message" rows={4} placeholder={t("form.message.placeholder", "Tell me about your project")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead-file">{t("form.file.label", "Attach a file")}</Label>
              {/* The real input stays hidden: browsers render it as an
                  unstyleable native control that looks nothing like the rest
                  of the form. The button and the chip below drive it. */}
              <input
                ref={fileInput}
                id="lead-file"
                type="file"
                className="sr-only"
                accept={ATTACHMENT_ACCEPT}
                onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <Paperclip className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="shrink-0 text-muted-foreground">{formatSize(file.size)}</span>
                  <button
                    type="button"
                    onClick={clearFile}
                    aria-label="Remove the attached file"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
                    <Paperclip className="size-4" />
                    {t("form.file.button", "Choose file")}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {t("form.file.hint", "PDF, image or document · up to 5 MB")}
                  </span>
                </div>
              )}
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
              {submitting ? "Sending…" : t("form.submit", "Submit")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
