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
  | "tickets:activity";

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

export type TicketRealtimeEvent = TicketChangeEvent | TicketActivityEvent;

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

  const rooms = collectTicketRooms(event.ticket);
  realtime.to([...rooms]).emit(event.type, {
    ticket: event.ticket,
  });
}
