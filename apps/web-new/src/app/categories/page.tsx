"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  Category,
  Subcategory,
  CreateCategoryData,
  CreateSubcategoryData,
} from "@/services/categories";
import { FormModal, FormField } from "@/components/FormModal";
import { RoleRestrictedView } from "@/components/RoleRestrictedView";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<{
    category: Category;
    subcategory: Subcategory;
  } | null>(null);
  const [selectedCategoryForSub, setSelectedCategoryForSub] =
    useState<Category | null>(null);

  const [categoryForm, setCategoryForm] = useState<CreateCategoryData>({
    name: "",
    description: "",
    isActive: true,
    order: 0,
  });

  const [subcategoryForm, setSubcategoryForm] = useState<CreateSubcategoryData>(
    {
      name: "",
      description: "",
      isActive: true,
      order: 0,
    }
  );

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsCategoryModalOpen(false);
      resetCategoryForm();
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCategoryData }) =>
      updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      resetCategoryForm();
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: ({
      categoryId,
      data,
    }: {
      categoryId: string;
      data: CreateSubcategoryData;
    }) => createSubcategory(categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsSubcategoryModalOpen(false);
      setSelectedCategoryForSub(null);
      resetSubcategoryForm();
    },
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: ({
      categoryId,
      subcategoryId,
      data,
    }: {
      categoryId: string;
      subcategoryId: string;
      data: CreateSubcategoryData;
    }) => updateSubcategory(categoryId, subcategoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsSubcategoryModalOpen(false);
      setEditingSubcategory(null);
      resetSubcategoryForm();
    },
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: ({
      categoryId,
      subcategoryId,
    }: {
      categoryId: string;
      subcategoryId: string;
    }) => deleteSubcategory(categoryId, subcategoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      description: "",
      isActive: true,
      order: 0,
    });
  };

  const resetSubcategoryForm = () => {
    setSubcategoryForm({
      name: "",
      description: "",
      isActive: true,
      order: 0,
    });
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    resetCategoryForm();
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      isActive: category.isActive,
      order: category.order,
    });
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleCreateSubcategory = (category: Category) => {
    setSelectedCategoryForSub(category);
    setEditingSubcategory(null);
    resetSubcategoryForm();
    setIsSubcategoryModalOpen(true);
  };

  const handleEditSubcategory = (
    category: Category,
    subcategory: Subcategory
  ) => {
    setEditingSubcategory({ category, subcategory });
    setSubcategoryForm({
      name: subcategory.name,
      description: subcategory.description || "",
      isActive: subcategory.isActive,
      order: subcategory.order,
    });
    setIsSubcategoryModalOpen(true);
  };

  const handleDeleteSubcategory = (
    categoryId: string,
    subcategoryId: string
  ) => {
    if (confirm("Are you sure you want to delete this subcategory?")) {
      deleteSubcategoryMutation.mutate({ categoryId, subcategoryId });
    }
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        data: categoryForm,
      });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const handleSubcategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubcategory) {
      updateSubcategoryMutation.mutate({
        categoryId: editingSubcategory.category.id,
        subcategoryId: editingSubcategory.subcategory.id,
        data: subcategoryForm,
      });
    } else if (selectedCategoryForSub) {
      createSubcategoryMutation.mutate({
        categoryId: selectedCategoryForSub.id,
        data: subcategoryForm,
      });
    }
  };

  const categoryFields: FormField[] = [
    {
      name: "name",
      label: "Name",
      type: "text",
      required: true,
      value: categoryForm.name,
      onChange: (value) => setCategoryForm({ ...categoryForm, name: value }),
      span: 2,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      value: categoryForm.description,
      onChange: (value) =>
        setCategoryForm({ ...categoryForm, description: value }),
      span: 2,
    },
    {
      name: "order",
      label: "Display Order",
      type: "number",
      value: categoryForm.order,
      onChange: (value) =>
        setCategoryForm({ ...categoryForm, order: Number(value) }),
    },
    {
      name: "isActive",
      label: "Active",
      type: "checkbox",
      value: categoryForm.isActive,
      onChange: (value) => setCategoryForm({ ...categoryForm, isActive: value }),
      placeholder: "Is this category active?",
    },
  ];

  const subcategoryFields: FormField[] = [
    {
      name: "name",
      label: "Name",
      type: "text",
      required: true,
      value: subcategoryForm.name,
      onChange: (value) => setSubcategoryForm({ ...subcategoryForm, name: value }),
      span: 2,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      value: subcategoryForm.description,
      onChange: (value) =>
        setSubcategoryForm({ ...subcategoryForm, description: value }),
      span: 2,
    },
    {
      name: "order",
      label: "Display Order",
      type: "number",
      value: subcategoryForm.order,
      onChange: (value) =>
        setSubcategoryForm({ ...subcategoryForm, order: Number(value) }),
    },
    {
      name: "isActive",
      label: "Active",
      type: "checkbox",
      value: subcategoryForm.isActive,
      onChange: (value) =>
        setSubcategoryForm({ ...subcategoryForm, isActive: value }),
      placeholder: "Is this subcategory active?",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Loading categories...</p>
      </div>
    );
  }

  return (
    <RoleRestrictedView permission="admin:manage_users">
      <div className="min-h-screen">
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-white">
                Categories & Subcategories
              </h1>
              <button
                onClick={handleCreateCategory}
                className="primary-btn px-4 py-2 rounded-md font-medium"
              >
                Add Category
              </button>
            </div>

            <div className="space-y-6">
              {categories?.map((category) => (
                <div key={category.id} className="card p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-semibold text-white">
                        {category.name}
                        {!category.isActive && (
                          <span className="ml-2 text-sm text-red-400">
                            (Inactive)
                          </span>
                        )}
                      </h2>
                      {category.description && (
                        <p className="text-white/70 mt-1">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-medium text-white/80">
                        Subcategories
                      </h3>
                      <button
                        onClick={() => handleCreateSubcategory(category)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm"
                      >
                        Add Subcategory
                      </button>
                    </div>

                    {category.subcategories && category.subcategories.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {category.subcategories.map((subcategory) => (
                          <div
                            key={subcategory.id}
                            className="bg-white/5 p-3 rounded-md"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-white font-medium">
                                  {subcategory.name}
                                  {!subcategory.isActive && (
                                    <span className="ml-1 text-xs text-red-400">
                                      (Inactive)
                                    </span>
                                  )}
                                </p>
                                {subcategory.description && (
                                  <p className="text-white/60 text-sm mt-1">
                                    {subcategory.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex space-x-1 ml-2">
                                <button
                                  onClick={() =>
                                    handleEditSubcategory(category, subcategory)
                                  }
                                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteSubcategory(
                                      category.id,
                                      subcategory.id
                                    )
                                  }
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                                >
                                  Del
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/60 text-sm italic">
                        No subcategories yet
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <FormModal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
            resetCategoryForm();
          }}
          title={editingCategory ? "Edit Category" : "Create Category"}
          fields={categoryFields}
          onSubmit={handleCategorySubmit}
          isSubmitting={
            createCategoryMutation.isPending || updateCategoryMutation.isPending
          }
        />

        <FormModal
          isOpen={isSubcategoryModalOpen}
          onClose={() => {
            setIsSubcategoryModalOpen(false);
            setEditingSubcategory(null);
            setSelectedCategoryForSub(null);
            resetSubcategoryForm();
          }}
          title={
            editingSubcategory
              ? "Edit Subcategory"
              : `Create Subcategory for ${selectedCategoryForSub?.name}`
          }
          fields={subcategoryFields}
          onSubmit={handleSubcategorySubmit}
          isSubmitting={
            createSubcategoryMutation.isPending ||
            updateSubcategoryMutation.isPending
          }
        />
      </div>
    </RoleRestrictedView>
  );
}
