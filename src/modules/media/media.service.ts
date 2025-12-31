import { CloudinaryResult } from '@config/constants';
import { uploadBuffer } from '@config/helpers';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MediaNestedService } from './media.nested.service';

@Injectable()
export class MediaService {
  constructor(private readonly nested: MediaNestedService) {}

  async create(file: Express.Multer.File) {
    try {
      let uploadedFile: CloudinaryResult = await uploadBuffer(
        file.buffer,
        'media',
        file.mimetype
      );

      return this.nested.create(uploadedFile.secure_url, file.mimetype);
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException({
        message: error.message,
      });
    }
  }

}
