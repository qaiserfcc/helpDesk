import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";
import { apiClient } from "@/services/apiClient";

interface AgentAssignment {
  id: string;
  agentId: string;
  agentName: string;
  categoryId?: string;
  categoryName?: string;
  skillIds?: string[];
  maxCapacity?: number;
}

export function AgentAssignmentScreen() {
  const navigation = useNavigation();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["agent-assignments"],
    queryFn: async () => {
      const response = await apiClient.get("/agent-assignments");
      return response.data;
    },
  });

  const renderAssignment = ({ item }: { item: AgentAssignment }) => (
    <View style={styles.assignmentCard}>
      <View style={styles.assignmentHeader}>
        <Text style={styles.agentName}>{item.agentName}</Text>
        {item.maxCapacity && (
          <Text style={styles.capacity}>Max: {item.maxCapacity}</Text>
        )}
      </View>
      {item.categoryName && (
        <Text style={styles.detail}>Category: {item.categoryName}</Text>
      )}
      {item.skillIds && item.skillIds.length > 0 && (
        <Text style={styles.detail}>Skills: {item.skillIds.length}</Text>
      )}
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
        <Text style={styles.title}>Agent Assignments</Text>
        <View style={{ width: 70 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} />
      ) : (
        <FlatList
          data={assignments}
          renderItem={renderAssignment}
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
  list: {
    padding: 16,
  },
  assignmentCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  assignmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  agentName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  },
  capacity: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
  },
  detail: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
});
