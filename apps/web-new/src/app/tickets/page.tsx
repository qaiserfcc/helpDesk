"use client";

import { useState } from "react";
// row actions inlined to match user listing
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchTickets, deleteTicket, type Ticket, type TicketStatus } from "@/services/tickets";
import { formatTicketStatus } from "@/utils/ticketActivity";
import { DataList } from "@/components/DataTable";
import { Button } from "@/components/Button";
import { useNotificationStore } from "@/store/useNotificationStore";
import { useTicketModalStore } from "@/store/useTicketModalStore";

const statusFilters: Array<{ label: string; value?: TicketStatus }> = [
  { label: "All" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

// Ticket creation handled by global TicketFormModal via store

export default function TicketsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>();
  const [assignedOnly, setAssignedOnly] = useState(false);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const openCreate = useTicketModalStore((s) => s.openCreate);
  const openEdit = useTicketModalStore((s) => s.openEdit);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", { statusFilter, assignedOnly }],
    queryFn: () =>
      fetchTickets({
        status: statusFilter,
        assignedToMe: assignedOnly || undefined,
      }),
  });

  const openCreateModal = () => {
    openCreate(() => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    });
  };

  // Creation handled by global modal; no local mutation here

  const deleteTicketMutation = useMutation({
    mutationFn: (ticketId: string) => deleteTicket(ticketId),
    onSuccess: (removed) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      addNotification({
        id: removed.id,
        ticketId: removed.id,
        actor: session?.user?.name ?? "",
        summary: `Deleted ticket #${removed.id.slice(0,8)}`,
        createdAt: removed.updatedAt,
        type: "ticket",
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to delete ticket.";
      alert(`Delete failed: ${message}`);
    },
  });

  const confirmRemove = (entry: Ticket) => {
    if (confirm(`Delete ticket #${entry.id.slice(0,8)}? This cannot be undone.`)) {
      deleteTicketMutation.mutate(entry.id);
    }
  };

  // No inline form submit; TicketFormModal manages submit & errors

  if (!session) {
    return null;
  }

  const canCreate =
    session.user.role === "user" ||
    session.user.role === "admin" ||
    session.user.role === "agent";

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
              <Button variant="primary" onClick={openCreateModal}>
                Create Ticket
              </Button>
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

        {/* Tickets List - card-based, matching user listing */}
        <DataList
          data={tickets}
          getRowKey={(t) => t.id}
          isLoading={isLoading}
          emptyMessage="No tickets found."
          emptyAction={
            canCreate ? (
              <Button variant="primary" className="mt-4" onClick={openCreateModal}>
                Create your first ticket
              </Button>
            ) : undefined
          }
          renderItem={(ticket) => (
            <div className="card rounded-lg p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{ticket.description}</p>
                <p className="text-sm text-white/70 mt-1 truncate">
                  #{ticket.id.slice(0,8)} · <span className="capitalize">{ticket.issueType}</span> ·
                  <span className="capitalize"> {ticket.priority}</span> · Assignee: {ticket.assignee?.name ?? "Unassigned"}
                </p>
                {ticket.attributeValues?.length ? (
                  <p className="text-xs text-white/60 mt-1 truncate">
                    {ticket.attributeValues
                      .map((entry) => `${entry.attribute.label}: ${Array.isArray(entry.value) ? entry.value.join(", ") : String(entry.value ?? "")}`)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  ticket.status === "open"
                    ? "bg-green-500/20 text-green-300 border-green-500/30"
                    : ticket.status === "in_progress"
                    ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                    : "bg-sky-500/15 text-white border-sky-400/25"
                }`}>
                  {formatTicketStatus(ticket.status)}
                </span>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/ticket/${ticket.id}`)}>
                    View
                  </Button>
                  {(session.user.id === ticket.creator?.id && ticket.status !== "resolved") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(ticket)}
                    >
                      Edit
                    </Button>
                  )}
                  {session.user.role === "admin" && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => confirmRemove(ticket)}
                      isLoading={false}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        />
      </div>
      {/* Ticket creation handled by GlobalModals */}
    </div>
  );
}