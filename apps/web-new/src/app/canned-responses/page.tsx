"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  fetchCannedResponses,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
  type CannedResponse,
  type CreateCannedResponsePayload,
} from "@/services/cannedResponses";

export default function CannedResponsesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null);
  const [formData, setFormData] = useState<CreateCannedResponsePayload>({
    title: "",
    shortcut: "",
    content: "",
    active: true,
  });

  const { data: responses, isLoading } = useQuery({
    queryKey: ["canned-responses"],
    queryFn: () => fetchCannedResponses(false),
  });

  const createMutation = useMutation({
    mutationFn: createCannedResponse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      updateCannedResponse(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
      setShowForm(false);
      setEditingResponse(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCannedResponse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canned-responses"] });
    },
  });

  const resetForm = () => {
    setFormData({ title: "", shortcut: "", content: "", active: true });
  };

  const handleCreate = () => {
    setEditingResponse(null);
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (response: CannedResponse) => {
    setEditingResponse(response);
    setFormData({
      title: response.title,
      shortcut: response.shortcut,
      content: response.content,
      active: response.active,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingResponse) {
      updateMutation.mutate({ id: editingResponse.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (!user || (user.role !== "admin" && user.role !== "agent")) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 via-cyan-900 to-blue-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Canned Responses</h1>
            <p className="text-cyan-200">Quick responses for faster ticket handling</p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-white text-teal-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
          >
            + Create Response
          </button>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Saved Responses</h2>
          {isLoading ? (
            <p className="text-white/70">Loading responses...</p>
          ) : responses && responses.length > 0 ? (
            <div className="space-y-4">
              {responses.map((response) => (
                <div
                  key={response.id}
                  className="bg-white/20 backdrop-blur rounded-lg p-5 border border-white/30 hover:bg-white/30 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{response.title}</h3>
                        <code className="px-3 py-1 bg-cyan-500/30 text-cyan-100 text-sm rounded font-mono">
                          {response.shortcut}
                        </code>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            response.active
                              ? "bg-green-500/80 text-white"
                              : "bg-gray-500/80 text-white"
                          }`}
                        >
                          {response.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-white/70 text-sm mb-3 whitespace-pre-wrap">
                        {response.content.length > 200
                          ? response.content.substring(0, 200) + "..."
                          : response.content}
                      </p>
                      <p className="text-white/50 text-xs">
                        Created by {response.creator?.name || "Unknown"}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(response)}
                        className="text-white hover:text-cyan-200 text-sm font-medium px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(response.id)}
                        className="text-red-200 hover:text-red-100 text-sm font-medium px-3 py-1 bg-red-500/20 rounded hover:bg-red-500/30 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/70">No canned responses yet. Create one to get started!</p>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              {editingResponse ? "Edit Response" : "Create Response"}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., Password Reset Instructions"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shortcut <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.shortcut}
                    onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                    placeholder="/password-reset"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Type this shortcut to quickly insert this response
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter the response template..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    rows={8}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
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
                    setEditingResponse(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
                >
                  {editingResponse ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
