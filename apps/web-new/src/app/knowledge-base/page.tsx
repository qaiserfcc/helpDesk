"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { CrudModal } from "@/components/CrudModal";
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
    // Pre-fill with test values for quick testing
    setFormData({
      title: "Test Article - How to Reset Password",
      content: "This article explains the step-by-step process for resetting your password.\n\n1. Click on 'Forgot Password'\n2. Enter your email address\n3. Check your email for reset link\n4. Follow the instructions",
      summary: "Quick guide to reset your account password",
      tags: ["password", "account", "security"],
      published: false,
    });
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Knowledge Base</h1>
            <p className="text-slate-400">Find answers and helpful articles</p>
          </div>
          <button
            onClick={() => router.push("/tickets")}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Back to Tickets
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search articles..."
            className="w-full px-4 py-3 rounded-lg border-2 border-slate-600 bg-slate-800/50 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 backdrop-blur-sm"
          />
        </div>

        {canEdit && !showForm && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              + Create Article
            </button>
          </div>
        )}

        {showForm && (
          <CrudModal
            title={editingArticle ? "Edit Article" : "Create Article"}
            onClose={() => {
              setShowForm(false);
              setEditingArticle(null);
              resetForm();
            }}
            onSubmit={handleSubmit}
            submitLabel={editingArticle ? "Update" : "Create"}
            isSubmitting={createMutation.isPending || updateMutation.isPending}
            formId="article-form"
          >
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Summary</label>
              <input
                type="text"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={8}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center md:col-span-2">
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
          </CrudModal>
        )}

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          {isLoading ? (
            <p className="text-slate-400">Loading articles...</p>
          ) : articles && articles.length > 0 ? (
            <div className="space-y-4">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="bg-slate-700/50 backdrop-blur rounded-lg p-5 border border-slate-600 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-white">{article.title}</h3>
                        {article.published ? (
                          <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded font-medium">
                            Published
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded font-medium">
                            Draft
                          </span>
                        )}
                      </div>
                      {article.summary && (
                        <p className="text-slate-400 text-sm mb-3">{article.summary}</p>
                      )}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {article.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-slate-400 text-sm">
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
                          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(article.id)}
                          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
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
            <p className="text-slate-400">
              {searchTerm ? "No articles found matching your search." : "No articles yet. Create one to get started!"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
