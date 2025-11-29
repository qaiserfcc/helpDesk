import axios from "axios";
import createError from "http-errors";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { publishTicketEvent } from "../realtime/ticketPublisher.js";
import type { TicketWithRelations } from "./ticketService.js";

type AISuggestion = {
  id: string;
  ticketId?: string;
  suggestionType: string;
  prompt: string;
  result: any;
  provider?: string;
  providerMeta?: any;
  createdBy?: string;
};

async function callOpenAIChat(messages: { role: string; content: string }[], maxTokens = 256) {
  const model = env.AI_DEFAULT_MODEL ?? "gpt-3.5-turbo";
  if (!env.AI_API_KEY) {
    throw new Error("AI_API_KEY not configured");
  }
  const url = `https://api.openai.com/v1/chat/completions`;
  const body = { model, messages, max_tokens: maxTokens, temperature: 0.2 };
  const resp = await axios.post(url, body, {
    headers: { Authorization: `Bearer ${env.AI_API_KEY}` },
    timeout: 20_000,
  });
  return resp.data;
}

async function callLLM(text: string) {
  if (env.AI_PROVIDER === "openai" && env.AI_API_KEY) {
    const messages = [{ role: "system", content: "You are a helpful customer support assistant." }, { role: "user", content: text }];
    const data = await callOpenAIChat(messages, 256);
    const content = data?.choices?.[0]?.message?.content ?? null;
    return { content, providerMeta: data?.usage ?? null, provider: "openai" };
  }
  // Fallback mock implementation for local dev
  return {
    content: `Draft reply: Thanks for your message. We'll review your ticket and get back to you with next steps. (PoC generated)`,
    provider: "local-mock",
    providerMeta: { mock: true },
  };
}

export async function suggestReplyForTicket(ticket: TicketWithRelations, userId?: string) {
  if (!ticket) throw createError(400, "Ticket required");

  const prompt = `Please write a short reply (1-3 sentences) for this ticket. Include a possible next step and a question if more info is needed.\n---\nTicket: ${ticket.id}\nDescription: ${ticket.description}\n---`;

  const result = await callLLM(prompt);
  let suggestion: any = null;
  try {
    suggestion = await prisma.aiSuggestion.create({
      data: {
        ticketId: ticket.id,
        suggestionType: "reply",
        prompt,
        result: { text: result.content },
        provider: result.provider,
        providerMeta: result.providerMeta,
        createdBy: userId ?? null,
      },
    });
  } catch (err: any) {
    // if migrations haven't run, prisma client may not expose aiSuggestion. Just log and return a minimal suggestion
    console.warn("Failed to persist aiSuggestion (check prisma migrations):", err?.message ?? err);
    suggestion = {
      id: "local-suggestion",
      ticketId: ticket.id,
      suggestionType: "reply",
      prompt,
      result: { text: result.content },
      provider: result.provider,
      providerMeta: result.providerMeta,
      createdBy: userId ?? null,
    };
  }

  publishTicketEvent({ type: "tickets:ai:suggestion", ticketId: ticket.id, suggestion: suggestion as any });
  return suggestion as AISuggestion;
}

export async function summarizeTicket(ticket: TicketWithRelations, userId?: string) {
  if (!ticket) throw createError(400, "Ticket required");

  const prompt = `Give a short (<=30 words) summary of this ticket and the main action items.\n\nDescription: ${ticket.description}`;
  const result = await callLLM(prompt);
  let suggestion: any = null;
  try {
    suggestion = await prisma.aiSuggestion.create({
    data: {
      ticketId: ticket.id,
      suggestionType: "summary",
      prompt,
      result: { text: result.content },
      provider: result.provider,
      providerMeta: result.providerMeta,
      createdBy: userId ?? null,
    },
  });
  } catch (err: any) {
    console.warn("Failed to persist aiSuggestion (summary):", err?.message ?? err);
    suggestion = {
      id: "local-summary",
      ticketId: ticket.id,
      suggestionType: "summary",
      prompt,
      result: { text: result.content },
      provider: result.provider,
      providerMeta: result.providerMeta,
      createdBy: userId ?? null,
    };
  }

  publishTicketEvent({ type: "tickets:ai:suggestion", ticketId: ticket.id, suggestion: suggestion as any });
  return suggestion as AISuggestion;
}

export async function classifyTicket(ticket: TicketWithRelations, userId?: string) {
  if (!ticket) throw createError(400, "Ticket required");
  const prompt = `Given this ticket description, provide a short list of comma separated tags that describe the issue (e.g., 'billing, account, password'): ${ticket.description}`;
  const result = await callLLM(prompt);
  const tags = (result.content ?? "").split(/[\,\n]+/).map((t: string) => t.trim()).filter(Boolean);
  let suggestion: any = null;
  try {
    suggestion = await prisma.aiSuggestion.create({
    data: {
      ticketId: ticket.id,
      suggestionType: "classification",
      prompt,
      result: { tags },
      provider: result.provider,
      providerMeta: result.providerMeta,
      createdBy: userId ?? null,
    },
  });
  } catch (err: any) {
    console.warn("Failed to persist aiSuggestion (classification):", err?.message ?? err);
    suggestion = {
      id: "local-classification",
      ticketId: ticket.id,
      suggestionType: "classification",
      prompt,
      result: { tags },
      provider: result.provider,
      providerMeta: result.providerMeta,
      createdBy: userId ?? null,
    };
  }
  publishTicketEvent({ type: "tickets:ai:suggestion", ticketId: ticket.id, suggestion: suggestion as any });
  return suggestion as AISuggestion;
}

export async function getSuggestionsForTicket(ticketId: string) {
  return prisma.aiSuggestion.findMany({ where: { ticketId }, orderBy: { createdAt: "desc" }, take: 10 });
}

export default {
  suggestReplyForTicket,
  summarizeTicket,
  classifyTicket,
  getSuggestionsForTicket,
};
