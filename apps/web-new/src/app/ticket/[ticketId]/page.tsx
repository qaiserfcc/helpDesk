"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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
  updateTicket,
  type UpdateTicketPayload,
  type IssueType,
  type TicketPriority,
} from "@/services/tickets";
import { suggestReply, fetchSuggestions } from "@/services/ai";
import { fetchUsers, type UserSummary } from "@/services/users";
import { workflowsService, type WorkflowProgress } from "@/services/workflows";
import { ticketCommentsService, type TicketComment } from "@/services/ticketComments";
import { env } from "@/config/env";
import {
  describeTicketActivity,
  formatTicketStatus,
} from "@/utils/ticketActivity";
import { Modal, ModalActions } from "@/components/Modal";
import { FormTextArea, FormField } from "@/components/FormField";
import { Button } from "@/components/Button";
import SLATimer from "@/components/SLATimer";

const formatStatus = formatTicketStatus;

const httpLikePattern = /^https?:\/\//i;

const buildAttachmentUrl = (path: string) => {
  if (httpLikePattern.test(path)) {
    return path;
  }
  const sanitized = path.replace(/^\/+/, "");
  return `${env.apiBaseUrl}/${sanitized}`;
};

const priorityOptions: TicketPriority[] = ["low", "medium", "high"];
const issueOptions: IssueType[] = [
  "hardware",
  "software",
  "network",
  "access",
  "other",
];

type EditTicketFormValues = {
  description: string;
  priority: TicketPriority;
  issueType: IssueType;
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
  const [isRequesting, setIsRequesting] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFormValues, setEditFormValues] = useState<EditTicketFormValues>({
    description: "",
    priority: "medium",
    issueType: "other",
  });
  const [editFormError, setEditFormError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Comment state
  const [commentText, setCommentText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState<string>("");
  
  // Workflow step completion state
  const [stepCompleteModalVisible, setStepCompleteModalVisible] = useState(false);
  const [stepCompleteComment, setStepCompleteComment] = useState("");
  const [completingStepId, setCompletingStepId] = useState<string | null>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => fetchTicket(ticketId),
  });

  const { data: activities = [], isLoading: activityLoading } = useQuery({
    queryKey: ["ticket-activity", ticketId],
    queryFn: () => fetchTicketActivity(ticketId, 100),
  });

  const { data: workflowProgress, isLoading: workflowLoading } = useQuery({
    queryKey: ["workflow-progress", ticketId],
    queryFn: () => workflowsService.getWorkflowProgress(ticketId),
    enabled: !!ticket,
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: () => ticketCommentsService.listComments(ticketId),
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
  const canDeclineRequest = Boolean(canAssign && pendingRequest);
  const canRequestAssignment = Boolean(
    isAgent &&
      !ticket?.assignee &&
      ticket?.status !== "resolved" &&
      !isAssignedAgent,
  );

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["users", "agents"],
    queryFn: () => fetchUsers({ role: "agent" }),
    enabled: canAssign,
    staleTime: 60_000,
  });

  const markTicketRead = useNotificationStore((state) => state.markTicketRead);
  const { data: aiSuggestions = [] } = useQuery({ queryKey: ["ai-suggestions", ticketId], queryFn: () => fetchSuggestions(ticketId), enabled: Boolean(ticket) });
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

  const handleEdit = () => {
    if (ticket) {
      setEditFormValues({
        description: ticket.description,
        priority: ticket.priority,
        issueType: ticket.issueType,
      });
      setEditFormError("");
      setEditModalVisible(true);
    }
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditFormError("");
  };

  const handleSubmitEditForm = async () => {
    if (!editFormValues.description.trim()) {
      setEditFormError("Description is required");
      return;
    }

    setIsUpdating(true);
    setEditFormError("");

    const payload: UpdateTicketPayload = {
      description: editFormValues.description.trim(),
      priority: editFormValues.priority,
      issueType: editFormValues.issueType,
    };

    try {
      await updateTicket(ticketId, payload);
      await invalidateTickets();
      closeEditModal();
      toastAdd({ 
        type: "success", 
        title: "Ticket updated", 
        message: "Your changes have been saved", 
        timestamp: new Date().toISOString() 
      });
    } catch (err) {
      console.error("Update ticket failed", err);
      setEditFormError("Failed to update ticket. Please try again.");
    } finally {
      setIsUpdating(false);
    }
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

  // Comment mutations
  const createCommentMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      ticketCommentsService.createComment(ticketId, content, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-activity", ticketId] });
      setCommentText("");
      setReplyToId(null);
      setReplyToName("");
      toastAdd({
        type: "success",
        title: "Comment added",
        message: "Your comment has been posted",
        timestamp: new Date().toISOString(),
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to post comment";
      toastAdd({
        type: "error",
        title: "Comment failed",
        message,
        timestamp: new Date().toISOString(),
      });
    },
  });

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    createCommentMutation.mutate({
      content: commentText.trim(),
      parentId: replyToId ?? undefined,
    });
  };

  const handleReply = (comment: TicketComment) => {
    setReplyToId(comment.id);
    setReplyToName(comment.author.name);
  };

  const cancelReply = () => {
    setReplyToId(null);
    setReplyToName("");
  };

  // Workflow step completion
  const completeStepMutation = useMutation({
    mutationFn: ({ stepId, comment }: { stepId: string; comment?: string }) =>
      workflowsService.completeStep(ticketId, stepId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-progress", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket-activity", ticketId] });
      setStepCompleteModalVisible(false);
      setStepCompleteComment("");
      setCompletingStepId(null);
      toastAdd({
        type: "success",
        title: "Step completed",
        message: "Workflow step has been marked as complete",
        timestamp: new Date().toISOString(),
      });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to complete step";
      toastAdd({
        type: "error",
        title: "Step completion failed",
        message,
        timestamp: new Date().toISOString(),
      });
    },
  });

  const openStepCompleteModal = (stepId: string) => {
    setCompletingStepId(stepId);
    setStepCompleteComment("");
    setStepCompleteModalVisible(true);
  };

  const closeStepCompleteModal = () => {
    setStepCompleteModalVisible(false);
    setStepCompleteComment("");
    setCompletingStepId(null);
  };

  const handleCompleteStep = () => {
    if (!completingStepId) return;
    completeStepMutation.mutate({
      stepId: completingStepId,
      comment: stepCompleteComment.trim() || undefined,
    });
  };

  // Get current step for assigned user
  const currentStep = workflowProgress?.progress.find((p) => !p.isCompleted);
  const isAssignedToMe = ticket?.assignee?.id === authUser?.id;
  const canCompleteStep = Boolean(currentStep && isAssignedToMe && !isTicketResolved);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4"
          >
            ← Back
          </Button>
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

                {ticket.category && (
                  <div>
                    <p className="text-sm text-white/80">Category</p>
                    <p className="text-lg text-white">{ticket.category.name}</p>
                  </div>
                )}

                {ticket.subcategory && (
                  <div>
                    <p className="text-sm text-white/80">Subcategory</p>
                    <p className="text-lg text-white">{ticket.subcategory.name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* SLA Information */}
            {ticket.sla && (
              <div className="card shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Service Level Agreement (SLA)</h2>
                <div className="mb-4">
                  <p className="text-lg font-medium text-white mb-1">{ticket.sla.name}</p>
                </div>
                <SLATimer
                  createdAt={ticket.createdAt}
                  responseTimeHours={ticket.sla.responseTimeHours}
                  resolutionTimeHours={ticket.sla.resolutionTimeHours}
                  resolvedAt={ticket.resolvedAt}
                  ticketStatus={ticket.status}
                />
              </div>
            )}

            {/* Workflow Progress */}
            {workflowProgress && (
              <div className="card shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-white">Workflow Progress</h2>
                  <span className="text-sm text-white/70">
                    {workflowProgress.completedSteps} / {workflowProgress.totalSteps} steps
                  </span>
                </div>
                <div className="space-y-3">
                  {workflowProgress.progress.map((item, idx) => (
                    <div
                      key={item.step.id}
                      className={`p-4 rounded-lg border ${
                        item.isCompleted
                          ? "bg-green-500/10 border-green-500/30"
                          : idx === workflowProgress.completedSteps
                          ? "bg-blue-500/10 border-blue-500/30"
                          : "bg-white/5 border-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-white/70 font-medium">Step {item.step.order + 1}</span>
                            {item.isCompleted && (
                              <span className="text-green-400 text-sm">✓ Completed</span>
                            )}
                            {!item.isCompleted && idx === workflowProgress.completedSteps && (
                              <span className="text-blue-400 text-sm">Current Step</span>
                            )}
                          </div>
                          <p className="font-medium text-white mt-1">{item.step.name}</p>
                          {item.step.description && (
                            <p className="text-sm text-white/70 mt-1">{item.step.description}</p>
                          )}
                          {item.step.requiredRole && (
                            <p className="text-xs text-white/60 mt-1">
                              Required role: {item.step.requiredRole}
                            </p>
                          )}
                          {item.completion && (
                            <p className="text-xs text-white/60 mt-2">
                              Completed by {item.completion.completedByUser?.name} on{" "}
                              {new Date(item.completion.completedAt).toLocaleString()}
                              {item.completion.comment && ` - ${item.completion.comment}`}
                            </p>
                          )}
                        </div>
                        {canCompleteStep && item.step.id === currentStep?.step.id && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openStepCompleteModal(item.step.id)}
                            isLoading={completeStepMutation.isPending}
                          >
                            Complete Step
                          </Button>
                        )}
                      </div>
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

            {/* Comments & Replies */}
            <div className="card shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Comments</h2>
              
              {/* Comment input */}
              <div className="mb-6">
                {replyToId && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3 flex justify-between items-center">
                    <span className="text-sm text-blue-400">
                      Replying to {replyToName}
                    </span>
                    <button
                      onClick={cancelReply}
                      className="text-white/70 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <FormTextArea
                  label=""
                  placeholder={replyToId ? "Write your reply..." : "Add a comment..."}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim()}
                    isLoading={createCommentMutation.isPending}
                  >
                    {replyToId ? "Post Reply" : "Post Comment"}
                  </Button>
                </div>
              </div>

              {/* Comments list */}
              {commentsLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              ) : comments.length === 0 ? (
                <p className="text-white/80">No comments yet. Be the first to comment!</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-white/5 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-white">{comment.author.name}</p>
                          <p className="text-xs text-white/60">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReply(comment)}
                        >
                          Reply
                        </Button>
                      </div>
                      <p className="text-white/90 whitespace-pre-wrap">{comment.content}</p>
                      
                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 ml-4 space-y-3 border-l-2 border-white/20 pl-4">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="bg-white/5 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-1">
                                <div>
                                  <p className="font-medium text-white text-sm">
                                    {reply.author.name}
                                  </p>
                                  <p className="text-xs text-white/60">
                                    {new Date(reply.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm text-white/90 whitespace-pre-wrap">
                                {reply.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
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
                    <Button
                      variant="primary"
                      onClick={handleAssign}
                      disabled={isAssigning || !selectedAssigneeId}
                      isLoading={isAssigning}
                      className="w-full"
                    >
                      Assign
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="card shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Actions</h2>
              <div className="space-y-3">
                {canEdit && (
                  <Button
                    variant="secondary"
                    onClick={handleEdit}
                    className="w-full"
                  >
                    Edit Ticket
                  </Button>
                )}

                {canRequestAssignment && (
                  <Button
                    variant="secondary"
                    onClick={handleRequestAssignment}
                    disabled={agentHasPendingRequest || otherAgentRequested}
                    isLoading={isRequesting}
                    className="w-full"
                  >
                    {agentHasPendingRequest
                      ? "Request Pending"
                      : otherAgentRequested
                        ? "Another Agent Requested"
                        : "Request Assignment"}
                  </Button>
                )}

                {canDeclineRequest && (
                  <Button
                    variant="danger"
                    onClick={handleDeclineRequest}
                    className="w-full"
                  >
                    Decline Request
                  </Button>
                )}
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="card shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">AI Suggestions</h2>
              {aiSuggestions.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-white/80">No AI suggestions yet.</p>
                  <Button 
                    variant="primary" 
                    onClick={handleGenerateSuggestion} 
                    className="w-full"
                  >
                    Generate suggestion
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {aiSuggestions.map((s) => (
                    <div key={s.id} className="bg-white/5 p-4 rounded-lg">
                      <p className="text-white/90 mb-2">{s.result?.text ?? JSON.stringify(s.result)}</p>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => { 
                            navigator.clipboard.writeText(s.result?.text ?? ""); 
                            toastAdd({ 
                              type: "success", 
                              title: "Copied suggestion", 
                              message: "Suggestion copied to clipboard", 
                              timestamp: new Date().toISOString() 
                            }); 
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="primary" 
                    onClick={handleGenerateSuggestion} 
                    className="w-full"
                  >
                    Regenerate
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Ticket Modal */}
      <Modal
        isOpen={editModalVisible}
        onClose={closeEditModal}
        title="Edit Ticket"
        size="md"
      >
        <p className="text-white/80 mb-6">
          Update your ticket details. Changes will be saved immediately.
        </p>

        <FormTextArea
          label="Description"
          placeholder="Describe the issue in detail..."
          value={editFormValues.description}
          onChange={(e) =>
            setEditFormValues((prev) => ({ ...prev, description: e.target.value }))
          }
          error={editFormError && !editFormValues.description.trim() ? "Description is required" : undefined}
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
              const selected = editFormValues.priority === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setEditFormValues((prev) => ({
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
              const selected = editFormValues.issueType === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() =>
                    setEditFormValues((prev) => ({
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

        {editFormError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-red-400 text-sm">{editFormError}</p>
          </div>
        )}

        <ModalActions>
          <Button variant="ghost" onClick={closeEditModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmitEditForm}
            isLoading={isUpdating}
          >
            Save Changes
          </Button>
        </ModalActions>
      </Modal>

      {/* Complete Step Modal */}
      <Modal
        isOpen={stepCompleteModalVisible}
        onClose={closeStepCompleteModal}
        title="Complete Workflow Step"
        size="md"
      >
        <p className="text-white/80 mb-6">
          Mark this workflow step as complete. Optionally add a comment about the work done.
        </p>

        <FormTextArea
          label="Comment (Optional)"
          placeholder="Describe the work completed for this step..."
          value={stepCompleteComment}
          onChange={(e) => setStepCompleteComment(e.target.value)}
          rows={4}
        />

        <ModalActions>
          <Button variant="ghost" onClick={closeStepCompleteModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCompleteStep}
            isLoading={completeStepMutation.isPending}
          >
            Complete Step
          </Button>
        </ModalActions>
      </Modal>
    </div>
  );
}