import { Mail, Phone } from "lucide-react";

// A recruiter reading this came from a link on a CV or a LinkedIn message, and
// mostly won't fill in a form: they copy an address into their own mail client
// or paste it into an applicant tracking system. Both lines disappear when the
// matching field is emptied in the back-office.
export function DirectContact({ content }: { content: Record<string, string> }) {
  const email = content["contact.email"];
  const phone = content["contact.phone"];
  if (!email && !phone) return null;

  return (
    <div className="mt-10 text-sm text-muted-foreground">
      {content["contact.note"] ? <p>{content["contact.note"]}</p> : null}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
        {email ? (
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Mail className="size-4 shrink-0" />
            {/* Long addresses have no space to break at, and this sits in a
                centred row that can't scroll sideways. */}
            <span className="break-all">{email}</span>
          </a>
        ) : null}
        {phone ? (
          // tel: wants digits, so the displayed spacing stays readable while
          // the link itself stays dialable.
          <a
            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Phone className="size-4 shrink-0" />
            <span>{phone}</span>
          </a>
        ) : null}
      </div>
    </div>
  );
}
