import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation — transforms payloads to DTO instances, strips unknown properties
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,            // Strip properties not in DTO
    forbidNonWhitelisted: false, // Don't throw on extra props, just strip them
    transform: true,            // Auto-transform payloads to DTO class instances
  }));

  // Enable CORS for frontend
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Backend listening on port ${port}`);
}
bootstrap();
