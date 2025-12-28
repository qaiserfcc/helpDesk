"use client";

import { useState } from "react";
import Link from "next/link";
import { TableRowMenu } from "@/components/TableRowMenu";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchTickets, createTicket, type Ticket, type TicketStatus, type CreateTicketPayload, type IssueType, type TicketPriority } from "@/services/tickets";
import { formatTicketStatus } from "@/utils/ticketActivity";
import { DataTable, Column } from "@/components/DataTable";
import { Button } from "@/components/Button";
import { Modal, ModalActions } from "@/components/Modal";
import { FormField, FormTextArea } from "@/components/FormField";
import { useNotificationStore } from "@/store/useNotificationStore";

const statusFilters: Array<{ label: string; value?: TicketStatus }> = [
  { label: "All" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Resolved", value: "resolved" },
];

const priorityOptions: TicketPriority[] = ["low", "medium", "high"];
const issueOptions: IssueType[] = [
  "hardware",
  "software",
  "network",
  "access",
  "other",
];

type TicketFormValues = {
  description: string;
  priority: TicketPriority;
  issueType: IssueType;
};

const makeEmptyTicketForm = (): TicketFormValues => ({
  description: "",
  priority: "medium",
  issueType: "other",
});

export default function TicketsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | undefined>();
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [formValues, setFormValues] = useState<TicketFormValues>(makeEmptyTicketForm());
  const [formError, setFormError] = useState("");
  const addNotification = useNotificationStore((s) => s.addNotification);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", { statusFilter, assignedOnly }],
    queryFn: () =>
      fetchTickets({
        status: statusFilter,
        assignedToMe: assignedOnly || undefined,
      }),
  });

  const resetFormState = () => {
    setFormValues(makeEmptyTicketForm());
    setFormError("");
  };

  const closeCreateModal = () => {
    resetFormState();
    setCreateModalVisible(false);
  };

  const openCreateModal = () => {
    resetFormState();
    setCreateModalVisible(true);
  };

  const createTicketMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      closeCreateModal();
      if (created?.id) {
        addNotification({
          id: created.id,
          ticketId: created.id,
          actor: session?.user?.name ?? "",
          summary: `Created ticket: ${created.description?.slice(0, 50)}`,
          createdAt: created.createdAt,
          type: "ticket",
        });
        router.push(`/ticket/${created.id}`);
      }
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to create ticket.";
      setFormError(message);
    },
  });

  const handleSubmitCreateForm = () => {
    if (!formValues.description.trim()) {
      setFormError("Description is required");
      return;
    }

    setFormError("");

    const payload: CreateTicketPayload = {
      description: formValues.description.trim(),
      priority: formValues.priority,
      issueType: formValues.issueType,
    };

    createTicketMutation.mutate(payload);
  };

  const saving = createTicketMutation.isPending;

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

        {/* Tickets List */}
        <DataTable
          columns={columns}
          data={tickets}
          getRowKey={(ticket) => ticket.id}
          isLoading={isLoading}
          emptyMessage="No tickets found."
          emptyAction={
            canCreate ? (
              <Button variant="primary" className="mt-4" onClick={openCreateModal}>
                Create your first ticket
              </Button>
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

      {/* Create Ticket Modal */}
      <Modal
        isOpen={createModalVisible}
        onClose={closeCreateModal}
        title="Create New Ticket"
        size="md"
      >
        <p className="text-white/80 mb-6">
          Describe your issue in detail. An agent will be assigned to help resolve it.
        </p>

        <FormTextArea
          label="Description"
          placeholder="Describe the issue in detail..."
          value={formValues.description}
          onChange={(e) =>
            setFormValues((prev) => ({ ...prev, description: e.target.value }))
          }
          error={formError && !formValues.description.trim() ? "Description is required" : undefined}
          required
          rows={6}
        />

        {/* Priority Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-3">
            Priority <span className="text-red-400 ml-1">*</span>
          </label>
          <div className="flex space-x-3">
            {priorityOptions.map((option) => {
              const selected = formValues.priority === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setFormValues((prev) => ({
                      ...prev,
                      priority: option,
                    }))
                  }
                  className={`px-4 py-2 rounded-lg capitalize cursor-pointer transition-colors ${
                    selected
                      ? "bg-primary-blue text-white"
                      : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {/* Issue Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/90 mb-3">
            Issue Type <span className="text-red-400 ml-1">*</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {issueOptions.map((option) => {
              const selected = formValues.issueType === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setFormValues((prev) => ({
                      ...prev,
                      issueType: option,
                    }))
                  }
                  className={`px-4 py-2 rounded-lg capitalize cursor-pointer transition-colors ${
                    selected
                      ? "bg-primary-blue text-white"
                      : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {formError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-red-400 text-sm">{formError}</p>
          </div>
        )}

        <ModalActions>
          <Button variant="ghost" onClick={closeCreateModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitCreateForm}
            isLoading={saving}
          >
            Create Ticket
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}