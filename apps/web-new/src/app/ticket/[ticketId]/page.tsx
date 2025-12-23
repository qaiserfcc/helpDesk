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
import { suggestReply, fetchSuggestions } from "@/services/ai";
import { fetchUsers, type UserSummary } from "@/services/users";
import { fetchWorkflow } from "@/services/workflows";
import { fetchTicketAttributeValues } from "@/services/attributes";
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
  const { data: aiSuggestions = [] } = useQuery({ queryKey: ["ai-suggestions", ticketId], queryFn: () => fetchSuggestions(ticketId), enabled: Boolean(ticket) });
  const toastAdd = useToastStore((s) => s.addNotification);

  // Fetch workflow if ticket has a workflow assigned
  const { data: workflow } = useQuery({
    queryKey: ["workflow", ticket?.workflowId],
    queryFn: () => fetchWorkflow(ticket!.workflowId!),
    enabled: !!ticket?.workflowId,
  });

  // Fetch custom attribute values for this ticket
  const { data: attributeValues = [] } = useQuery({
    queryKey: ["ticket-attributes", ticketId],
    queryFn: () => fetchTicketAttributeValues(ticketId),
    enabled: !!ticket,
  });

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

  const handleGenerateSuggestion = async () => {
    try {
      const s = await suggestReply(ticketId);
      await queryClient.invalidateQueries({ queryKey: ["ai-suggestions", ticketId] });
      toastAdd({ type: "success", title: "AI suggestion generated", message: "AI suggestion is available", timestamp: new Date().toISOString() });
    } catch (err) {
      console.error("ai suggestion failed", err);
      toastAdd({ type: "error", title: "AI suggestion failed", message: "Try again", timestamp: new Date().toISOString() });
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

            {/* Workflow Progress */}
            {workflow && workflow.steps && workflow.steps.length > 0 && (
              <div className="card shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  Workflow Progress: {workflow.name}
                </h2>
                <div className="relative">
                  {/* Steps container */}
                  <div className="flex items-start justify-between">
                    {workflow.steps
                      .sort((a, b) => a.order - b.order)
                      .map((step, index) => {
                        const isCurrentStep = ticket.currentStepId === step.id;
                        const isCompleted = false; // TODO: track completed steps
                        const isLast = index === (workflow.steps?.length ?? 0) - 1;

                        return (
                          <div key={step.id} className="flex-1 flex flex-col items-center">
                            {/* Step circle */}
                            <div className="relative z-10 flex flex-col items-center">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                                  isCurrentStep
                                    ? "bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/50"
                                    : isCompleted
                                    ? "bg-green-500 border-green-400"
                                    : "bg-white/10 border-white/30"
                                }`}
                              >
                                {isCompleted ? (
                                  <svg
                                    className="w-6 h-6 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                ) : (
                                  <span className="text-white font-semibold">{index + 1}</span>
                                )}
                              </div>

                              {/* Step name */}
                              <div className="mt-3 text-center max-w-[120px]">
                                <p
                                  className={`text-sm font-medium ${
                                    isCurrentStep ? "text-blue-300" : "text-white/80"
                                  }`}
                                >
                                  {step.name}
                                </p>
                                {step.description && (
                                  <p className="text-xs text-white/60 mt-1">
                                    {step.description}
                                  </p>
                                )}
                                {isCurrentStep && (
                                  <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-300 rounded-full">
                                    Current
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Connector line */}
                            {!isLast && (
                              <div className="absolute top-6 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-0.5 bg-white/20">
                                <div
                                  className={`h-full transition-all ${
                                    isCompleted ? "bg-green-400" : "bg-transparent"
                                  }`}
                                  style={{ width: isCompleted ? "100%" : "0%" }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Additional workflow info */}
                  {workflow.description && (
                    <div className="mt-6 p-4 bg-white/5 rounded-lg">
                      <p className="text-sm text-white/70">{workflow.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Custom Attributes */}
            {attributeValues && attributeValues.length > 0 && (
              <div className="card shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Additional Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {attributeValues.map((attrValue) => (
                    <div key={attrValue.id} className="bg-white/5 p-4 rounded-lg">
                      <p className="text-sm text-white/80">{attrValue.attribute?.label || "Unknown"}</p>
                      <p className="text-lg text-white mt-1">
                        {attrValue.value || "N/A"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

            {/* AI Suggestions */}
            <div className="card shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">AI Suggestions</h2>
              {aiSuggestions.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-white/80">No AI suggestions yet.</p>
                  <button onClick={handleGenerateSuggestion} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">Generate suggestion</button>
                </div>
              ) : (
                <div className="space-y-3">
                  {aiSuggestions.map((s) => (
                    <div key={s.id} className="bg-white/5 p-4 rounded-lg">
                      <p className="text-white/90 mb-2">{s.result?.text ?? JSON.stringify(s.result)}</p>
                      <div className="flex gap-2">
                        <button onClick={() => { navigator.clipboard.writeText(s.result?.text ?? ""); toastAdd({ type: "success", title: "Copied suggestion", message: "Suggestion copied to clipboard", timestamp: new Date().toISOString() }); }} className="bg-white/5 text-white px-3 py-1 rounded">Copy</button>
                      </div>
                    </div>
                  ))}
                  <button onClick={handleGenerateSuggestion} className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">Regenerate</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}