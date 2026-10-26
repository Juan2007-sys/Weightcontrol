import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Las evidencias fotográficas viajan en base64; el límite por defecto (100 KB) las rechazaba.
    bodyParser: true,
  });
  app.useBodyParser('json', { limit: '25mb' });
  app.useBodyParser('urlencoded', { limit: '25mb', extended: true });

  // Detras de un proxy/balanceador (Render, Nginx...) req.ip seria la IP del proxy y el
  // limite de login (S2) bloquearia a todos juntos. TRUST_PROXY: numero de saltos
  // (p. ej. 1), lista de IPs/subredes de confianza, o vacio/"false" para desactivarlo.
  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (trustProxy && trustProxy !== 'false') {
    app.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy);
    logger.log(`trust proxy = ${trustProxy}`);
  }

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);
}
await bootstrap();
