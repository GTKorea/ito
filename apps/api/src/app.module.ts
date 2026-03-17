import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { TeamsModule } from './teams/teams.module';
import { TodosModule } from './todos/todos.module';
import { ThreadsModule } from './threads/threads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WsEventsModule } from './websocket/ws.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    TeamsModule,
    TodosModule,
    ThreadsModule,
    NotificationsModule,
    WsEventsModule,
  ],
})
export class AppModule {}
