"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { CrudModal } from "@/components/CrudModal";
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
    // Pre-fill with test values for quick testing
    setFormData({
      name: "Test Skill - Network Support",
      description: "Expertise in network troubleshooting and configuration",
      active: true,
    });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Agent Skills Management</h1>
            <p className="text-slate-400">Define skills for skill-based ticket routing</p>
          </div>
          <button
            onClick={() => router.push("/tickets")}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Back to Tickets
          </button>
        </div>

        {!showForm && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              + Create Skill
            </button>
          </div>
        )}

        {showForm && (
          <CrudModal
            title={editingSkill ? "Edit Skill" : "Create Skill"}
            onClose={() => {
              setShowForm(false);
              setEditingSkill(null);
              resetForm();
            }}
            onSubmit={handleSubmit}
            submitLabel={editingSkill ? "Update" : "Create"}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            formId="skill-form"
          >
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Network Support"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this skill..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div className="flex items-center md:col-span-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="active" className="ml-2 text-sm font-medium text-gray-700">
                Active
              </label>
            </div>
          </CrudModal>
        )}

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Skills</h2>
          {isLoading ? (
            <p className="text-slate-400">Loading skills...</p>
          ) : skills && skills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="bg-slate-700/50 backdrop-blur rounded-lg p-4 border border-slate-600 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{skill.name}</h3>
                      {skill.description && (
                        <p className="text-slate-400 text-sm mt-1">{skill.description}</p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        skill.active
                          ? "bg-green-600/20 text-green-400"
                          : "bg-slate-600/20 text-slate-400"
                      }`}
                    >
                      {skill.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center text-slate-400 text-sm mb-3">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    {skill.userSkills?.length || 0} agents
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleEdit(skill)}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(skill.id)}
                      className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">No skills yet. Create one to get started!</p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-white">Confirm Delete</h2>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this skill? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSkillToDelete(null);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
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
