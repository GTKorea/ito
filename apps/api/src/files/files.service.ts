import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join, extname } from 'path';

const UPLOADS_DIR = join(process.cwd(), 'uploads');
const AVATARS_DIR = join(UPLOADS_DIR, 'avatars');
const LOGOS_DIR = join(UPLOADS_DIR, 'logos');

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async upload(
    file: Express.Multer.File,
    uploaderId: string,
    taskId?: string,
    threadLinkId?: string,
  ) {
    await mkdir(UPLOADS_DIR, { recursive: true });

    // Multer encodes originalname as latin1; decode to UTF-8 for non-ASCII filenames
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = extname(originalName);
    const filename = `${randomUUID()}${ext}`;
    const filepath = join(UPLOADS_DIR, filename);

    await writeFile(filepath, file.buffer);

    return this.prisma.file.create({
      data: {
        filename: originalName,
        url: `/uploads/${filename}`,
        size: file.size,
        mimeType: file.mimetype,
        uploaderId,
        ...(taskId ? { taskId } : {}),
        ...(threadLinkId ? { threadLinkId } : {}),
      },
    });
  }

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    await mkdir(AVATARS_DIR, { recursive: true });

    const ext = extname(file.originalname);
    const filename = `${userId}${ext}`;
    const filepath = join(AVATARS_DIR, filename);

    await writeFile(filepath, file.buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return { avatarUrl };
  }

  async uploadWorkspaceLogo(file: Express.Multer.File, workspaceId: string, userId: string) {
    // Verify OWNER/ADMIN permission
    const member = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenException('Only workspace owners and admins can upload a logo');
    }

    await mkdir(LOGOS_DIR, { recursive: true });

    const ext = extname(file.originalname);
    const filename = `${workspaceId}${ext}`;
    const filepath = join(LOGOS_DIR, filename);

    await writeFile(filepath, file.buffer);

    const avatarUrl = `/uploads/logos/${filename}`;

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { avatarUrl },
    });

    return { avatarUrl };
  }

  async findById(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async findByTask(taskId: string) {
    return this.prisma.file.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string, userId: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    if (file.uploaderId !== userId) {
      throw new ForbiddenException('Only the uploader can delete this file');
    }

    // Delete from disk
    const filepath = join(process.cwd(), file.url);
    try {
      await unlink(filepath);
    } catch {
      // File may not exist on disk
    }

    return this.prisma.file.delete({ where: { id } });
  }
}
