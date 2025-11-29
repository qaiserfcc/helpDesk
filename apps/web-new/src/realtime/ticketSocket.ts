import axios from "axios";
import { io, type Socket } from "socket.io-client";
import { env } from "@/config/env";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore, type AuthSession } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import type { Ticket, TicketActivityEntry } from "@/services/tickets";
import { describeTicketActivity } from "@/utils/ticketActivity";

type ServerToClientEvents = {
  "tickets:created": (payload: { ticket: Ticket }) => void;
  "tickets:updated": (payload: { ticket: Ticket }) => void;
  "tickets:activity": (payload: {
    ticketId: string;
    activity: TicketActivityEntry;
  }) => void;
  "tickets:ai:suggestion": (payload: { ticketId: string; suggestion: any }) => void;
};

let socket: Socket<ServerToClientEvents> | null = null;
let currentToken: string | null = null;

type RefreshResponse = {
  user: AuthSession["user"];
  tokens: { accessToken: string; refreshToken: string };
};

function getErrorMessage(error: unknown) {
  if (!error) {
    return "";
  }
  if (typeof error === "string") {
    return error;
  }
  if (
    typeof error === "object" &&
    error &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message?: string }).message ?? "";
  }
  return "";
}

function isAuthRelatedError(message: string) {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return (
    normalized.includes("invalid socket token") ||
    normalized.includes("socket token missing") ||
    normalized.includes("jwt expired") ||
    normalized.includes("invalid token")
  );
}

async function refreshSocketSession() {
  const store = useAuthStore.getState();
  const refreshToken = store.session?.refreshToken;
  if (!refreshToken) {
    return false;
  }

  try {
    const { data } = await axios.post<RefreshResponse>(
      `${env.apiUrl}/auth/refresh`,
      { refreshToken },
      { timeout: 10000 },
    );

    await store.applySession({
      user: data.user,
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    });
    return true;
  } catch (error) {
    console.warn(
      "Socket session refresh failed",
      getErrorMessage(error) || error,
    );
    await store.signOut();
    return false;
  }
}

function invalidateTicketLists(ticketId: string) {
  void queryClient.invalidateQueries({ queryKey: ["tickets"], exact: false });
  void queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
  void queryClient.invalidateQueries({
    queryKey: ["reports", "status-summary"],
  });
}

function invalidateTicketActivity(ticketId: string) {
  void queryClient.invalidateQueries({
    queryKey: ["ticket-activity", ticketId],
  });
  void queryClient.invalidateQueries({ queryKey: ["reports", "activity"] });
}

function pushActivityNotification(activity: TicketActivityEntry) {
  const store = useNotificationStore.getState();
  store.addNotification({
    id: activity.id,
    ticketId: activity.ticketId,
    actor: activity.actor.name,
    summary: describeTicketActivity(activity),
    createdAt: activity.createdAt,
    type: "activity",
  });
}

function attachListeners(instance: Socket<ServerToClientEvents>) {
  instance.on("tickets:created", ({ ticket }) => {
    invalidateTicketLists(ticket.id);
  });

  instance.on("tickets:updated", ({ ticket }) => {
    invalidateTicketLists(ticket.id);
  });

  instance.on("tickets:activity", ({ ticketId, activity }) => {
    invalidateTicketActivity(ticketId);
    if (activity) {
      pushActivityNotification(activity);
    }
  });

  instance.on("tickets:ai:suggestion", ({ ticketId }) => {
    invalidateTicketLists(ticketId);
    // invalidate cache for ticket-specific suggestions
    void queryClient.invalidateQueries({ queryKey: ["ai-suggestions", ticketId] });
  });

  instance.on("connect_error", (error) => {
    const message = getErrorMessage(error);
    console.warn("Realtime socket failed", message || error);
    // If the error is authentication related, attempt to refresh token and reconnect.
    if (isAuthRelatedError(message)) {
      void refreshSocketSession();
      return;
    }
    // For web, we can show a notification about realtime being unavailable
    const notificationStore = useNotificationStore.getState();
    notificationStore.addNotification({
      id: `realtime-offline-${Date.now()}`,
      ticketId: 'system',
      actor: "System",
      summary: "Realtime unavailable — updates will arrive via periodic refresh",
      createdAt: new Date().toISOString(),
      type: "activity",
    });
  });

  instance.on("disconnect", (reason) => {
    console.info("Realtime socket disconnected", reason);
  });

  instance.on('connect', () => {
    console.info('Realtime socket connected via', instance.io.engine.transport.name);
  });
}

function teardownSocket() {
  if (!socket) {
    return;
  }
  socket.removeAllListeners();
  if (socket.connected) {
    socket.disconnect();
  }
  socket = null;
  currentToken = null;
}

export function syncTicketSocketSession(accessToken: string | null) {
  if (!accessToken) {
    teardownSocket();
    return;
  }

  if (socket && currentToken === accessToken) {
    if (!socket.connected) {
      socket.connect();
    }
    return;
  }

  teardownSocket();

  const instance = io(env.apiBaseUrl, {
    transports: ["websocket", "polling"],
    // Pass a plain access token in the auth payload. The server handles
    // both raw tokens and tokens prefixed with 'Bearer '. Prefer the
    // plain token to avoid double-prefix issues and make logs clearer.
    auth: { token: accessToken },
    autoConnect: true,
  });

  socket = instance;
  currentToken = accessToken;
  console.info("Realtime: attempting to connect to", env.apiBaseUrl, "token set?", Boolean(accessToken));
  attachListeners(instance);
}

export function shutdownTicketSocket() {
  teardownSocket();
}

export const ticketSocket = {
  connect: (accessToken: string | null) => syncTicketSocketSession(accessToken),
  disconnect: () => shutdownTicketSocket(),
};