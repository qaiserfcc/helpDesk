import { Role } from "@prisma/client";
import type {
  TicketActivityEntry,
  TicketWithRelations,
} from "../services/ticketService.js";
import {
  STAFF_ROOM,
  getRealtimeServer,
  roleRoom,
  ticketRoom,
  userRoom,
} from "./socketServer.js";

export type TicketRealtimeEventName =
  | "tickets:created"
  | "tickets:updated"
  | "tickets:activity"
  | "tickets:ai:suggestion";

type TicketAudience = {
  id: string;
  createdBy: string;
  assignedTo: string | null;
};

type TicketChangeEvent = {
  type: Extract<TicketRealtimeEventName, "tickets:created" | "tickets:updated">;
  ticket: TicketWithRelations;
};

type TicketActivityEvent = {
  type: Extract<TicketRealtimeEventName, "tickets:activity">;
  ticketId: string;
  activity: TicketActivityEntry;
  audience?: TicketAudience | null;
};

type TicketAISuggestionEvent = {
  type: "tickets:ai:suggestion";
  ticketId: string;
  suggestion: any;
};

export type TicketRealtimeEvent = TicketChangeEvent | TicketActivityEvent | TicketAISuggestionEvent;

function collectTicketRooms(ticket: TicketAudience) {
  const rooms = new Set<string>();
  rooms.add(ticketRoom(ticket.id));
  rooms.add(userRoom(ticket.createdBy));

  if (ticket.assignedTo) {
    rooms.add(userRoom(ticket.assignedTo));
  }

  rooms.add(roleRoom(Role.admin));
  rooms.add(roleRoom(Role.agent));
  rooms.add(STAFF_ROOM);

  return rooms;
}

export function publishTicketEvent(event: TicketRealtimeEvent) {
  const realtime = getRealtimeServer();
  if (!realtime) {
    return;
  }

  if (event.type === "tickets:activity") {
    const rooms = new Set<string>();
    rooms.add(ticketRoom(event.ticketId));
    if (event.audience) {
      collectTicketRooms(event.audience).forEach((room) => rooms.add(room));
    } else {
      rooms.add(roleRoom(Role.admin));
      rooms.add(roleRoom(Role.agent));
      rooms.add(STAFF_ROOM);
    }
    realtime.to([...rooms]).emit(event.type, {
      ticketId: event.ticketId,
      activity: event.activity,
    });
    return;
  }

  if (event.type === "tickets:ai:suggestion") {
    const rooms = new Set<string>();
    rooms.add(ticketRoom(event.ticketId));
    rooms.add(roleRoom(Role.admin));
    rooms.add(roleRoom(Role.agent));
    rooms.add(STAFF_ROOM);
    realtime.to([...rooms]).emit(event.type, {
      ticketId: event.ticketId,
      suggestion: event.suggestion,
    });
    return;
  }

  const rooms = collectTicketRooms(event.ticket);
  realtime.to([...rooms]).emit(event.type, {
    ticket: event.ticket,
  });
}
