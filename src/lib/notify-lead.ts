import { sendLovableEmail } from "@lovable.dev/email-js";

export type LeadNotification = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string | null;
  source: string | null;
};

const SITE = "https://eddie-nakharin.lovable.app";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function render(lead: LeadNotification) {
  const rows: Array<[string, string]> = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Message", lead.message || "—"],
    ["Page", lead.source || "—"],
  ];

  const text = [
    "New lead from your portfolio",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    SITE,
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:520px">
      <h2 style="margin:0 0 16px;font-size:18px">New lead from your portfolio</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding:8px 12px 8px 0;color:#666;vertical-align:top;white-space:nowrap">${label}</td>
            <td style="padding:8px 0;vertical-align:top">${escapeHtml(value).replace(/\n/g, "<br>")}</td>
          </tr>`,
          )
          .join("")}
      </table>
      <p style="margin:20px 0 0;font-size:13px;color:#666">
        Reply to this email to answer ${escapeHtml(lead.name)} directly.
      </p>
    </div>`;

  return { text, html };
}

// Tells Eddie a lead arrived. Never throws: the lead is already saved by the
// time this runs, and a mail outage must not turn a captured lead into a
// failed submission the visitor is asked to retry.
export async function notifyNewLead(lead: LeadNotification): Promise<void> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const to = process.env["LEAD_NOTIFY_TO"] ?? "eddd612@gmail.com";
  const senderDomain = process.env["LEAD_NOTIFY_DOMAIN"];

  if (!apiKey) {
    console.warn("[lead] LOVABLE_API_KEY missing; skipping notification email");
    return;
  }

  const { text, html } = render(lead);

  try {
    await sendLovableEmail(
      {
        to,
        from: { name: "Eddie's Creative Hub", address: `noreply@${senderDomain ?? "lovable.app"}` },
        ...(senderDomain ? { sender_domain: senderDomain } : {}),
        // So hitting reply in the mail client answers the lead, not the robot.
        reply_to: lead.email,
        subject: `New lead: ${lead.name}`,
        text,
        html,
        purpose: "transactional",
        // The lead's own id, so a retried send can't produce a second email.
        idempotency_key: `lead-${lead.id}`,
      },
      { apiKey },
    );
  } catch (cause) {
    console.error("[lead] Notification email failed; the lead itself was saved", cause);
  }
}
