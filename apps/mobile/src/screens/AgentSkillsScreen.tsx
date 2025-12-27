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

interface AgentSkill {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export function AgentSkillsScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
  });

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ["agent-skills"],
    queryFn: async () => {
      const response = await apiClient.get("/agent-skills");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<AgentSkill, "id">) => {
      const response = await apiClient.post("/agent-skills", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-skills"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<AgentSkill>;
    }) => {
      const response = await apiClient.put(`/agent-skills/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-skills"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/agent-skills/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-skills"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
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

  const handleEdit = (skill: AgentSkill) => {
    setFormData({
      name: skill.name,
      description: skill.description || "",
      category: skill.category || "",
    });
    setEditingId(skill.id);
    setShowForm(true);
  };

  const renderSkill = ({ item }: { item: AgentSkill }) => (
    <View style={styles.skillCard}>
      <View style={styles.skillHeader}>
        <Text style={styles.skillName}>{item.name}</Text>
        {item.category && (
          <Text style={styles.skillCategory}>{item.category}</Text>
        )}
      </View>
      {item.description && (
        <Text style={styles.skillDescription}>{item.description}</Text>
      )}
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
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Agent Skills</Text>
        <Pressable
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Text style={styles.addButtonText}>
            {showForm ? "Cancel" : "+ Add"}
          </Text>
        </Pressable>
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Skill Name"
            placeholderTextColor={colors.textMuted}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Category (optional)"
            placeholderTextColor={colors.textMuted}
            value={formData.category}
            onChangeText={(text) =>
              setFormData({ ...formData, category: text })
            }
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textMuted}
            value={formData.description}
            onChangeText={(text) =>
              setFormData({ ...formData, description: text })
            }
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
          data={skills}
          renderItem={renderSkill}
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
    minHeight: 80,
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
  skillCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  skillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  skillName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  },
  skillCategory: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },
  skillDescription: {
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
