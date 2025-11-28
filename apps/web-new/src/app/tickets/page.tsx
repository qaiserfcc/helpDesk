"use client";

import { useState } from "react";
import Link from "next/link";
import { TableRowMenu } from "@/components/TableRowMenu";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchTickets, type Ticket, type TicketStatus } from "@/services/tickets";
import { formatTicketStatus } from "@/utils/ticketActivity";

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

  return (
     <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-500 mb-4"
          >
            ← Back
          </button>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">Tickets</h1>
            {canCreate && (
              <Link href="/ticket/new" className="primary-btn px-4 py-2 rounded-lg">
                Create Ticket
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
        <div className="card shadow rounded-lg">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-white/80">Loading tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-white/80">No tickets found.</p>
              {canCreate && (
                <Link
                  href="/ticket/new"
                  className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Create your first ticket
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/6">
                <thead className="bg-white/5">
                  <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                      Description
                    </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                      Status
                    </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                      Priority
                    </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                      Type
                    </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                      Assignee
                    </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                    <tbody className="bg-transparent divide-y divide-white/6">
                  {tickets.map((ticket: Ticket) => (
                        <tr key={ticket.id} className="hover:bg-white/8">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                            #{ticket.id.slice(0, 8)}
                          </td>
                          <td className="px-6 py-4 text-sm text-white max-w-xs truncate">{ticket.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            ticket.status === "open"
                              ? "bg-green-100 text-green-800"
                              : ticket.status === "in_progress"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-white/6 text-white/80"
                          }`}
                        >
                          {formatTicketStatus(ticket.status)}
                        </span>
                      </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white capitalize">{ticket.priority}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white capitalize">{ticket.issueType}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{ticket.assignee ? ticket.assignee.name : "Unassigned"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <TableRowMenu
                          ticketId={ticket.id}
                          canEdit={session.user.id === ticket.creator?.id && ticket.status !== 'resolved'}
                          canAssign={session.user.role === 'admin'}
                          canRequestAssignment={session.user.role === 'agent'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}