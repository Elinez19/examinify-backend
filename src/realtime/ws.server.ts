import { IncomingMessage, Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../config/auth.config";
import { logger } from "../utils/logger";

interface SocketMeta {
  userId: string;
  role: string;
  examId: string | null;
}

class RealtimeGateway {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, SocketMeta>();
  private examRooms = new Map<string, Set<WebSocket>>();
  private clockTimer: NodeJS.Timeout | null = null;

  init(server: Server): void {
    this.wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", async (req: IncomingMessage, socket, head) => {
      try {
        const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
        if (url.pathname !== "/ws") {
          socket.destroy();
          return;
        }

        const sessionData = await auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
        });

        if (!sessionData?.user) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }

        const examId = url.searchParams.get("examId");

        this.wss!.handleUpgrade(req, socket, head, (ws) => {
          const meta: SocketMeta = {
            userId: sessionData.user.id,
            role: String((sessionData.user as { role?: string }).role ?? "student"),
            examId,
          };
          this.registerClient(ws, meta);
          this.wss!.emit("connection", ws, req);
        });
      } catch (error) {
        logger.error("WebSocket upgrade failed", { error: (error as Error).message });
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      }
    });

    // Broadcast server clock tick every 30s to keep live CBT countdowns synchronized
    this.clockTimer = setInterval(() => {
      const payload = JSON.stringify({
        type: "timer:sync",
        serverTime: new Date().toISOString(),
      });
      for (const ws of this.clients.keys()) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(payload);
        }
      }
    }, 30_000);
    this.clockTimer.unref();
  }

  private registerClient(ws: WebSocket, meta: SocketMeta): void {
    this.clients.set(ws, meta);
    if (meta.examId) {
      let room = this.examRooms.get(meta.examId);
      if (!room) {
        room = new Set<WebSocket>();
        this.examRooms.set(meta.examId, room);
      }
      room.add(ws);
    }

    ws.send(
      JSON.stringify({
        type: "connected",
        serverTime: new Date().toISOString(),
        examId: meta.examId,
      })
    );

    ws.on("close", () => {
      this.clients.delete(ws);
      if (meta.examId) {
        const room = this.examRooms.get(meta.examId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            this.examRooms.delete(meta.examId);
          }
        }
      }
    });
  }

  broadcastToExamMonitors(examId: string, event: Record<string, unknown>): void {
    const room = this.examRooms.get(examId);
    if (!room) return;

    const payload = JSON.stringify({ ...event, serverTime: new Date().toISOString() });
    for (const ws of room) {
      const meta = this.clients.get(ws);
      if (!meta || meta.role === "student") continue;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  notifyStudentInExam(examId: string, userId: string, event: Record<string, unknown>): void {
    const room = this.examRooms.get(examId);
    if (!room) return;

    const payload = JSON.stringify({ ...event, serverTime: new Date().toISOString() });
    for (const ws of room) {
      const meta = this.clients.get(ws);
      if (meta?.userId === userId && ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  async close(): Promise<void> {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    if (!this.wss) return;
    for (const ws of this.clients.keys()) {
      ws.close(1001, "Server shutting down");
    }
    this.clients.clear();
    this.examRooms.clear();
    await new Promise<void>((resolve) => {
      this.wss!.close(() => resolve());
    });
    this.wss = null;
  }
}

export const realtimeGateway = new RealtimeGateway();
