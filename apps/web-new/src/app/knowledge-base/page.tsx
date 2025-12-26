"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  fetchKnowledgeArticles,
  createKnowledgeArticle,
  updateKnowledgeArticle,
  deleteKnowledgeArticle,
  searchKnowledgeBase,
  type KnowledgeArticle,
  type CreateKnowledgeArticlePayload,
  type UpdateKnowledgeArticlePayload,
} from "@/services/knowledgeBase";

export default function KnowledgeBasePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.session?.user);
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KnowledgeArticle | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<CreateKnowledgeArticlePayload>({
    title: "",
    content: "",
    summary: "",
    tags: [],
    published: false,
  });

  const { data: articles, isLoading } = useQuery({
    queryKey: ["knowledge-articles", searchTerm],
    queryFn: () => searchTerm ? searchKnowledgeBase(searchTerm) : fetchKnowledgeArticles(),
  });

  const createMutation = useMutation({
    mutationFn: createKnowledgeArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateKnowledgeArticlePayload }) =>
      updateKnowledgeArticle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
      setShowForm(false);
      setEditingArticle(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteKnowledgeArticle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-articles"] });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      summary: "",
      tags: [],
      published: false,
    });
  };

  const handleCreate = () => {
    setEditingArticle(null);
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (article: KnowledgeArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      summary: article.summary || "",
      tags: article.tags,
      published: article.published,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingArticle) {
      updateMutation.mutate({ id: editingArticle.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (!user) {
    router.push("/login");
    return null;
  }

  const canEdit = user.role === "admin" || user.role === "agent";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Knowledge Base</h1>
            <p className="text-blue-200">Find answers and helpful articles</p>
          </div>
          {canEdit && (
            <button
              onClick={handleCreate}
              className="bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
            >
              + Create Article
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search articles..."
            className="w-full px-4 py-3 rounded-lg border-2 border-white/30 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:border-white/50 backdrop-blur-sm"
          />
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          {isLoading ? (
            <p className="text-white/70">Loading articles...</p>
          ) : articles && articles.length > 0 ? (
            <div className="space-y-4">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white/20 backdrop-blur rounded-lg p-5 border border-white/30 hover:bg-white/30 transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{article.title}</h3>
                        {article.published ? (
                          <span className="px-2 py-1 bg-green-500/80 text-white text-xs rounded">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-500/80 text-white text-xs rounded">
                            Draft
                          </span>
                        )}
                      </div>
                      {article.summary && (
                        <p className="text-white/70 text-sm mb-3">{article.summary}</p>
                      )}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {article.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-500/30 text-blue-100 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-white/60 text-sm">
                        <span>👁️ {article.views} views</span>
                        <span>👍 {article.helpful}</span>
                        <span>👎 {article.notHelpful}</span>
                        <span>By {article.author?.name || "Unknown"}</span>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(article)}
                          className="text-white hover:text-blue-200 text-sm font-medium px-3 py-1 bg-white/10 rounded hover:bg-white/20 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(article.id)}
                          className="text-red-200 hover:text-red-100 text-sm font-medium px-3 py-1 bg-red-500/20 rounded hover:bg-red-500/30 transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/70">
              {searchTerm ? "No articles found matching your search." : "No articles yet. Create one to get started!"}
            </p>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full my-8 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              {editingArticle ? "Edit Article" : "Create Article"}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                  <input
                    type="text"
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    rows={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags?.join(", ")}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                      })
                    }
                    placeholder="troubleshooting, network, vpn"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="published" className="ml-2 text-sm font-medium text-gray-700">
                    Publish immediately
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingArticle(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingArticle ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
