import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('BizFlowBootstrap');
  const app = await NestFactory.create(AppModule);

  // Global Prefix
  const globalPrefix = 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  // Middleware
  app.use(cookieParser());

  // CORS Configuration
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (
        origin.includes('localhost') ||
        origin.includes('onrender.com') ||
        origin === process.env.WEB_APP_URL ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Organization-Id',
      'X-Branch-Id',
      'Idempotency-Key',
    ],
  });

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('BizFlow ERP — Core REST API')
    .setDescription(
      'Enterprise Resource Planning & Business Management API for BizFlow platform.'
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Organization-Id', in: 'header' }, 'X-Organization-Id')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`=======================================================`);
  logger.log(`BizFlow API successfully running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`Swagger OpenAPI Documentation:      http://localhost:${port}/api/docs`);
  logger.log(`=======================================================`);
}

bootstrap();
