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

interface SLA {
  id: string;
  name: string;
  priority: string;
  responseTime: number;
  resolutionTime: number;
  description?: string;
}

export function SLAManagementScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    priority: "",
    responseTime: "",
    resolutionTime: "",
    description: "",
  });

  const { data: slas = [], isLoading } = useQuery({
    queryKey: ["slas"],
    queryFn: async () => {
      const response = await apiClient.get("/slas");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<SLA, "id">) => {
      const response = await apiClient.post("/slas", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slas"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SLA> }) => {
      const response = await apiClient.put(`/slas/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slas"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/slas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slas"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      priority: "",
      responseTime: "",
      resolutionTime: "",
      description: "",
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      priority: formData.priority,
      responseTime: parseInt(formData.responseTime, 10),
      resolutionTime: parseInt(formData.resolutionTime, 10),
      description: formData.description,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (sla: SLA) => {
    setFormData({
      name: sla.name,
      priority: sla.priority,
      responseTime: sla.responseTime.toString(),
      resolutionTime: sla.resolutionTime.toString(),
      description: sla.description || "",
    });
    setEditingId(sla.id);
    setShowForm(true);
  };

  const renderSLA = ({ item }: { item: SLA }) => (
    <View style={styles.slaCard}>
      <View style={styles.slaHeader}>
        <Text style={styles.slaName}>{item.name}</Text>
        <Text style={styles.slaPriority}>{item.priority}</Text>
      </View>
      <Text style={styles.slaDetail}>Response: {item.responseTime}h</Text>
      <Text style={styles.slaDetail}>Resolution: {item.resolutionTime}h</Text>
      {item.description && (
        <Text style={styles.slaDescription}>{item.description}</Text>
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
        <Text style={styles.title}>SLA Management</Text>
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
            placeholder="Name"
            placeholderTextColor={colors.textMuted}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Priority"
            placeholderTextColor={colors.textMuted}
            value={formData.priority}
            onChangeText={(text) =>
              setFormData({ ...formData, priority: text })
            }
          />
          <TextInput
            style={styles.input}
            placeholder="Response Time (hours)"
            placeholderTextColor={colors.textMuted}
            value={formData.responseTime}
            onChangeText={(text) =>
              setFormData({ ...formData, responseTime: text })
            }
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Resolution Time (hours)"
            placeholderTextColor={colors.textMuted}
            value={formData.resolutionTime}
            onChangeText={(text) =>
              setFormData({ ...formData, resolutionTime: text })
            }
            keyboardType="numeric"
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
          data={slas}
          renderItem={renderSLA}
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
  slaCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  slaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  slaName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  },
  slaPriority: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },
  slaDetail: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  slaDescription: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
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
