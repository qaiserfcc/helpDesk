import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";
import { apiClient } from "@/services/apiClient";

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

export function CannedResponsesScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
  });

  const { data: responses = [], isLoading } = useQuery({
    queryKey: ["canned-responses"],
    queryFn: async () => {
      const response = await apiClient.get("/canned-responses");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<CannedResponse, "id">) => {
      const response = await apiClient.post("/canned-responses", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CannedResponse> }) => {
      const response = await apiClient.put(`/canned-responses/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/canned-responses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      category: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (response: CannedResponse) => {
    setFormData({
      title: response.title,
      content: response.content,
      category: response.category || "",
    });
    setEditingId(response.id);
    setShowForm(true);
  };

  const renderResponse = ({ item }: { item: CannedResponse }) => (
    <View style={styles.responseCard}>
      <View style={styles.responseHeader}>
        <Text style={styles.responseTitle}>{item.title}</Text>
        {item.category && (
          <Text style={styles.responseCategory}>{item.category}</Text>
        )}
      </View>
      <Text style={styles.responseContent} numberOfLines={3}>
        {item.content}
      </Text>
      <View style={styles.actionButtons}>
        <Pressable style={styles.editButton} onPress={() => handleEdit(item)}>
          <Text style={styles.buttonText}>Edit</Text>
        </Pressable>
        <Pressable
          style={styles.deleteButton}
          onPress={() => deleteMutation.mutate(item.id)}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Canned Responses</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.addButtonText}>{showForm ? "Cancel" : "+ Add"}</Text>
        </Pressable>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Title"
            placeholderTextColor={colors.textMuted}
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Category (optional)"
            placeholderTextColor={colors.textMuted}
            value={formData.category}
            onChangeText={(text) => setFormData({ ...formData, category: text })}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Response Content"
            placeholderTextColor={colors.textMuted}
            value={formData.content}
            onChangeText={(text) => setFormData({ ...formData, content: text })}
            multiline
          />
          <Pressable style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>
              {editingId ? "Update" : "Create"}
            </Text>
          </Pressable>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} />
      ) : (
        <FlatList
          data={responses}
          renderItem={renderResponse}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: colors.accent,
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.foreground,
    fontWeight: "600",
  },
  form: {
    padding: 16,
    backgroundColor: colors.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    color: colors.text,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: colors.accent,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: colors.foreground,
    fontWeight: "600",
  },
  list: {
    padding: 16,
  },
  responseCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  responseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  responseTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    flex: 1,
  },
  responseCategory: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
    marginLeft: 8,
  },
  responseContent: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  editButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  buttonText: {
    color: colors.foreground,
    fontWeight: "600",
  },
});
