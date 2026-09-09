import { sendLovableEmail } from "@lovable.dev/email-js";

import { SITE_URL } from "./site-url";

export type LeadNotification = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string | null;
  attachmentName: string | null;
  attachmentStored: boolean;
};

// Named so it reads the same in an email table, a Telegram line and a log: a
// file that didn't survive the upload has to be visible, or Eddie replies to a
// brief he never received.
function attachmentLine(lead: LeadNotification): string | null {
  if (!lead.attachmentName) return null;
  return lead.attachmentStored
    ? lead.attachmentName
    : `${lead.attachmentName} — upload failed, ask them to resend it`;
}

// Lovable's send API needs a registered sender domain: without one it answers
// 400 missing_parameter, and with an unregistered one 403 no_matching_sender.
// Registering a domain lives behind Cloud → Emails, which is a paid feature, so
// on the current plan there is nothing valid to send. Set LEAD_NOTIFY_DOMAIN to
// a verified domain and notifications start going out with no code change.
const SENDER_DOMAIN = process.env["LEAD_NOTIFY_DOMAIN"];

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
  ];

  const file = attachmentLine(lead);
  if (file) rows.push(["Attachment", file]);

  const text = [
    "New lead from your portfolio",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    SITE_URL,
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

// Telegram needs no domain and no paid plan: a bot token from @BotFather and
// the chat id of the conversation to post into. That makes it the one channel
// that can actually reach Eddie on the current plan, so a lead stops depending
// on him remembering to open the back-office.
async function notifyByTelegram(lead: LeadNotification): Promise<void> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];
  if (!token || !chatId) {
    console.info("[lead] Telegram not configured; lead saved, no message sent");
    return;
  }

  // Telegram's HTML mode only needs &, < and > escaped, which escapeHtml covers.
  const text = [
    "<b>New lead from your portfolio</b>",
    "",
    `<b>Name</b>  ${escapeHtml(lead.name)}`,
    `<b>Email</b>  ${escapeHtml(lead.email)}`,
    `<b>Phone</b>  ${escapeHtml(lead.phone)}`,
    ...(attachmentLine(lead) ? [`<b>Attachment</b>  ${escapeHtml(attachmentLine(lead) as string)}`] : []),
    "",
    escapeHtml(lead.message || "(no message)"),
    "",
    `<a href="${SITE_URL}/admin/leads">Open the back-office</a>`,
  ].join("\n");

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        // The preview would be a thumbnail of the sign-in page, every time.
        disable_web_page_preview: true,
      }),
    });
    if (!response.ok) {
      // Telegram answers 200 with ok:false for most mistakes and a 4xx for a
      // bad token, so the body is where the useful part is either way.
      console.error(`[lead] Telegram refused the message (${response.status}): ${await response.text()}`);
    }
  } catch (cause) {
    console.error("[lead] Telegram notification failed; the lead itself was saved", cause);
  }
}

function recipient() {
  return process.env["LEAD_NOTIFY_TO"] ?? "eddd612@gmail.com";
}

function subject(lead: LeadNotification) {
  return `New lead: ${lead.name}`;
}

// Resend sends without a domain of its own: its shared `onboarding@resend.dev`
// sender is free, and only delivers to the address that owns the Resend
// account — which is exactly this case, one recipient who is the account
// holder. Set RESEND_FROM once a real domain is verified there.
async function sendViaResend(lead: LeadNotification, apiKey: string): Promise<void> {
  const { text, html } = render(lead);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        // The lead's own id, so a retried send can't produce a second email.
        "idempotency-key": `lead-${lead.id}`,
      },
      body: JSON.stringify({
        from: process.env["RESEND_FROM"] ?? "Eddie's Creative Hub <onboarding@resend.dev>",
        to: [recipient()],
        subject: subject(lead),
        // So hitting reply in the mail client answers the lead, not the robot.
        reply_to: lead.email,
        text,
        html,
      }),
    });
    if (!response.ok) {
      // Resend explains refusals in the body — an unverified sender and a
      // recipient who isn't the account holder read very differently.
      console.error(`[lead] Resend refused the email (${response.status}): ${await response.text()}`);
    }
  } catch (cause) {
    console.error("[lead] Resend notification failed; the lead itself was saved", cause);
  }
}

async function sendViaLovable(lead: LeadNotification, apiKey: string, domain: string): Promise<void> {
  const { text, html } = render(lead);

  try {
    await sendLovableEmail(
      {
        to: recipient(),
        from: { name: "Eddie's Creative Hub", address: `noreply@${domain}` },
        sender_domain: domain,
        reply_to: lead.email,
        subject: subject(lead),
        text,
        html,
        purpose: "transactional",
        idempotency_key: `lead-${lead.id}`,
      },
      { apiKey },
    );
  } catch (cause) {
    console.error("[lead] Notification email failed; the lead itself was saved", cause);
  }
}

// One email per lead, whichever provider is configured — never both, or every
// enquiry would arrive twice. Resend wins because it works on the free plan;
// Lovable's own sender takes over the moment a domain is registered there.
async function notifyByEmail(lead: LeadNotification): Promise<void> {
  const resendKey = process.env["RESEND_API_KEY"];
  if (resendKey) return sendViaResend(lead, resendKey);

  const lovableKey = process.env["LOVABLE_API_KEY"];
  // Skip rather than attempt a send that can only fail — one guaranteed error
  // per lead would bury the logs that matter.
  if (!SENDER_DOMAIN) {
    console.info("[lead] No email provider configured; lead saved, no email sent");
    return;
  }
  if (!lovableKey) {
    console.warn("[lead] LOVABLE_API_KEY missing; lead saved, no email sent");
    return;
  }
  return sendViaLovable(lead, lovableKey, SENDER_DOMAIN);
}

// Tells Eddie a lead arrived. Never throws: the lead is already saved by the
// time this runs, and an outage on either channel must not turn a captured
// lead into a failed submission the visitor is asked to retry. The two are
// independent — one being unconfigured says nothing about the other — so they
// go together rather than in sequence.
export async function notifyNewLead(lead: LeadNotification): Promise<void> {
  await Promise.all([notifyByTelegram(lead), notifyByEmail(lead)]);
}
