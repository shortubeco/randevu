import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  // cPanel'de uygulama bir proxy arkasında çalışır; gerçek istemci IP'si için gerekli (istek sınırı).
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Web paneli farklı bir alan adında (panel.sozcutvcanli.com) çalışır.
  // Kimlik Bearer token ile taşındığı için çerez/credentials gerekmez.
  const origins = (process.env.CORS_ORIGINS ?? 'https://panel.sozcutvcanli.com,http://localhost:5173')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({ origin: origins, methods: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // cPanel Node.js App, uygulamaya PORT ortam değişkeni atar.
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
