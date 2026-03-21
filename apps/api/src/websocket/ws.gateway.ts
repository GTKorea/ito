import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      const allowed = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
        : [];
      if (allowed.includes(origin)) return callback(null, true);
      if (origin.startsWith('tauri://') || origin.startsWith('https://tauri.')) {
        return callback(null, true);
      }
      if (allowed.length === 0) return callback(null, true);
      callback(null, false);
    },
    credentials: true,
  },
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET', 'dev-secret'),
      });

      // Join personal room for targeted notifications
      client.join(`user:${payload.sub}`);
      client.data.userId = payload.sub;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup handled automatically by Socket.IO
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server?.to(`user:${userId}`).emit(event, data);
  }
}
