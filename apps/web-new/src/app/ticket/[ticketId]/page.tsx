"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import axios from "axios";
import { useToastStore } from "@/store/useToastStore";
import {
  assignTicket,
  declineAssignmentRequest,
  fetchTicket,
  fetchTicketActivity,
  requestAssignment,
  resolveTicket,
  updateTicket,
} from "@/services/tickets";
import { fetchUsers, type UserSummary } from "@/services/users";
import { env } from "@/config/env";
import {
  describeTicketActivity,
  formatTicketStatus,
} from "@/utils/ticketActivity";

const formatStatus = formatTicketStatus;

const httpLikePattern = /^https?:\/\//i;

const buildAttachmentUrl = (path: string) => {
  if (httpLikePattern.test(path)) {
    return path;
  }
  const sanitized = path.replace(/^\/+/, "");
  return `${env.apiBaseUrl}/${sanitized}`;
};

interface TicketDetailPageProps {
  params: {
    ticketId: string;
  };
}

export default function TicketDetailPage({ params }: TicketDetailPageProps) {
  const { ticketId } = React.use(params as unknown as Promise<TicketDetailPageProps["params"]>);
  const router = useRouter();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.session?.user);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  const { data: activities = [], isLoading: activityLoading } = useQuery({
    queryKey: ["ticket-activity", ticketId],
    queryFn: () => fetchTicketActivity(ticketId, 100),
  });

  const isAdmin = authUser?.role === "admin";
  const isAgent = authUser?.role === "agent";
  const isTicketResolved = ticket?.status === "resolved";
  const canAssign = Boolean(isAdmin && !isTicketResolved);
  const canEdit = Boolean(
    ticket && !isTicketResolved && authUser?.id === ticket.creator?.id,
  );
  const pendingRequest = ticket?.assignmentRequest;
  const agentHasPendingRequest = isAgent && pendingRequest?.id === authUser?.id;
  const otherAgentRequested =
    isAgent && !!pendingRequest && pendingRequest.id !== authUser?.id;
  const isAssignedAgent = isAgent && ticket?.assignee?.id === authUser?.id;
  const canResolve = Boolean(isAssignedAgent && ticket?.status !== "resolved");
  const canDeclineRequest = Boolean(canAssign && pendingRequest);
  const canRequestAssignment = Boolean(
    isAgent &&
      !ticket?.assignee &&
      ticket?.status !== "resolved" &&
      !isAssignedAgent,
  );
  const canReopen = Boolean(isAdmin && isTicketResolved);

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["users", "agents"],
    queryFn: () => fetchUsers({ role: "agent" }),
    enabled: canAssign,
    staleTime: 60_000,
  });

  const markTicketRead = useNotificationStore((state) => state.markTicketRead);
  const toastAdd = useToastStore((s) => s.addNotification);

  useEffect(() => {
    markTicketRead(ticketId);
  }, [ticketId, markTicketRead]);

  useEffect(() => {
    if (!ticket) {
      setSelectedAssigneeId(null);
      return;
    }
    if (ticket.assignee?.id) {
      setSelectedAssigneeId(ticket.assignee.id);
      return;
    }
    if (ticket.assignmentRequest?.id) {
      setSelectedAssigneeId(ticket.assignmentRequest.id);
      return;
    }
    setSelectedAssigneeId(null);
  }, [ticket]);

  const invalidateTickets = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["tickets"],
      exact: false,
    });
    await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
  };

  const handleAssign = async () => {
    if (!ticket) return;
    const fallbackRequest = ticket.assignmentRequest?.id;
    const targetAssignee = selectedAssigneeId ?? fallbackRequest;

    if (!targetAssignee) {
      alert("Select an agent");
      return;
    }

    setIsAssigning(true);
    try {
      await assignTicket(ticketId, targetAssignee);
      await invalidateTickets();
    } catch (error) {
      console.error("assign ticket failed", error);
      alert("Assignment failed");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeclineRequest = async () => {
    if (!pendingRequest) return;

    try {
      await declineAssignmentRequest(ticketId);
      await invalidateTickets();
    } catch (error) {
      console.error("decline request failed", error);
      alert("Decline failed");
    }
  };

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      await resolveTicket(ticketId);
      await invalidateTickets();
    } catch (error) {
      console.error("resolve ticket failed", error);
      alert("Resolve failed");
    } finally {
      setIsResolving(false);
    }
  };

  const handleReopen = async () => {
    try {
      await updateTicket(ticketId, { status: "open" });
      await invalidateTickets();
    } catch (error) {
      console.error("reopen ticket failed", error);
      alert("Reopen failed");
    }
  };

  const handleEdit = () => {
    router.push(`/ticket/${ticketId}/edit`);
  };

  const handleRequestAssignment = async () => {
    setIsRequesting(true);
    try {
      await requestAssignment(ticketId);
      await invalidateTickets();
      toastAdd({ type: "success", title: "Request sent", message: "Assignment request submitted to admins", timestamp: new Date().toISOString() });
    } catch (error: unknown) {
      console.error("request assignment failed", error);
      let message = String(error ?? "Unknown error");
      if (axios.isAxiosError(error)) {
        message = (error.response?.data?.message as string) ?? message;
      }
      toastAdd({ type: "error", title: "Request failed", message, timestamp: new Date().toISOString() });
    } finally {
      setIsRequesting(false);
    }
  };

  const handleOpenAttachment = (attachment: string) => {
    const url = buildAttachmentUrl(attachment);
    window.open(url, "_blank");
  };

  // selected agent derived from agents list if needed in UI (unused currently)

  if (isLoading || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white/80"></div>
      </div>
    );
  }

  const formatActivityTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-500 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-white">Ticket #{ticket.id.slice(0, 8)}</h1>
          <p className="text-lg text-white/90 mt-2">{ticket.description}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Status and Details */}
            <div className="card shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-sm text-white/80">Status</p>
                  <p className="text-lg font-medium text-white">{formatStatus(ticket.status)}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-sm text-white/80">Priority</p>
                  <p className="text-lg font-medium text-white capitalize">{ticket.priority}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-lg">
                  <p className="text-sm text-white/80">Type</p>
                  <p className="text-lg font-medium text-white capitalize">{ticket.issueType}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-white/80">Creator</p>
                  <p className="text-lg text-white">{ticket.creator.name}</p>
                </div>

                <div>
                  <p className="text-sm text-white/80">Assignee</p>
                  <p className="text-lg text-white">
                    {ticket.assignee ? ticket.assignee.name : "Unassigned"}
                  </p>
                  {ticket.assignmentRequest && !ticket.assignee && (
                    <p className="text-sm text-yellow-600 mt-1">
                      Requested by {ticket.assignmentRequest.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Attachments */}
            {ticket.attachments.length > 0 && (
              <div className="card shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Attachments</h2>
                <div className="space-y-2">
                  {ticket.attachments.map((attachment) => (
                    <button
                      key={attachment}
                      onClick={() => handleOpenAttachment(attachment)}
                      className="w-full text-left p-3 bg-white/5 rounded-lg hover:bg-white/8 transition-colors"
                    >
                      <p className="text-white/90 font-medium">
                        {attachment.split("/").pop() ?? attachment}
                      </p>
                      <p className="text-sm text-white/80">Click to open</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Activity */}
            <div className="card shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Activity</h2>
              {activityLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : activities.length === 0 ? (
                <p className="text-white/80">No recent changes yet.</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((entry) => (
                    <div key={entry.id} className="border-l-4 border-white/30 pl-4">
                      <p className="text-white">{describeTicketActivity(entry)}</p>
                      <p className="text-sm text-white/80 mt-1">
                        {formatActivityTime(entry.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Assignment Panel */}
            {canAssign && (
              <div className="card shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Assign Ticket</h2>
                {agentsLoading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                ) : agents.length === 0 ? (
                  <p className="text-white/80">No agents available</p>
                ) : (
                  <div className="space-y-4">
                    <select
                      title="Select an agent"
                      value={selectedAssigneeId || ""}
                      onChange={(e) => setSelectedAssigneeId(e.target.value || null)}
                      className="w-full p-3 border border-transparent rounded-lg focus:ring-2 focus:ring-white focus:border-white card text-white"
                    >
                      <option value="">Select an agent</option>
                      {agents.map((agent: UserSummary) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.email})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssign}
                      disabled={isAssigning || !selectedAssigneeId}
                      className="w-full primary-btn py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAssigning ? "Assigning..." : "Assign"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="card shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Actions</h2>
              <div className="space-y-3">
                {canEdit && (
                  <button
                    onClick={handleEdit}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
                  >
                    Edit Ticket
                  </button>
                )}

                {canRequestAssignment && (
                  <button
                    onClick={handleRequestAssignment}
                    disabled={isRequesting || agentHasPendingRequest || otherAgentRequested}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {agentHasPendingRequest
                      ? "Request Pending"
                      : otherAgentRequested
                        ? "Another Agent Requested"
                        : isRequesting
                          ? "Requesting..."
                          : "Request Assignment"}
                  </button>
                )}

                {canResolve && (
                  <button
                    onClick={handleResolve}
                    disabled={isResolving}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResolving ? "Resolving..." : "Resolve"}
                  </button>
                )}

                {canDeclineRequest && (
                  <button
                    onClick={handleDeclineRequest}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700"
                  >
                    Decline Request
                  </button>
                )}

                {canReopen && (
                  <button
                    onClick={handleReopen}
                    className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700"
                  >
                    Reopen Ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}