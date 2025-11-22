import { TicketStatus } from "@prisma/client";
import type { TicketWithRelations } from "../services/ticketService.js";
import { sendEmail } from "./emailProvider.js";

export type TicketEmailEvent = "tickets:created" | "tickets:updated";

const statusMap: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const priorityMap = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const issueMap = {
  hardware: "Hardware",
  software: "Software",
  network: "Network",
  access: "Access",
  other: "Other",
};

function formatStatus(status: TicketStatus) {
  return statusMap[status] ?? status;
}

function summarizeTicket(ticket: TicketWithRelations) {
  const assignee = ticket.assignee?.name ?? "Unassigned";
  const creator = ticket.creator?.name ?? "Unknown";
  const updatedAt = new Date(ticket.updatedAt).toLocaleString();
  return [
    `Status: ${formatStatus(ticket.status)}`,
    `Priority: ${priorityMap[ticket.priority] ?? ticket.priority}`,
    `Type: ${issueMap[ticket.issueType] ?? ticket.issueType}`,
    `Creator: ${creator}`,
    `Assignee: ${assignee}`,
    `Last updated: ${updatedAt}`,
  ].join("\n");
}

function buildSubject(ticket: TicketWithRelations, event: TicketEmailEvent) {
  const shortId = ticket.id.slice(0, 8);
  if (event === "tickets:created") {
    return `New ticket #${shortId} (${priorityMap[ticket.priority] ?? ticket.priority})`;
  }
  return `Ticket #${shortId} updated – ${formatStatus(ticket.status)}`;
}

function buildHtmlBody(ticket: TicketWithRelations, event: TicketEmailEvent) {
  const title = event === "tickets:created" ? "A new ticket was opened." : "A ticket you follow has changed.";
  return `<!doctype html>
<html>
  <body style="font-family: Arial, Helvetica, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 16px;">
    <h2 style="color: #38bdf8;">${title}</h2>
    <p style="margin-top: 0; white-space: pre-line;">${ticket.description}</p>
    <pre style="background:#020617; padding:12px; border-radius:8px; color:#cbd5f5;">${summarizeTicket(ticket)}</pre>
  </body>
</html>`;
}

export async function dispatchTicketEmail(
  ticket: TicketWithRelations,
  event: TicketEmailEvent,
) {
  const recipients = new Set<string>();
  if (ticket.creator?.email) {
    recipients.add(ticket.creator.email);
  }
  if (ticket.assignee?.email) {
    recipients.add(ticket.assignee.email);
  }

  if (!recipients.size) {
    return;
  }

  const subject = buildSubject(ticket, event);
  const text = `${event === "tickets:created" ? "New ticket" : "Ticket updated"}:
${ticket.description}

${summarizeTicket(ticket)}
`;

  await sendEmail({
    to: [...recipients],
    subject,
    text,
    html: buildHtmlBody(ticket, event),
  });
}
