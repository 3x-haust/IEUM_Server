import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { applyNestResponse } from '@3xhaust/nest-response';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const origins = config.get<string[]>('corsOrigins', []);
  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: origins.length ? origins : true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  applyNestResponse(app, { allExceptionsFilter: { exposeUnknownErrorMessages: config.get<string>('NODE_ENV') !== 'production' } });
  const swaggerConfig = new DocumentBuilder()
    .setTitle('IEUM API')
    .setDescription('IEUM backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json' });
  await app.listen(config.get<number>('port', 3000));
}

void bootstrap();
