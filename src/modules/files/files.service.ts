import { BadRequestException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FileAccessLevel, FileEntity, UserEntity } from '../../database/entities';

export interface UploadedFileInput {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FilesService {
  private readonly allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  private readonly maxImageSize = 5 * 1024 * 1024;

  constructor(
    @InjectRepository(FileEntity) private readonly files: Repository<FileEntity>,
    private readonly config: ConfigService
  ) {}

  async saveImage(file: UploadedFileInput | undefined, accessLevel: FileAccessLevel, user?: UserEntity): Promise<FileEntity> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    if (!this.allowedImageMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Only jpg, jpeg, png, and webp images are allowed');
    }
    if (file.size > this.maxImageSize) {
      throw new BadRequestException('Image must be 5MB or smaller');
    }
    const extension = this.extensionFor(file.mimetype);
    const id = uuidv4();
    const folder = accessLevel === FileAccessLevel.Public ? 'public' : 'private';
    const storageKey = `${folder}/${id}.${extension}`;
    const uploadRoot = this.config.get<string>('UPLOAD_DIR', 'uploads');
    const absolutePath = join(process.cwd(), uploadRoot, storageKey);
    await mkdir(join(process.cwd(), uploadRoot, folder), { recursive: true });
    await writeFile(absolutePath, file.buffer);
    const publicBase = this.config.get<string>('PUBLIC_FILE_BASE_URL', 'http://localhost:3000/files/public').replace(/\/$/, '');
    return this.files.save(this.files.create({
      id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storageKey,
      publicUrl: accessLevel === FileAccessLevel.Public ? `${publicBase}/${id}` : null,
      accessLevel,
      createdByUserId: user?.id ?? null
    }));
  }

  async findById(id: string): Promise<FileEntity> {
    const file = await this.files.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  async streamPublic(id: string): Promise<{ file: FileEntity; stream: StreamableFile }> {
    const file = await this.findById(id);
    if (file.accessLevel !== FileAccessLevel.Public) {
      throw new NotFoundException('File not found');
    }
    return { file, stream: this.stream(file) };
  }

  async streamPrivate(id: string): Promise<{ file: FileEntity; stream: StreamableFile }> {
    const file = await this.findById(id);
    return { file, stream: this.stream(file) };
  }

  toResponse(file: FileEntity) {
    return { id: file.id, originalName: file.originalName, mimeType: file.mimeType, size: file.size, publicUrl: file.publicUrl };
  }

  private stream(file: FileEntity): StreamableFile {
    const uploadRoot = this.config.get<string>('UPLOAD_DIR', 'uploads');
    return new StreamableFile(createReadStream(join(process.cwd(), uploadRoot, file.storageKey)), { type: file.mimeType, disposition: `inline; filename="${encodeURIComponent(file.originalName)}"` });
  }

  private extensionFor(mimeType: string): string {
    if (mimeType === 'image/png') {
      return 'png';
    }
    if (mimeType === 'image/webp') {
      return 'webp';
    }
    return 'jpg';
  }
}
