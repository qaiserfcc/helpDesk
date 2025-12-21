import React, { useState, useEffect } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/AppNavigator";
import { colors } from "@/theme/colors";
import { commonStyles } from "@/theme/commonStyles";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  type Category,
  type Subcategory,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
  type CreateSubcategoryPayload,
  type UpdateSubcategoryPayload,
} from "@/services/categories";

type FormMode = "create-category" | "edit-category" | "create-subcategory" | "edit-subcategory";

export function CategoryManagementScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList, "Dashboard">>();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // Form modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create-category");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories:", error);
      Alert.alert("Error", "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const openCreateCategoryModal = () => {
    setFormMode("create-category");
    setFormName("");
    setFormDescription("");
    setFormActive(true);
    setEditingId(null);
    setModalVisible(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setFormMode("edit-category");
    setFormName(category.name);
    setFormDescription(category.description || "");
    setFormActive(category.active);
    setEditingId(category.id);
    setModalVisible(true);
  };

  const openCreateSubcategoryModal = (category: Category) => {
    setFormMode("create-subcategory");
    setSelectedCategory(category);
    setFormName("");
    setFormDescription("");
    setFormActive(true);
    setEditingId(null);
    setModalVisible(true);
  };

  const openEditSubcategoryModal = (category: Category, subcategory: Subcategory) => {
    setFormMode("edit-subcategory");
    setSelectedCategory(category);
    setFormName(subcategory.name);
    setFormDescription(subcategory.description || "");
    setFormActive(subcategory.active);
    setEditingId(subcategory.id);
    setModalVisible(true);
  };

  const handleSubmitForm = async () => {
    if (!formName.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    try {
      if (formMode === "create-category") {
        const payload: CreateCategoryPayload = {
          name: formName,
          description: formDescription || undefined,
          active: formActive,
        };
        await createCategory(payload);
      } else if (formMode === "edit-category" && editingId) {
        const payload: UpdateCategoryPayload = {
          name: formName,
          description: formDescription || undefined,
          active: formActive,
        };
        await updateCategory(editingId, payload);
      } else if (formMode === "create-subcategory" && selectedCategory) {
        const payload: CreateSubcategoryPayload = {
          name: formName,
          categoryId: selectedCategory.id,
          description: formDescription || undefined,
          active: formActive,
        };
        await createSubcategory(payload);
      } else if (formMode === "edit-subcategory" && editingId) {
        const payload: UpdateSubcategoryPayload = {
          name: formName,
          description: formDescription || undefined,
          active: formActive,
        };
        await updateSubcategory(editingId, payload);
      }

      setModalVisible(false);
      await loadCategories();
      Alert.alert("Success", "Changes saved successfully");
    } catch (error) {
      console.error("Failed to save:", error);
      Alert.alert("Error", "Failed to save changes");
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    Alert.alert(
      "Delete Category",
      "Are you sure you want to delete this category? All subcategories will also be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory(categoryId);
              await loadCategories();
              Alert.alert("Success", "Category deleted");
            } catch (error) {
              console.error("Failed to delete category:", error);
              Alert.alert("Error", "Failed to delete category");
            }
          },
        },
      ]
    );
  };

  const handleDeleteSubcategory = (subcategoryId: string) => {
    Alert.alert(
      "Delete Subcategory",
      "Are you sure you want to delete this subcategory?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSubcategory(subcategoryId);
              await loadCategories();
              Alert.alert("Success", "Subcategory deleted");
            } catch (error) {
              console.error("Failed to delete subcategory:", error);
              Alert.alert("Error", "Failed to delete subcategory");
            }
          },
        },
      ]
    );
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategoryId(expandedCategoryId === categoryId ? null : categoryId);
  };

  const getFormTitle = () => {
    switch (formMode) {
      case "create-category":
        return "Create Category";
      case "edit-category":
        return "Edit Category";
      case "create-subcategory":
        return "Create Subcategory";
      case "edit-subcategory":
        return "Edit Subcategory";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backGlyph}>←</Text>
          </Pressable>
          <View>
            <Text style={styles.eyebrow}>Admin</Text>
            <Text style={styles.title}>Category Management</Text>
          </View>
        </View>
        <Pressable style={styles.createButton} onPress={openCreateCategoryModal}>
          <Text style={styles.createButtonText}>+ Category</Text>
        </Pressable>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={({ item: category }) => {
          const isExpanded = expandedCategoryId === category.id;
          return (
            <View style={styles.categoryCard}>
              <Pressable
                style={styles.categoryHeader}
                onPress={() => toggleCategoryExpansion(category.id)}
              >
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  {category.description && (
                    <Text style={styles.categoryDescription}>{category.description}</Text>
                  )}
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.badge,
                        category.active ? styles.badgeActive : styles.badgeInactive,
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {category.active ? "Active" : "Inactive"}
                      </Text>
                    </View>
                    {category.subcategories && category.subcategories.length > 0 && (
                      <Text style={styles.subcategoryCount}>
                        {category.subcategories.length} subcategories
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.expandIcon}>{isExpanded ? "▼" : "▶"}</Text>
              </Pressable>

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => openEditCategoryModal(category)}
                >
                  <Text style={styles.actionButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={styles.actionButton}
                  onPress={() => openCreateSubcategoryModal(category)}
                >
                  <Text style={styles.actionButtonText}>+ Subcategory</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteCategory(category.id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>

              {isExpanded && category.subcategories && category.subcategories.length > 0 && (
                <View style={styles.subcategoriesContainer}>
                  {category.subcategories.map((subcategory) => (
                    <View key={subcategory.id} style={styles.subcategoryCard}>
                      <View style={styles.subcategoryInfo}>
                        <Text style={styles.subcategoryName}>{subcategory.name}</Text>
                        {subcategory.description && (
                          <Text style={styles.subcategoryDescription}>
                            {subcategory.description}
                          </Text>
                        )}
                        <View
                          style={[
                            styles.badge,
                            styles.badgeSmall,
                            subcategory.active ? styles.badgeActive : styles.badgeInactive,
                          ]}
                        >
                          <Text style={[styles.badgeText, styles.badgeTextSmall]}>
                            {subcategory.active ? "Active" : "Inactive"}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.subcategoryActions}>
                        <Pressable
                          style={styles.smallActionButton}
                          onPress={() => openEditSubcategoryModal(category, subcategory)}
                        >
                          <Text style={styles.smallActionButtonText}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.smallActionButton, styles.smallDeleteButton]}
                          onPress={() => handleDeleteSubcategory(subcategory.id)}
                        >
                          <Text style={styles.smallDeleteButtonText}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
      />

      {/* Form Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{getFormTitle()}</Text>

              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Enter name"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formDescription}
                onChangeText={setFormDescription}
                placeholder="Enter description (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
              />

              <View style={styles.checkboxRow}>
                <Text style={styles.label}>Active</Text>
                <Pressable
                  style={styles.checkbox}
                  onPress={() => setFormActive(!formActive)}
                >
                  <View
                    style={[
                      styles.checkboxInner,
                      formActive && styles.checkboxInnerChecked,
                    ]}
                  />
                </Pressable>
              </View>

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={handleSubmitForm}
                >
                  <Text style={styles.submitButtonText}>Save</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...commonStyles.container,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  backButton: {
    ...commonStyles.card,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backGlyph: {
    fontSize: 20,
    color: colors.text,
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: "700",
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  createButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "600",
  },
  listContent: {
    padding: 24,
    paddingTop: 8,
    gap: 16,
  },
  categoryCard: {
    ...commonStyles.sectionCard,
    padding: 16,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  categoryDescription: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeSmall: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignSelf: "flex-start",
  },
  badgeActive: {
    backgroundColor: `${colors.success}30`,
  },
  badgeInactive: {
    backgroundColor: `${colors.border}50`,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
  },
  badgeTextSmall: {
    fontSize: 11,
  },
  subcategoryCount: {
    color: colors.textMuted,
    fontSize: 12,
  },
  expandIcon: {
    color: colors.textMuted,
    fontSize: 16,
    marginLeft: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.border,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  deleteButton: {
    backgroundColor: `${colors.danger}20`,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "500",
  },
  subcategoriesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  subcategoryCard: {
    backgroundColor: colors.border,
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subcategoryInfo: {
    flex: 1,
  },
  subcategoryName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "500",
  },
  subcategoryDescription: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  subcategoryActions: {
    flexDirection: "row",
    gap: 6,
    marginLeft: 8,
  },
  smallActionButton: {
    backgroundColor: colors.background,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  smallActionButtonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "500",
  },
  smallDeleteButton: {
    backgroundColor: `${colors.danger}15`,
  },
  smallDeleteButtonText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "500",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxHeight: "90%",
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.border,
    color: colors.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  checkboxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: "transparent",
  },
  checkboxInnerChecked: {
    backgroundColor: colors.primary,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: colors.border,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: colors.primary,
  },
  submitButtonText: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "600",
  },
});
