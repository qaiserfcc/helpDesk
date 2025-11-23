import type { TicketActivityEntry, TicketStatus } from "@/services/tickets";

export function formatTicketStatus(status: TicketStatus) {
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In Progress";
    case "resolved":
      return "Resolved";
    default:
      return status;
  }
}

export function describeTicketActivity(entry: TicketActivityEntry) {
  const ticketLabel = `#${entry.ticketId.slice(0, 6)}`;

  switch (entry.type) {
    case "assignment_request":
      return `${entry.actor.name} requested assignment on ${ticketLabel}`;
    case "ticket_update":
      return `${entry.actor.name} updated details on ${ticketLabel}`;
    case "assignment_change":
      if (entry.toAssignee) {
        return `${entry.actor.name} assigned ${ticketLabel} to ${entry.toAssignee.name}`;
      }
      if (entry.fromAssignee) {
        return `${entry.actor.name} cleared ${entry.fromAssignee.name}'s assignment on ${ticketLabel}`;
      }
      return `${entry.actor.name} updated assignments for ${ticketLabel}`;
    case "status_change":
      if (entry.fromStatus && entry.toStatus) {
        return `${entry.actor.name} moved ${ticketLabel} from ${formatTicketStatus(entry.fromStatus)} to ${formatTicketStatus(entry.toStatus)}`;
      }
      if (entry.toStatus) {
        return `${entry.actor.name} moved ${ticketLabel} to ${formatTicketStatus(entry.toStatus)}`;
      }
      if (entry.fromStatus) {
        return `${entry.actor.name} updated ${ticketLabel} from ${formatTicketStatus(entry.fromStatus)}`;
      }
      return `${entry.actor.name} updated ${ticketLabel}`;
    default:
      return `${entry.actor.name} updated ${ticketLabel}`;
  }
}
