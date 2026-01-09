import { AppModule } from './modules/app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/');

  const config = new DocumentBuilder()
    .addBearerAuth()
    .setTitle('Keytasker API')
    .setDescription('Microtask Platform REST APIs Documentation')
    .setVersion('1.0')
    .addTag('App')
    .addTag('auth')
    .addTag('user')
    .addTag('admin')
    .addTag('media')
    .addTag('tasks')
    .addTag('submissions')
    .addTag('campaigns')
    .addTag('moderation')
    .addTag('payments')
    .addTag('support')
    .addTag('notifications')
    .addTag('ideas')
    .addTag('settings')
    .addTag('analytics')
    
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalPipes(new ValidationPipe());

  app.enableCors();
  await app.listen(process.env.PORT || 6900);

  console.warn(`App is listening on port: 6900`);
}
bootstrap();
