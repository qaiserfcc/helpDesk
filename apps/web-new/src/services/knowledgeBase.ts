import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  summary?: string;
  categoryId?: string;
  tags: string[];
  published: boolean;
  views: number;
  helpful: number;
  notHelpful: number;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  category?: any;
  author?: { id: string; name: string; email: string };
}

export interface CreateKnowledgeArticlePayload {
  title: string;
  content: string;
  summary?: string;
  categoryId?: string;
  tags?: string[];
  published?: boolean;
}

export interface UpdateKnowledgeArticlePayload {
  title?: string;
  content?: string;
  summary?: string;
  categoryId?: string;
  tags?: string[];
  published?: boolean;
}

export async function fetchKnowledgeArticles(
  published?: boolean,
  categoryId?: string,
  searchTerm?: string
): Promise<KnowledgeArticle[]> {
  const { data } = await axios.get(`${API_BASE_URL}/api/knowledge-base`, {
    params: { published, categoryId, search: searchTerm },
  });
  return data.articles;
}

export async function searchKnowledgeBase(query: string, limit = 10): Promise<KnowledgeArticle[]> {
  const { data } = await axios.get(`${API_BASE_URL}/api/knowledge-base/search`, {
    params: { q: query, limit },
  });
  return data.articles;
}

export async function fetchKnowledgeArticle(id: string): Promise<KnowledgeArticle> {
  const { data } = await axios.get(`${API_BASE_URL}/api/knowledge-base/${id}`);
  return data.article;
}

export async function createKnowledgeArticle(payload: CreateKnowledgeArticlePayload): Promise<KnowledgeArticle> {
  const { data } = await axios.post(`${API_BASE_URL}/api/knowledge-base`, payload);
  return data.article;
}

export async function updateKnowledgeArticle(id: string, payload: UpdateKnowledgeArticlePayload): Promise<KnowledgeArticle> {
  const { data } = await axios.patch(`${API_BASE_URL}/api/knowledge-base/${id}`, payload);
  return data.article;
}

export async function deleteKnowledgeArticle(id: string): Promise<void> {
  await axios.delete(`${API_BASE_URL}/api/knowledge-base/${id}`);
}

export async function rateArticle(id: string, helpful: boolean): Promise<KnowledgeArticle> {
  const { data } = await axios.post(`${API_BASE_URL}/api/knowledge-base/${id}/rate`, { helpful });
  return data.article;
}
