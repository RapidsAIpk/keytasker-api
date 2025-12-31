import { PrismaService } from '@modules/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaNestedService {
  constructor(private readonly prisma: PrismaService) {}

  create(secureUrl: string, mimetype: string) {
    return this.prisma.media.create({
      data: {
        fileType: mimetype,
        fileUrl: secureUrl,
      },
    });
  }
}
