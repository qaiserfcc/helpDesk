import type { TicketActivityEntry, TicketStatus } from "@/services/tickets";

export function formatTicketStatus(status: TicketStatus): string {
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

export function describeTicketActivity(activity: TicketActivityEntry): string {
  const actor = activity.actor.name;

  switch (activity.type) {
    case "status_change":
      if (activity.fromStatus && activity.toStatus) {
        return `${actor} changed status from ${formatTicketStatus(
          activity.fromStatus,
        )} to ${formatTicketStatus(activity.toStatus)}`;
      }
      return `${actor} changed status`;

    case "assignment_change":
      if (activity.toAssignee) {
        return `${actor} assigned to ${activity.toAssignee.name}`;
      }
      if (activity.fromAssignee) {
        return `${actor} unassigned from ${activity.fromAssignee.name}`;
      }
      return `${actor} changed assignment`;

    case "assignment_request":
      return `${actor} requested assignment`;

    case "ticket_update":
      return activity.comment?.trim()
        ? `${actor}: ${activity.comment.trim()}`
        : `${actor} updated the ticket`;

    case "comment":
      return activity.comment?.trim()
        ? `${actor} commented: ${activity.comment.trim()}`
        : `${actor} added a comment`;

    case "reply":
      return activity.comment?.trim()
        ? `${actor} replied: ${activity.comment.trim()}`
        : `${actor} replied`;

    case "step_completed":
      return activity.comment?.trim()
        ? `${actor}: ${activity.comment.trim()}`
        : `${actor} completed a workflow step`;

    default:
      return `${actor} performed an action`;
  }
}