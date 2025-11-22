import { io, type Socket } from "socket.io-client";
import { env } from "@/config/env";
import { queryClient } from "@/lib/queryClient";
import type { Ticket, TicketActivityEntry } from "@/services/tickets";

type ServerToClientEvents = {
  "tickets:created": (payload: { ticket: Ticket }) => void;
  "tickets:updated": (payload: { ticket: Ticket }) => void;
  "tickets:activity": (payload: {
    ticketId: string;
    activity: TicketActivityEntry;
  }) => void;
};

let socket: Socket<ServerToClientEvents> | null = null;
let currentToken: string | null = null;

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

function attachListeners(instance: Socket<ServerToClientEvents>) {
  instance.on("tickets:created", ({ ticket }) => {
    invalidateTicketLists(ticket.id);
  });

  instance.on("tickets:updated", ({ ticket }) => {
    invalidateTicketLists(ticket.id);
  });

  instance.on("tickets:activity", ({ ticketId }) => {
    invalidateTicketActivity(ticketId);
  });

  instance.on("connect_error", (error) => {
    console.warn("Realtime socket failed", error?.message ?? error);
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
    transports: ["websocket"],
    auth: { token: `Bearer ${accessToken}` },
  });

  socket = instance;
  currentToken = accessToken;
  attachListeners(instance);
}

export function shutdownTicketSocket() {
  teardownSocket();
}
