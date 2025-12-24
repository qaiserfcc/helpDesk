"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  fetchAgentSkills,
  createAgentSkill,
  updateAgentSkill,
  deleteAgentSkill,
  assignSkillToUser,
  removeSkillFromUser,
  type AgentSkill,
  type CreateAgentSkillPayload,
  type UpdateAgentSkillPayload,
} from "@/services/agentSkills";

export default function AgentSkillsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<AgentSkill | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [skillToDelete, setSkillToDelete] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateAgentSkillPayload>({
    name: "",
    description: "",
    active: true,
  });

  const { data: skills, isLoading } = useQuery({
    queryKey: ["agent-skills"],
    queryFn: () => fetchAgentSkills(false),
  });

  const createMutation = useMutation({
    mutationFn: createAgentSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-skills"] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAgentSkillPayload }) =>
      updateAgentSkill(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-skills"] });
      setShowForm(false);
      setEditingSkill(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAgentSkill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-skills"] });
      setShowDeleteModal(false);
      setSkillToDelete(null);
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", active: true });
  };

  const handleCreate = () => {
    setEditingSkill(null);
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (skill: AgentSkill) => {
    setEditingSkill(skill);
    setFormData({
      name: skill.name,
      description: skill.description || "",
      active: skill.active,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSkill) {
      updateMutation.mutate({ id: editingSkill.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (skillId: string) => {
    setSkillToDelete(skillId);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (skillToDelete) {
      deleteMutation.mutate(skillToDelete);
    }
  };

  if (!user || user.role !== "admin") {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Agent Skills Management</h1>
            <p className="text-purple-200">Define skills for skill-based ticket routing</p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-white text-purple-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
          >
            + Create Skill
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Skills</h2>
          {isLoading ? (
            <p className="text-white/70">Loading skills...</p>
          ) : skills && skills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="bg-white/20 backdrop-blur rounded-lg p-4 border border-white/30 hover:bg-white/30 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{skill.name}</h3>
                      {skill.description && (
                        <p className="text-white/70 text-sm mt-1">{skill.description}</p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        skill.active
                          ? "bg-green-500 text-white"
                          : "bg-gray-500 text-white"
                      }`}
                    >
                      {skill.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center text-white/60 text-sm mb-3">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    {skill.userSkills?.length || 0} agents
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(skill)}
                      className="text-white hover:text-blue-200 text-sm font-medium px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(skill.id)}
                      className="text-red-200 hover:text-red-100 text-sm font-medium px-3 py-1 bg-red-500/20 rounded hover:bg-red-500/30 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/70">No skills yet. Create one to get started!</p>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              {editingSkill ? "Edit Skill" : "Create Skill"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Network Support"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this skill..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingSkill(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  {editingSkill ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Confirm Delete</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this skill? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSkillToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
