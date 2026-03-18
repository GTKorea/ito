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

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async upload(
    file: Express.Multer.File,
    uploaderId: string,
    todoId?: string,
    threadLinkId?: string,
  ) {
    await mkdir(UPLOADS_DIR, { recursive: true });

    const ext = extname(file.originalname);
    const filename = `${randomUUID()}${ext}`;
    const filepath = join(UPLOADS_DIR, filename);

    await writeFile(filepath, file.buffer);

    return this.prisma.file.create({
      data: {
        filename: file.originalname,
        url: `/uploads/${filename}`,
        size: file.size,
        mimeType: file.mimetype,
        uploaderId,
        ...(todoId ? { todoId } : {}),
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

  async findById(id: string) {
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async findByTodo(todoId: string) {
    return this.prisma.file.findMany({
      where: { todoId },
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
