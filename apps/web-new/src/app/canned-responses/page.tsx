"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { CrudModal } from "@/components/CrudModal";
import {
  fetchCannedResponses,
  createCannedResponse,
  updateCannedResponse,
  deleteCannedResponse,
  type CannedResponse,
  type CreateCannedResponsePayload,
  type UpdateCannedResponsePayload,
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
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCannedResponsePayload }) =>
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
    // Pre-fill with test values for quick testing
    setFormData({
      title: "Test Response - Welcome Message",
      shortcut: "/welcome",
      content: "Thank you for contacting our support team. We have received your request and will respond within 24 hours. If you need urgent assistance, please call our helpline.",
      active: true,
    });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Canned Responses</h1>
            <p className="text-slate-400">Quick responses for faster ticket handling</p>
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
              + Create Response
            </button>
          </div>
        )}

        {showForm && (
          <CrudModal
            title={editingResponse ? "Edit Response" : "Create Response"}
            onClose={() => {
              setShowForm(false);
              setEditingResponse(null);
              resetForm();
            }}
            onSubmit={handleSubmit}
            submitLabel={editingResponse ? "Update" : "Create"}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            formId="response-form"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Password Reset Instructions"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shortcut <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.shortcut}
                onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                placeholder="/password-reset"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="mt-1 text-xs text-gray-500">
                Type this shortcut to quickly insert this response
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter the response template..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={6}
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
          <h2 className="text-xl font-semibold text-white mb-6">Saved Responses</h2>
          {isLoading ? (
            <p className="text-slate-400">Loading responses...</p>
          ) : responses && responses.length > 0 ? (
            <div className="space-y-4">
              {responses.map((response) => (
                <div
                  key={response.id}
                  className="bg-slate-700/50 backdrop-blur rounded-lg p-5 border border-slate-600 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{response.title}</h3>
                        <code className="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded font-mono">
                          {response.shortcut}
                        </code>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            response.active
                              ? "bg-green-600/20 text-green-400"
                              : "bg-slate-600/20 text-slate-400"
                          }`}
                        >
                          {response.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mb-3 whitespace-pre-wrap">
                        {response.content.length > 200
                          ? response.content.substring(0, 200) + "..."
                          : response.content}
                      </p>
                      <p className="text-slate-500 text-xs">
                        Created by {response.creator?.name || "Unknown"}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(response)}
                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(response.id)}
                        className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">No canned responses yet. Create one to get started!</p>
          )}
        </div>
      </div>
    </div>
  );
}
