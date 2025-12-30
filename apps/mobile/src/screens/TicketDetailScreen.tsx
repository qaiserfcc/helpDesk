import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RootStackParamList } from "@/navigation/AppNavigator";
import { useAuthStore } from "@/store/useAuthStore";
import {
  assignTicket,
  declineAssignmentRequest,
  fetchTicket,
  fetchTicketActivity,
  requestAssignment,
  resolveTicket,
  updateTicket,
} from "@/services/tickets";
import { workflowsService, type WorkflowProgress } from "@/services/workflows";
import {
  ticketCommentsService,
  type TicketComment,
} from "@/services/ticketComments";
import { suggestReply, fetchSuggestions } from "@/services/ai";
import { fetchUsers, UserSummary } from "@/services/users";
import { env } from "@/config/env";
import {
  describeTicketActivity,
  formatTicketStatus,
} from "@/utils/ticketActivity";
import { useNotificationStore } from "@/store/useNotificationStore";
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";

const formatStatus = formatTicketStatus;

type Props = NativeStackScreenProps<RootStackParamList, "TicketDetail">;

const httpLikePattern = /^https?:\/\//i;

const buildAttachmentUrl = (path: string) => {
  if (httpLikePattern.test(path)) {
    return path;
  }
  const sanitized = path.replace(/^\/+/, "");
  return `${env.apiBaseUrl}/${sanitized}`;
};

export function TicketDetailScreen({ route, navigation }: Props) {
  const { ticketId } = route.params;
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.session?.user);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(
    null,
  );
  const [stepComment, setStepComment] = useState("");
  const [moreInfoQuestion, setMoreInfoQuestion] = useState("");
  const [moreInfoResponse, setMoreInfoResponse] = useState("");
  const [newComment, setNewComment] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
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
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: () => ticketCommentsService.listComments(ticketId),
  });

  const isAdmin = authUser?.role === "admin";
  const isAgent = authUser?.role === "agent";
  const isTicketResolved = ticket?.status === "resolved";
  const isTicketOwner = Boolean(ticket && ticket.creator.id === authUser?.id);
  const canAssign = Boolean(isAdmin && !isTicketResolved);
  const canEdit = Boolean(
    ticket &&
      !isTicketResolved &&
      ((isAdmin && authUser?.id) ||
        (authUser?.role === "user" && isTicketOwner)),
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
  const { data: aiSuggestions = [], refetch: refetchAISuggestions } = useQuery({
    queryKey: ["ai-suggestions", ticketId],
    queryFn: () => fetchSuggestions(ticketId),
    enabled: Boolean(ticket),
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

  const invalidateTicketDetail = async () => {
    await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
    await queryClient.invalidateQueries({
      queryKey: ["ticket-activity", ticketId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["workflow-progress", ticketId],
    });
    await queryClient.invalidateQueries({
      queryKey: ["ticket-comments", ticketId],
    });
  };

  const handleCompleteCurrentStep = async (progress: WorkflowProgress) => {
    if (!progress.currentStepId) {
      return;
    }
    try {
      await workflowsService.completeStep(
        ticketId,
        progress.currentStepId,
        stepComment.trim() ? stepComment.trim() : undefined,
      );
      setStepComment("");
      await invalidateTicketDetail();
    } catch (error) {
      console.error("complete step failed", error);
      Alert.alert("Unable to complete step", "Please try again in a moment.");
    }
  };

  const handleMoveBack = async () => {
    try {
      await workflowsService.moveCurrentStep(ticketId, "prev");
      await invalidateTicketDetail();
    } catch (error) {
      console.error("move step failed", error);
      Alert.alert("Unable to move step", "Please try again in a moment.");
    }
  };

  const handleRequestMoreInfo = async () => {
    const question = moreInfoQuestion.trim();
    if (!question) {
      Alert.alert("Add a question", "Enter what you need from the requester.");
      return;
    }
    try {
      await workflowsService.requestMoreInfo(ticketId, question);
      setMoreInfoQuestion("");
      await invalidateTicketDetail();
    } catch (error) {
      console.error("request more-info failed", error);
      Alert.alert("Request failed", "Please try again in a moment.");
    }
  };

  const handleRespondMoreInfo = async () => {
    const response = moreInfoResponse.trim();
    if (!response) {
      Alert.alert("Add a response", "Enter your response to continue.");
      return;
    }
    try {
      await workflowsService.respondMoreInfo(ticketId, response);
      setMoreInfoResponse("");
      await invalidateTicketDetail();
    } catch (error) {
      console.error("respond more-info failed", error);
      Alert.alert("Response failed", "Please try again in a moment.");
    }
  };

  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!content) {
      return;
    }
    try {
      await ticketCommentsService.createComment(ticketId, content);
      setNewComment("");
      await invalidateTicketDetail();
    } catch (error) {
      console.error("create comment failed", error);
      Alert.alert("Comment failed", "Please try again in a moment.");
    }
  };

  const handleAddReply = async (parentId: string) => {
    const content = replyText.trim();
    if (!content) {
      return;
    }
    try {
      await ticketCommentsService.createComment(ticketId, content, parentId);
      setReplyText("");
      setReplyingToId(null);
      await invalidateTicketDetail();
    } catch (error) {
      console.error("create reply failed", error);
      Alert.alert("Reply failed", "Please try again in a moment.");
    }
  };

  const handleAssign = async () => {
    if (!ticket) return;
    const fallbackRequest = ticket.assignmentRequest?.id;
    const targetAssignee = selectedAssigneeId ?? fallbackRequest;

    if (!targetAssignee) {
      Alert.alert(
        "Select an agent",
        "Choose an agent from the list or wait for a request.",
      );
      return;
    }

    const snapshot = selectedAgent
      ? {
          id: selectedAgent.id,
          name: selectedAgent.name,
          email: selectedAgent.email,
        }
      : fallbackRequest && ticket.assignmentRequest
        ? {
            id: ticket.assignmentRequest.id,
            name: ticket.assignmentRequest.name,
            email: ticket.assignmentRequest.email,
          }
        : null;
    try {
      await assignTicket(ticketId, targetAssignee, { assignee: snapshot });
      await invalidateTickets();
    } catch (error) {
      console.error("assign ticket failed", error);
      Alert.alert("Assignment failed", "Please try again in a moment.");
    }
  };

  const handleDeclineRequest = async () => {
    if (!pendingRequest) {
      return;
    }
    try {
      await declineAssignmentRequest(ticketId);
      await invalidateTickets();
    } catch (error) {
      console.error("decline request failed", error);
      Alert.alert("Decline failed", "Please try again in a moment.");
    }
  };

  const handleResolve = async () => {
    try {
      await resolveTicket(ticketId);
      await invalidateTickets();
    } catch (error) {
      console.error("resolve ticket failed", error);
      Alert.alert("Resolve failed", "Please try again in a moment.");
    }
  };

  const handleReopen = async () => {
    try {
      await updateTicket(ticketId, { status: "open" });
      await invalidateTickets();
    } catch (error) {
      console.error("reopen ticket failed", error);
      Alert.alert("Reopen failed", "Please try again in a moment.");
    }
  };

  const handleEdit = () => {
    navigation.navigate("TicketForm", { ticketId });
  };

  const handleRequestAssignment = async () => {
    try {
      await requestAssignment(ticketId);
      await invalidateTickets();
    } catch (error) {
      console.error("request assignment failed", error);
      Alert.alert("Request failed", "Unable to request this ticket right now.");
    }
  };

  const handleGenerateSuggestion = async () => {
    try {
      await suggestReply(ticketId);
      await refetchAISuggestions();
    } catch (error) {
      console.error("generate suggestion failed", error);
    }
  };

  const handleOpenAttachment = async (attachment: string) => {
    const url = buildAttachmentUrl(attachment);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Cannot open attachment", "Unsupported file link.");
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error("open attachment failed", error);
      Alert.alert("Unable to open attachment", "Please try again later.");
    }
  };

  const selectedAgent = useMemo(() => {
    return agents.find((agent) => agent.id === selectedAssigneeId) ?? null;
  }, [agents, selectedAssigneeId]);

  if (isLoading || !ticket) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.accentMuted} />
      </View>
    );
  }

  const formatActivityTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatAttributeValue = (value: unknown, type?: string) => {
    if (value === null || value === undefined) {
      return "—";
    }
    if (type === "multiselect") {
      if (Array.isArray(value)) {
        return value.filter(Boolean).join(", ");
      }
      return String(value);
    }
    if (type === "date") {
      if (typeof value === "string") {
        try {
          return new Date(value).toLocaleDateString();
        } catch {
          return value;
        }
      }
      return String(value);
    }
    if (type === "file") {
      if (typeof value === "string") {
        return value.split("/").pop() ?? value;
      }
      if (typeof value === "object") {
        const maybePath = (value as { path?: unknown }).path;
        if (typeof maybePath === "string") {
          return maybePath.split("/").pop() ?? maybePath;
        }
      }
      return "File";
    }
    return typeof value === "string" ? value : JSON.stringify(value);
  };

  const renderCommentThread = (comment: TicketComment, depth: number) => {
    const isReplying = replyingToId === comment.id;
    return (
      <View
        key={comment.id}
        style={{ marginTop: 10, marginLeft: depth ? depth * 12 : 0 }}
      >
        <View style={styles.activityItem}>
          <Text style={styles.commentAuthor}>
            {comment.author?.name ?? "Unknown"}
          </Text>
          <Text style={styles.activityMeta}>
            {formatActivityTime(comment.createdAt)}
          </Text>
          <Text style={styles.commentBody}>{comment.content}</Text>
          <Pressable
            style={[styles.secondaryBtn, { marginTop: 10 }]}
            onPress={() => {
              if (isReplying) {
                setReplyingToId(null);
                setReplyText("");
                return;
              }
              setReplyingToId(comment.id);
              setReplyText("");
            }}
          >
            <Text style={styles.secondaryText}>
              {isReplying ? "Cancel reply" : "Reply"}
            </Text>
          </Pressable>
          {isReplying && (
            <View style={{ marginTop: 10 }}>
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Write a reply…"
                placeholderTextColor={colors.textMuted}
                style={[styles.textInput, styles.textInputMultiline]}
                multiline
              />
              <Pressable
                style={[styles.primaryBtn, { marginTop: 10 }]}
                onPress={() => handleAddReply(comment.id)}
              >
                <Text style={styles.primaryText}>Send reply</Text>
              </Pressable>
            </View>
          )}
        </View>
        {comment.replies?.map((reply) => renderCommentThread(reply, depth + 1))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.ticketId}>Ticket #{ticket.id.slice(0, 8)}</Text>
      <Text style={styles.title}>{ticket.description}</Text>

      <View style={styles.badgesRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Status</Text>
          <Text style={styles.badgeValue}>{formatStatus(ticket.status)}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Priority</Text>
          <Text style={styles.badgeValue}>{ticket.priority}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>Type</Text>
          <Text style={styles.badgeValue}>{ticket.issueType}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Creator</Text>
        <Text style={styles.sectionValue}>{ticket.creator.name}</Text>
      </View>

      {ticket.pendingSync && (
        <View style={styles.pendingSyncBanner}>
          <Text style={styles.pendingSyncTitle}>Pending sync</Text>
          <Text style={styles.pendingSyncText}>
            This change will be sent automatically once you are back online.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Assignee</Text>
        <Text style={styles.sectionValue}>
          {ticket.assignee ? ticket.assignee.name : "Unassigned"}
        </Text>
        {ticket.assignmentRequest && !ticket.assignee && (
          <Text style={styles.assignmentNote}>
            Requested by {ticket.assignmentRequest.name}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Category</Text>
        <Text style={styles.sectionValue}>{ticket.category?.name ?? "—"}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Subcategory</Text>
        <Text style={styles.sectionValue}>
          {ticket.subcategory?.name ?? "—"}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SLA</Text>
        <Text style={styles.sectionValue}>{ticket.sla?.name ?? "—"}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Workflow</Text>
        {workflowLoading ? (
          <ActivityIndicator color={colors.accentMuted} />
        ) : !workflowProgress ? (
          <Text style={styles.sectionHint}>No workflow is assigned.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={styles.sectionValue}>
              {workflowProgress.workflow.name} (
              {workflowProgress.completedSteps}/{workflowProgress.totalSteps}{" "}
              completed)
            </Text>
            <View style={styles.activityList}>
              {workflowProgress.progress.map((p) => (
                <Text key={p.step.id} style={styles.sectionValue}>
                  {p.isCompleted ? "✓" : p.isCurrent ? "→" : "•"} {p.step.name}
                </Text>
              ))}
            </View>

            {(() => {
              const moreInfoActive = Boolean(
                workflowProgress.moreInfo?.requestedAt &&
                  !workflowProgress.moreInfo?.resolvedAt,
              );
              const canManageWorkflow =
                (isAdmin || isAgent) && !isTicketResolved;
              const canRespondMoreInfo =
                authUser?.role === "user" && isTicketOwner && !isTicketResolved;

              return (
                <View style={{ gap: 12 }}>
                  {moreInfoActive && (
                    <View style={styles.activityItem}>
                      <Text style={styles.sectionLabel}>
                        More info requested
                      </Text>
                      <Text style={styles.commentBody}>
                        {workflowProgress.moreInfo.question ?? "—"}
                      </Text>
                      {canRespondMoreInfo ? (
                        <View style={{ marginTop: 10 }}>
                          <TextInput
                            value={moreInfoResponse}
                            onChangeText={setMoreInfoResponse}
                            placeholder="Write your response…"
                            placeholderTextColor={colors.textMuted}
                            style={[
                              styles.textInput,
                              styles.textInputMultiline,
                            ]}
                            multiline
                          />
                          <Pressable
                            style={[styles.primaryBtn, { marginTop: 10 }]}
                            onPress={handleRespondMoreInfo}
                          >
                            <Text style={styles.primaryText}>
                              Send response
                            </Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Text style={styles.sectionHint}>
                          Step movement is blocked until the requester responds.
                        </Text>
                      )}
                    </View>
                  )}

                  {canManageWorkflow && !moreInfoActive && (
                    <View style={{ gap: 10 }}>
                      <TextInput
                        value={stepComment}
                        onChangeText={setStepComment}
                        placeholder="Optional step completion note…"
                        placeholderTextColor={colors.textMuted}
                        style={[styles.textInput, styles.textInputMultiline]}
                        multiline
                      />
                      <Pressable
                        style={[
                          styles.primaryBtn,
                          !workflowProgress.currentStepId
                            ? styles.disabledBtn
                            : null,
                        ]}
                        onPress={() =>
                          handleCompleteCurrentStep(workflowProgress)
                        }
                        disabled={!workflowProgress.currentStepId}
                      >
                        <Text style={styles.primaryText}>
                          Complete current step
                        </Text>
                      </Pressable>
                      <Pressable
                        style={styles.secondaryBtn}
                        onPress={handleMoveBack}
                      >
                        <Text style={styles.secondaryText}>Move back</Text>
                      </Pressable>
                    </View>
                  )}

                  {(isAdmin || isAgent) &&
                    !isTicketResolved &&
                    !moreInfoActive && (
                      <View style={styles.activityItem}>
                        <Text style={styles.sectionLabel}>Need more info?</Text>
                        <TextInput
                          value={moreInfoQuestion}
                          onChangeText={setMoreInfoQuestion}
                          placeholder="Ask the requester a question…"
                          placeholderTextColor={colors.textMuted}
                          style={[styles.textInput, styles.textInputMultiline]}
                          multiline
                        />
                        <Pressable
                          style={[styles.secondaryBtn, { marginTop: 10 }]}
                          onPress={handleRequestMoreInfo}
                        >
                          <Text style={styles.secondaryText}>
                            Request more info
                          </Text>
                        </Pressable>
                      </View>
                    )}
                </View>
              );
            })()}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Custom fields</Text>
        {ticket.attributeValues?.length ? (
          <View style={{ gap: 10 }}>
            {ticket.attributeValues.map((av) => {
              const type = av.attribute?.type;
              const formatted = formatAttributeValue(av.value, type);

              if (type === "file") {
                const filePath =
                  typeof av.value === "string"
                    ? av.value
                    : typeof av.value === "object" && av.value
                      ? (av.value as { path?: unknown }).path
                      : null;

                return (
                  <Pressable
                    key={av.attributeId}
                    style={styles.activityItem}
                    onPress={() => {
                      if (typeof filePath === "string") {
                        void handleOpenAttachment(filePath);
                      }
                    }}
                    disabled={typeof filePath !== "string"}
                  >
                    <Text style={styles.sectionLabel}>
                      {av.attribute.label}
                    </Text>
                    <Text style={styles.sectionValue}>{formatted}</Text>
                    {typeof filePath === "string" && (
                      <Text style={styles.sectionHint}>Tap to open</Text>
                    )}
                  </Pressable>
                );
              }

              return (
                <View key={av.attributeId} style={styles.activityItem}>
                  <Text style={styles.sectionLabel}>{av.attribute.label}</Text>
                  <Text style={styles.sectionValue}>{formatted}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.sectionHint}>
            No custom fields on this ticket.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Comments</Text>
        <TextInput
          value={newComment}
          onChangeText={setNewComment}
          placeholder="Write a comment…"
          placeholderTextColor={colors.textMuted}
          style={[styles.textInput, styles.textInputMultiline]}
          multiline
        />
        <Pressable
          style={[styles.primaryBtn, { marginTop: 10 }]}
          onPress={handleAddComment}
        >
          <Text style={styles.primaryText}>Send comment</Text>
        </Pressable>

        {commentsLoading ? (
          <ActivityIndicator color={colors.accentMuted} />
        ) : comments.length === 0 ? (
          <Text style={styles.sectionHint}>No comments yet.</Text>
        ) : (
          <View style={{ marginTop: 10 }}>
            {comments.map((comment) => renderCommentThread(comment, 0))}
          </View>
        )}
      </View>

      {canAssign && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Assign ticket</Text>
          {agentsLoading ? (
            <ActivityIndicator color={colors.accentMuted} />
          ) : agents.length === 0 ? (
            <Text style={styles.sectionHint}>
              Invite agents from the admin portal to assign tickets.
            </Text>
          ) : (
            <View style={styles.agentGrid}>
              {agents.map((agent: UserSummary) => {
                const isSelected = selectedAssigneeId === agent.id;
                return (
                  <Pressable
                    key={agent.id}
                    style={[
                      styles.agentChip,
                      isSelected && styles.agentChipActive,
                    ]}
                    onPress={() => setSelectedAssigneeId(agent.id)}
                  >
                    <Text
                      style={[
                        styles.agentChipText,
                        isSelected && styles.agentChipTextActive,
                      ]}
                    >
                      {agent.name}
                    </Text>
                    <Text style={styles.agentChipSub}>{agent.email}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Text style={styles.sectionHint}>
            Select an agent and tap Assign to re-route immediately.
          </Text>
        </View>
      )}

      {ticket.attachments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Attachments</Text>
          {ticket.attachments.map((attachment) => (
            <Pressable
              key={attachment}
              style={styles.attachmentButton}
              onPress={() => handleOpenAttachment(attachment)}
            >
              <Text style={styles.attachmentLabel}>
                {attachment.split("/").pop() ?? attachment}
              </Text>
              <Text style={styles.attachmentHint}>Tap to open</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Activity</Text>
        {activityLoading ? (
          <ActivityIndicator color={colors.accentMuted} />
        ) : activities.length === 0 ? (
          <Text style={styles.sectionHint}>No recent changes yet.</Text>
        ) : (
          <View style={styles.activityList}>
            {activities.map((entry) => (
              <View key={entry.id} style={styles.activityItem}>
                <Text style={styles.activityDescription}>
                  {describeTicketActivity(entry)}
                </Text>
                <Text style={styles.activityMeta}>
                  {formatActivityTime(entry.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* AI Suggestions */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>AI Suggestions</Text>
        {aiSuggestions.length === 0 ? (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionHint}>
              No suggestions are available for this ticket yet.
            </Text>
            <Pressable
              style={[styles.primaryBtn, { marginTop: 12 }]}
              onPress={handleGenerateSuggestion}
            >
              <Text style={styles.primaryText}>Generate suggestion</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginTop: 8 }}>
            {aiSuggestions.map((s) => (
              <View
                key={s.id}
                style={[styles.activityItem, { marginBottom: 10 }]}
              >
                <Text style={styles.activityDescription}>
                  {s.result?.text ?? JSON.stringify(s.result)}
                </Text>
                <Pressable
                  style={[styles.secondaryBtn, { marginTop: 8 }]}
                  onPress={() => {
                    Alert.alert(
                      "AI Suggestion",
                      s.result?.text ?? "(no content)",
                    );
                  }}
                >
                  <Text style={styles.secondaryText}>Copy</Text>
                </Pressable>
              </View>
            ))}
            <Pressable
              style={[styles.primaryBtn, { marginTop: 4 }]}
              onPress={handleGenerateSuggestion}
            >
              <Text style={styles.primaryText}>Regenerate</Text>
            </Pressable>
          </View>
        )}
      </View>

      {isTicketResolved && !isAdmin && (
        <View style={styles.section}>
          <Text style={styles.resolvedNotice}>
            This ticket is resolved. Contact support if you need further
            changes.
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {canEdit && (
          <Pressable style={styles.secondaryBtn} onPress={handleEdit}>
            <Text style={styles.secondaryText}>Edit ticket</Text>
          </Pressable>
        )}
        {canAssign && (
          <Pressable
            style={[
              styles.primaryBtn,
              !selectedAgent && !pendingRequest ? styles.disabledBtn : null,
            ]}
            onPress={handleAssign}
            disabled={!selectedAgent && !pendingRequest}
          >
            <Text style={styles.primaryText}>
              {selectedAgent
                ? `Assign to ${selectedAgent.name}`
                : pendingRequest
                  ? `Assign to ${pendingRequest.name}`
                  : "Select an agent"}
            </Text>
          </Pressable>
        )}
        {canDeclineRequest && (
          <Pressable
            style={[styles.secondaryBtn, styles.dangerBtn]}
            onPress={handleDeclineRequest}
          >
            <Text style={styles.dangerText}>Decline request</Text>
          </Pressable>
        )}
        {canRequestAssignment && (
          <Pressable
            style={[
              styles.secondaryBtn,
              (agentHasPendingRequest || otherAgentRequested) &&
                styles.disabledBtn,
            ]}
            onPress={handleRequestAssignment}
            disabled={agentHasPendingRequest || otherAgentRequested}
          >
            <Text style={styles.secondaryText}>
              {agentHasPendingRequest
                ? "Request pending approval"
                : otherAgentRequested
                  ? "Another agent requested"
                  : "Request assignment"}
            </Text>
          </Pressable>
        )}
        {canResolve && (
          <Pressable
            style={[styles.primaryBtn, styles.resolveBtn]}
            onPress={handleResolve}
          >
            <Text style={styles.primaryText}>Resolve</Text>
          </Pressable>
        )}
        {canReopen && (
          <Pressable
            style={[styles.secondaryBtn, styles.reopenBtn]}
            onPress={handleReopen}
          >
            <Text style={styles.reopenText}>Reopen ticket</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.container,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  loader: {
    alignItems: "center",
    justifyContent: "center",
    ...commonStyles.container,
  },
  ticketId: {
    color: colors.textMuted,
    fontSize: 14,
  },
  title: {
    marginTop: 8,
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  badge: {
    ...commonStyles.card,
    flex: 1,
    borderRadius: 14,
    padding: 12,
  },
  badgeLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  badgeValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  sectionValue: {
    color: colors.text,
    fontSize: 16,
  },
  attachmentButton: {
    ...commonStyles.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  attachmentLabel: {
    color: colors.text,
    fontWeight: "600",
  },
  attachmentHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    marginTop: 28,
    gap: 12,
  },
  primaryBtn: {
    ...commonStyles.primaryBtn,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  resolveBtn: {
    backgroundColor: colors.accent,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  primaryText: {
    ...commonStyles.primaryText,
    fontWeight: "700",
  },
  secondaryBtn: {
    ...commonStyles.secondaryBtn,
    paddingVertical: 12,
  },
  secondaryText: {
    color: colors.text,
    fontWeight: "600",
  },
  reopenBtn: {
    borderColor: colors.accent,
  },
  reopenText: {
    color: colors.accent,
    fontWeight: "600",
  },
  dangerBtn: {
    borderColor: colors.danger,
  },
  dangerText: {
    color: colors.danger,
    fontWeight: "600",
  },
  assignmentNote: {
    marginTop: 4,
    color: colors.statusWarning,
    fontSize: 13,
  },
  sectionHint: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 13,
  },
  agentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  agentChip: {
    ...commonStyles.card,
    flexBasis: "48%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  agentChipActive: {
    ...commonStyles.card,
    borderColor: colors.accent,
  },
  agentChipText: {
    color: colors.text,
    fontWeight: "600",
  },
  agentChipTextActive: {
    color: colors.accentMuted,
  },
  agentChipSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    ...commonStyles.card,
    padding: 12,
    borderRadius: 12,
  },
  activityDescription: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  activityMeta: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
  commentAuthor: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  commentBody: {
    marginTop: 8,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  textInput: {
    ...commonStyles.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textInputMultiline: {
    minHeight: 44,
  },
  resolvedNotice: {
    backgroundColor: colors.accent,
    color: colors.accentMuted,
    padding: 12,
    borderRadius: 12,
    fontSize: 13,
  },
  pendingSyncBanner: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.statusWarning,
    backgroundColor: colors.statusWarningBg,
    padding: 16,
    marginTop: 20,
  },
  pendingSyncTitle: {
    color: colors.statusWarning,
    fontWeight: "700",
    marginBottom: 4,
  },
  pendingSyncText: {
    color: colors.statusWarningText,
    fontSize: 13,
    lineHeight: 18,
  },
});
