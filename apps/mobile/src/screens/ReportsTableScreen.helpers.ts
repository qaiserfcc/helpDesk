import { ReportTicket, TicketStatus } from "@/services/tickets";

export type StatusFilter = "all" | TicketStatus;
export type UserRole = "admin" | "agent" | "user";
export type AdminAggregateRow = {
  id: string;
  label: string;
  total: number;
} & Record<TicketStatus, number>;

export type AdminAggregates = {
  user: AdminAggregateRow[];
  agent: AdminAggregateRow[];
};

const DEFAULT_STATUS_COUNTS: Record<TicketStatus, number> = {
  open: 0,
  in_progress: 0,
  resolved: 0,
};

export function countTicketStatuses(
  tickets: ReportTicket[],
): Record<TicketStatus, number> {
  return tickets.reduce<Record<TicketStatus, number>>(
    (acc, ticket) => {
      acc[ticket.status] += 1;
      return acc;
    },
    { ...DEFAULT_STATUS_COUNTS },
  );
}

export function filterTicketsByStatus(
  tickets: ReportTicket[],
  statusFilter: StatusFilter,
): ReportTicket[] {
  if (statusFilter === "all") {
    return tickets;
  }
  return tickets.filter((ticket) => ticket.status === statusFilter);
}

export function sliceTableRows(
  tickets: ReportTicket[],
  limit = 200,
): ReportTicket[] {
  return tickets.slice(0, limit);
}

export function buildAdminAggregates(tickets: ReportTicket[]): AdminAggregates {
  const build = (
    keyFn: (ticket: ReportTicket) => string,
    labelFn: (ticket: ReportTicket) => string,
  ) => {
    const map = new Map<string, AdminAggregateRow>();
    tickets.forEach((ticket) => {
      const key = keyFn(ticket);
      const label = labelFn(ticket);
      if (!key) {
        return;
      }
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          label,
          total: 0,
          open: 0,
          in_progress: 0,
          resolved: 0,
        });
      }
      const row = map.get(key)!;
      row[ticket.status] += 1;
      row.total += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  };

  return {
    user: build(
      (ticket) => ticket.creator.id,
      (ticket) =>
        ticket.creator.name ?? ticket.creator.email ?? ticket.creator.id,
    ),
    agent: build(
      (ticket) => ticket.assignee?.id ?? "unassigned",
      (ticket) => ticket.assignee?.name ?? "Unassigned",
    ),
  };
}

export function selectAdminAggregate(
  view: "user" | "agent",
  aggregates: AdminAggregates,
) {
  return view === "user" ? aggregates.user : aggregates.agent;
}

export function buildSectionSubtitle(params: {
  role: UserRole;
  statusFilter: StatusFilter;
  tableLength: number;
  filteredLength: number;
  aggregateLength: number;
  adminView: "user" | "agent";
}): string {
  const {
    role,
    statusFilter,
    tableLength,
    filteredLength,
    aggregateLength,
    adminView,
  } = params;
  if (role === "admin" && statusFilter === "all") {
    return `${aggregateLength} ${adminView === "user" ? "users" : "agents"} tracked`;
  }
  return `Showing ${tableLength} of ${filteredLength} ticket${filteredLength === 1 ? "" : "s"}`;
}

export function buildNoDataMessage(params: {
  role: UserRole;
  statusFilter: StatusFilter;
}): string {
  const { role, statusFilter } = params;
  if (role === "admin" && statusFilter === "all") {
    return "No ticket activity to summarize yet.";
  }
  return "No tickets available for this filter.";
}
