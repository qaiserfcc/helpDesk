import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Crypto from "expo-crypto";
import * as Network from "expo-network";
import * as DocumentPicker from "expo-document-picker";
import { isAxiosError } from "axios";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RootStackParamList } from "@/navigation/AppNavigator";
import { useAuthStore } from "@/store/useAuthStore";
import {
  CreateTicketPayload,
  IssueType,
  TicketPriority,
  Ticket,
  createTicket,
  fetchTicket,
  uploadTicketAttachments,
  updateTicket,
} from "@/services/tickets";
import { categoriesService } from "@/services/categories";
import { subcategoriesService } from "@/services/subcategories";
import { fetchVisibleAttributes } from "@/services/attributes";
import { uploadFile } from "@/services/uploads";
import { queueTicket } from "@/storage/offline-db";
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";
import { syncQueuedTickets } from "@/services/syncService";

const priorityOptions: TicketPriority[] = ["low", "medium", "high"];
const issueOptions: IssueType[] = [
  "hardware",
  "software",
  "network",
  "access",
  "other",
];

type Props = NativeStackScreenProps<RootStackParamList, "TicketForm">;

type AttachmentDraft = {
  uri: string;
  name: string;
  type: string;
};

const defaultMimeType = "application/octet-stream";

function getAttachmentName(path: string) {
  return path.replace(/^.*[\\/]/, "");
}

function isNetworkError(error: unknown) {
  if (isAxiosError(error)) {
    return !error.response;
  }
  return false;
}

export function TicketFormScreen({ route, navigation }: Props) {
  const ticketId = route.params?.ticketId;
  const isEdit = Boolean(ticketId);
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.session?.user);
  const { data: ticket } = useQuery({
    queryKey: ["ticket", ticketId],
    enabled: isEdit,
    queryFn: () => fetchTicket(ticketId!),
  });

  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [issueType, setIssueType] = useState<IssueType>("other");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [uploadingAttributeKey, setUploadingAttributeKey] = useState<
    string | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const isResolvedTicket = Boolean(ticket && ticket.status === "resolved");
  const lockedFromEditing = Boolean(isEdit && isResolvedTicket);

  const role = authUser?.role ?? "user";

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesService.listAllCategories(),
    enabled: !lockedFromEditing,
    staleTime: 60_000,
  });

  const { data: subcategories = [], isLoading: subcategoriesLoading } =
    useQuery({
      queryKey: ["subcategories", categoryId],
      queryFn: () =>
        categoryId
          ? subcategoriesService.listByCategory(categoryId)
          : Promise.resolve([]),
      enabled: !lockedFromEditing && Boolean(categoryId),
      staleTime: 60_000,
    });

  const { data: attributeDefs = [], isLoading: attributesLoading } = useQuery({
    queryKey: ["ticket-attributes"],
    queryFn: fetchVisibleAttributes,
    enabled: !lockedFromEditing,
    staleTime: 60_000,
  });

  const visibleAttributes = useMemo(() => {
    return [...(attributeDefs ?? [])]
      .filter((a) => a.active)
      .filter((a) => (a.visibleTo ?? []).includes(role))
      .sort((a, b) => a.order - b.order);
  }, [attributeDefs, role]);

  useEffect(() => {
    if (ticket) {
      setDescription(ticket.description);
      setPriority(ticket.priority);
      setIssueType(ticket.issueType);
      setCategoryId(ticket.category?.id ?? "");
      setSubcategoryId(ticket.subcategory?.id ?? "");

      const nextAttributes: Record<string, unknown> = {};
      for (const av of ticket.attributeValues ?? []) {
        if (av?.attribute?.key) {
          nextAttributes[av.attribute.key] = av.value;
        }
      }
      setAttributes(nextAttributes);
    }
  }, [ticket]);

  const headerTitle = useMemo(
    () => (isEdit ? "Update ticket" : "Create ticket"),
    [isEdit],
  );

  const handleAddAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const mapped = result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name ?? getAttachmentName(asset.uri),
        type: asset.mimeType ?? defaultMimeType,
      }));
      setAttachments((prev) => [...prev, ...mapped]);
    } catch (error) {
      console.error("document picker error", error);
      Alert.alert("Attachment error", "Unable to pick a file right now.");
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQueueFallback = async (payload: CreateTicketPayload) => {
    if (attachments.length) {
      Alert.alert(
        "Attachments pending",
        "Attachments can't be queued offline. Re-open the ticket when you're back online to upload them.",
      );
    }
    const tempId = Crypto.randomUUID();
    await queueTicket({
      tickets: [
        {
          tempId,
          description: payload.description,
          priority: payload.priority,
          issueType: payload.issueType,
          categoryId: payload.categoryId,
          subcategoryId: payload.subcategoryId,
          attributes: payload.attributes,
          attachments: payload.attachments ?? [],
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await syncQueuedTickets();
    await queryClient.invalidateQueries({ queryKey: ["queuedTickets"] });
    Alert.alert(
      "Queued offline",
      "We stored your ticket locally and will sync it when you reconnect.",
    );
    navigation.goBack();
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert("Description required", "Please describe the issue.");
      return;
    }

    setSubmitting(true);
    const payload: CreateTicketPayload = {
      description: description.trim(),
      priority,
      issueType,
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      attributes: Object.keys(attributes).length ? attributes : undefined,
    };

    let savedTicket: Ticket | undefined;

    try {
      if (isEdit && ticketId) {
        savedTicket = await updateTicket(ticketId, payload);
      } else {
        const networkState = await Network.getNetworkStateAsync();
        if (!networkState.isConnected) {
          await handleQueueFallback(payload);
          return;
        }
        savedTicket = await createTicket(payload);
      }

      if (attachments.length && savedTicket) {
        try {
          await uploadTicketAttachments(savedTicket.id, attachments);
          setAttachments([]);
        } catch (error) {
          console.error("attachment upload failed", error);
          Alert.alert(
            "Attachment upload failed",
            "Ticket saved but files could not be uploaded. Please try again from the ticket detail screen.",
          );
        }
      }

      await queryClient.invalidateQueries({
        queryKey: ["tickets"],
        exact: false,
      });
      if (isEdit && ticketId) {
        await queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      }
      navigation.goBack();
    } catch (error) {
      if (!isEdit && isNetworkError(error)) {
        await handleQueueFallback(payload);
        return;
      }
      Alert.alert("Save failed", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetCategory = (nextId: string) => {
    setCategoryId(nextId);
    setSubcategoryId("");
  };

  const handleAttributeChange = (key: string, value: unknown) => {
    setAttributes((prev) => ({ ...prev, [key]: value }));
  };

  const handlePickAndUploadAttributeFile = async (attributeKey: string) => {
    try {
      const network = await Network.getNetworkStateAsync();
      if (!network.isConnected) {
        Alert.alert("Offline", "File fields can't be uploaded while offline.");
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;
      const name = asset.name ?? getAttachmentName(asset.uri);
      const type = asset.mimeType ?? defaultMimeType;

      setUploadingAttributeKey(attributeKey);
      const path = await uploadFile({ uri, name, type });
      handleAttributeChange(attributeKey, path);
    } catch (error) {
      console.error("attribute file upload failed", error);
      Alert.alert("Upload failed", "Please try again.");
    } finally {
      setUploadingAttributeKey(null);
    }
  };

  if (lockedFromEditing) {
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockedCard}>
          <Text style={styles.lockedTitle}>Ticket is resolved</Text>
          <Text style={styles.lockedMessage}>
            Reopen the ticket from the detail screen before making changes.
            Contact support if you need additional help.
          </Text>
          <Pressable
            style={styles.lockedBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.lockedBtnText}>Back to ticket</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>{headerTitle}</Text>
        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Describe the issue"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.optionRow}>
          {priorityOptions.map((option) => {
            const selected = option === priority;
            return (
              <Pressable
                key={option}
                style={[styles.optionChip, selected && styles.optionChipActive]}
                onPress={() => setPriority(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Issue type</Text>
        <View style={styles.optionRow}>
          {issueOptions.map((option) => {
            const selected = option === issueType;
            return (
              <Pressable
                key={option}
                style={[styles.optionChip, selected && styles.optionChipActive]}
                onPress={() => setIssueType(option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextActive,
                  ]}
                >
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Category</Text>
        {categoriesLoading ? (
          <Text style={styles.hint}>Loading categories…</Text>
        ) : categories.length === 0 ? (
          <Text style={styles.hint}>No categories available.</Text>
        ) : (
          <View style={styles.optionRow}>
            {categories.map((c) => {
              const selected = c.id === categoryId;
              return (
                <Pressable
                  key={c.id}
                  style={[
                    styles.optionChip,
                    selected && styles.optionChipActive,
                  ]}
                  onPress={() => handleSetCategory(c.id)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.optionTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Subcategory</Text>
        {!categoryId ? (
          <Text style={styles.hint}>Select a category first.</Text>
        ) : subcategoriesLoading ? (
          <Text style={styles.hint}>Loading subcategories…</Text>
        ) : subcategories.length === 0 ? (
          <Text style={styles.hint}>No subcategories available.</Text>
        ) : (
          <View style={styles.optionRow}>
            {subcategories.map((s) => {
              const selected = s.id === subcategoryId;
              return (
                <Pressable
                  key={s.id}
                  style={[
                    styles.optionChip,
                    selected && styles.optionChipActive,
                  ]}
                  onPress={() => setSubcategoryId(s.id)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.optionTextActive,
                    ]}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Custom fields</Text>
        {attributesLoading ? (
          <Text style={styles.hint}>Loading fields…</Text>
        ) : visibleAttributes.length === 0 ? (
          <Text style={styles.hint}>No custom fields.</Text>
        ) : (
          <View style={{ marginBottom: 20 }}>
            {visibleAttributes.map((attr) => {
              const value = attributes[attr.key];
              const requiredMarker = attr.required ? " *" : "";

              if (attr.type === "select") {
                return (
                  <View key={attr.id} style={{ marginBottom: 14 }}>
                    <Text style={styles.label}>
                      {attr.label}
                      {requiredMarker}
                    </Text>
                    <View style={styles.optionRow}>
                      {attr.options.map((opt) => {
                        const selected = value === opt;
                        return (
                          <Pressable
                            key={`${attr.key}-${opt}`}
                            style={[
                              styles.optionChip,
                              selected && styles.optionChipActive,
                            ]}
                            onPress={() => handleAttributeChange(attr.key, opt)}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                selected && styles.optionTextActive,
                              ]}
                            >
                              {opt}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              }

              if (attr.type === "multiselect") {
                const selectedValues = Array.isArray(value)
                  ? (value as string[])
                  : [];
                return (
                  <View key={attr.id} style={{ marginBottom: 14 }}>
                    <Text style={styles.label}>
                      {attr.label}
                      {requiredMarker}
                    </Text>
                    <View style={styles.optionRow}>
                      {attr.options.map((opt) => {
                        const selected = selectedValues.includes(opt);
                        return (
                          <Pressable
                            key={`${attr.key}-${opt}`}
                            style={[
                              styles.optionChip,
                              selected && styles.optionChipActive,
                            ]}
                            onPress={() => {
                              const next = selected
                                ? selectedValues.filter((v) => v !== opt)
                                : [...selectedValues, opt];
                              handleAttributeChange(attr.key, next);
                            }}
                          >
                            <Text
                              style={[
                                styles.optionText,
                                selected && styles.optionTextActive,
                              ]}
                            >
                              {opt}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              }

              if (attr.type === "file") {
                const filePath = typeof value === "string" ? value : "";
                const fileLabel = filePath
                  ? getAttachmentName(filePath)
                  : "No file selected";
                const isUploading = uploadingAttributeKey === attr.key;

                return (
                  <View key={attr.id} style={{ marginBottom: 14 }}>
                    <Text style={styles.label}>
                      {attr.label}
                      {requiredMarker}
                    </Text>
                    <View style={styles.attachmentCard}>
                      <Text style={styles.attachmentHint}>{fileLabel}</Text>
                      <Pressable
                        style={[
                          styles.attachmentBtn,
                          isUploading && styles.submitBtnDisabled,
                        ]}
                        onPress={() =>
                          handlePickAndUploadAttributeFile(attr.key)
                        }
                        disabled={isUploading}
                      >
                        <Text style={styles.attachmentBtnText}>
                          {isUploading ? "Uploading…" : "+ Choose file"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }

              return (
                <View key={attr.id} style={{ marginBottom: 14 }}>
                  <Text style={styles.label}>
                    {attr.label}
                    {requiredMarker}
                  </Text>
                  <TextInput
                    value={
                      typeof value === "string"
                        ? value
                        : value == null
                          ? ""
                          : String(value)
                    }
                    onChangeText={(text) => {
                      if (attr.type === "number") {
                        handleAttributeChange(attr.key, text);
                        return;
                      }
                      handleAttributeChange(attr.key, text);
                    }}
                    placeholder={
                      attr.type === "date" ? "YYYY-MM-DD" : "Enter a value"
                    }
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    keyboardType={
                      attr.type === "number" ? "numeric" : "default"
                    }
                  />
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.label}>Attachments</Text>
        {isEdit && ticket?.attachments?.length ? (
          <View style={styles.existingAttachments}>
            <Text style={styles.existingLabel}>Current files</Text>
            {ticket.attachments.map((path) => (
              <Text key={path} style={styles.existingAttachmentText}>
                {getAttachmentName(path)}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={styles.attachmentCard}>
          {attachments.length === 0 ? (
            <Text style={styles.attachmentHint}>No new files selected.</Text>
          ) : (
            attachments.map((file, index) => (
              <View key={`${file.uri}-${index}`} style={styles.attachmentRow}>
                <Text style={styles.attachmentName}>{file.name}</Text>
                <Pressable onPress={() => handleRemoveAttachment(index)}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            ))
          )}
          <Pressable style={styles.attachmentBtn} onPress={handleAddAttachment}>
            <Text style={styles.attachmentBtnText}>+ Add file</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitText}>
            {submitting
              ? "Saving..."
              : isEdit
                ? "Update ticket"
                : "Create ticket"}
          </Text>
        </Pressable>

        <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.container,
  },
  content: {
    padding: 20,
    paddingBottom: 80,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 24,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    minHeight: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    color: colors.text,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 14,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  optionText: {
    color: colors.muted,
    textTransform: "capitalize",
  },
  optionTextActive: {
    color: colors.onAccent,
    fontWeight: "600",
  },
  existingAttachments: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 12,
  },
  existingLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  existingAttachmentText: {
    color: colors.text,
    fontSize: 14,
  },
  attachmentCard: {
    ...commonStyles.card,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  attachmentHint: {
    color: colors.muted,
    fontSize: 13,
  },
  attachmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  attachmentName: {
    flex: 1,
    color: colors.text,
  },
  removeText: {
    color: colors.danger,
    fontWeight: "600",
  },
  attachmentBtn: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 10,
    alignItems: "center",
  },
  attachmentBtnText: {
    color: colors.accent,
    fontWeight: "600",
  },
  submitBtn: {
    ...commonStyles.primaryBtn,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: colors.onAccent,
    fontWeight: "700",
    fontSize: 16,
  },
  cancelBtn: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.text,
    fontWeight: "600",
  },
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 24,
  },
  lockedCard: {
    ...commonStyles.card,
    width: "100%",
    borderRadius: 16,
    padding: 24,
    gap: 16,
  },
  lockedTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  lockedMessage: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  lockedBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accent,
  },
  lockedBtnText: {
    color: colors.accent,
    fontWeight: "600",
  },
});
