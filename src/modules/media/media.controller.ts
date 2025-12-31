import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateMediaDto } from './dto/create-media.dto';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '@config/authentication/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @ApiOperation({ summary: 'Upload media' })
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  create(@Body() _: CreateMediaDto, @UploadedFile() file: Express.Multer.File) {
    return this.mediaService.create(file);
  }

  
}
