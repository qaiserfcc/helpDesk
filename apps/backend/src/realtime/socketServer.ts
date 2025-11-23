import type { Server as HttpServer } from "http";
import createError from "http-errors";
import { Server, type DefaultEventsMap, type Socket } from "socket.io";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "../utils/token.js";
import { prisma } from "../lib/prisma.js";
import { logSocketFailure } from "../utils/socketLogger.js";

type SocketData = {
  user: Express.AuthenticatedUser;
};

type AuthedServer = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

type AuthedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;

let io: AuthedServer | null = null;

export function userRoom(userId: string) {
  return `user:${userId}`;
}

export function ticketRoom(ticketId: string) {
  return `ticket:${ticketId}`;
}

export function roleRoom(role: Role) {
  return `role:${role}`;
}

export const STAFF_ROOM = "tickets:staff";

async function authenticateSocket(socket: AuthedSocket) {
  const authValue = socket.handshake.auth?.token;
  const headerValue = socket.handshake.headers.authorization;
  const queryToken = socket.handshake.query.token;

  const clean = (value?: string) => {
    if (!value) {
      return undefined;
    }
    return value.startsWith("Bearer ") ? value.slice(7) : value;
  };

  const provided =
    typeof authValue === "string" && authValue ? clean(authValue) : undefined;

  const headerToken =
    typeof headerValue === "string" && headerValue
      ? clean(headerValue)
      : undefined;

  const queryParamToken =
    typeof queryToken === "string" && queryToken
      ? clean(queryToken)
      : undefined;

  const token = provided ?? headerToken ?? queryParamToken;

  if (!token) {
    throw createError(401, "Socket token missing");
  }

  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (createError.isHttpError(error)) {
      throw error;
    }
    throw createError(401, "Invalid socket token");
  }
  const userRecord = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!userRecord) {
    throw createError(401, "User not found");
  }

  socket.data.user = userRecord;
}

async function ensureTicketAccess(
  ticketId: string,
  user: Express.AuthenticatedUser,
) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, createdBy: true, assignedTo: true, status: true },
  });

  if (!ticket) {
    throw createError(404, "Ticket not found");
  }

  if (user.role === Role.user && ticket.createdBy !== user.id) {
    throw createError(403, "Unauthorized to watch this ticket");
  }

  return ticket;
}

export function getRealtimeServer() {
  return io;
}

export function initRealtimeServer(server: HttpServer) {
  if (io) {
    return io;
  }

  io = new Server(server, {
    cors: { origin: true, credentials: true },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket, next) => {
    try {
      await authenticateSocket(socket);
      next();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "unknown");
      console.error(
        "[socket] authentication error",
        message,
      );
      void logSocketFailure("auth", message, {
        socketId: socket.id,
        address: socket.handshake.address,
      });
      next(error instanceof Error ? error : new Error("Socket auth failed"));
    }
  });

  io.engine.on("connection_error", (error) => {
    const message =
      error instanceof Error ? error.message : String(error ?? "unknown");
    console.error("[socket] engine connection error", message);
    void logSocketFailure("connection", message, {
      code: (error as { code?: string }).code,
    });
  });

  io.on("connection", (socket) => {
    socket.on("error", (error) => {
      const message =
        error instanceof Error ? error.message : String(error ?? "unknown");
      console.error("[socket] runtime error", message);
      void logSocketFailure("runtime", message, {
        socketId: socket.id,
        userId: socket.data.user?.id,
      });
    });

    const user = socket.data.user;
    socket.join(userRoom(user.id));
    socket.join(roleRoom(user.role));

    if (user.role !== Role.user) {
      socket.join(STAFF_ROOM);
    }

    socket.on(
      "tickets:watch",
      async (
        ticketId: unknown,
        ack?: (response: { ok: boolean; error?: string }) => void,
      ) => {
        try {
          if (typeof ticketId !== "string" || !ticketId) {
            throw createError(400, "Invalid ticket id");
          }

          await ensureTicketAccess(ticketId, user);
          socket.join(ticketRoom(ticketId));
          ack?.({ ok: true });
        } catch (error) {
          const message = createError.isHttpError(error)
            ? error.message
            : "Unable to watch ticket";
          void logSocketFailure("tickets:watch", message, {
            socketId: socket.id,
            userId: user.id,
            ticketId,
          });
          ack?.({ ok: false, error: message });
        }
      },
    );

    socket.on("tickets:leave", (ticketId: unknown) => {
      if (typeof ticketId === "string" && ticketId) {
        socket.leave(ticketRoom(ticketId));
      }
    });
  });

  return io;
}
