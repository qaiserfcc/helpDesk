"use client";

import { useState } from "react";
import Link from "next/link";
import { TableRowMenu } from "@/components/TableRowMenu";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchTickets, type Ticket, type TicketStatus } from "@/services/tickets";
import { formatTicketStatus } from "@/utils/ticketActivity";
import { DataTable, Column } from "@/components/DataTable";
import { Button } from "@/components/Button";

const statusFilters: Array<{ label: string; value?: TicketStatus }> = [
  { label: "All" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

export default function TicketsPage() {
  const router = useRouter();
  const { session } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>();
  const [assignedOnly, setAssignedOnly] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", { statusFilter, assignedOnly }],
    queryFn: () =>
      fetchTickets({
        status: statusFilter,
        assignedToMe: assignedOnly || undefined,
      }),
  });

  if (!session) {
    return null;
  }

  const canCreate = session.user.role === "user" || session.user.role === "admin";

  const columns: Column<Ticket>[] = [
    {
      key: "id",
      label: "ID",
      render: (ticket) => (
        <span className="font-medium">#{ticket.id.slice(0, 8)}</span>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (ticket) => (
        <span className="max-w-xs truncate block">{ticket.description}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (ticket) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            ticket.status === "open"
              ? "bg-green-500/20 text-green-300 border border-green-500/30"
              : ticket.status === "in_progress"
              ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
              : "bg-primary-alpha-15 text-white border border-primary-alpha-20"
          }`}
        >
          {formatTicketStatus(ticket.status)}
        </span>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      render: (ticket) => <span className="capitalize">{ticket.priority}</span>,
    },
    {
      key: "issueType",
      label: "Type",
      render: (ticket) => <span className="capitalize">{ticket.issueType}</span>,
    },
    {
      key: "assignee",
      label: "Assignee",
      render: (ticket) => (
        <span className="text-white/90">
          {ticket.assignee ? ticket.assignee.name : "Unassigned"}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            ← Back
          </Button>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">Tickets</h1>
            {canCreate && (
              <Link href="/ticket/new">
                <Button variant="primary">Create Ticket</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="card shadow rounded-lg p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Status
              </label>
              <div className="flex space-x-2">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.label}
                    onClick={() => setStatusFilter(filter.value)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      statusFilter === filter.value
                        ? "bg-white/10 text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {session.user.role !== "user" && (
              <div className="flex items-center">
                <input
                  id="assignedOnly"
                  type="checkbox"
                  checked={assignedOnly}
                  onChange={(e) => setAssignedOnly(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="assignedOnly" className="text-sm text-white/80">
                  Assigned to me
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Tickets List */}
        <DataTable
          columns={columns}
          data={tickets}
          getRowKey={(ticket) => ticket.id}
          isLoading={isLoading}
          emptyMessage="No tickets found."
          emptyAction={
            canCreate ? (
              <Link href="/ticket/new">
                <Button variant="primary" className="mt-4">
                  Create your first ticket
                </Button>
              </Link>
            ) : undefined
          }
          actions={(ticket) => (
            <TableRowMenu
              ticketId={ticket.id}
              canEdit={
                session.user.id === ticket.creator?.id &&
                ticket.status !== "resolved"
              }
              canAssign={session.user.role === "admin"}
              canRequestAssignment={session.user.role === "agent"}
            />
          )}
        />
      </div>
    </div>
  );
}