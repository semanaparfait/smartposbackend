// Must come first so errors everywhere are caught.
import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './common/logger/logger.service';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import {
  corsOrigin,
  isProduction,
  missingOriginsWarning,
} from './common/security/security';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind a host's proxy, the visitor's real address is in X-Forwarded-For;
  // request limits count by it. TRUST_PROXY = how many proxies (0 = none).
  const proxies = Number(process.env.TRUST_PROXY ?? (isProduction() ? 1 : 0));
  if (proxies > 0) app.set('trust proxy', proxies);
  app.disable('x-powered-by');

  // Safe default headers. The API only sends JSON; images live on Cloudinary.
  app.use(
    helmet({
      // Swagger (development only) needs its own scripts.
      contentSecurityPolicy: isProduction() ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);

  const port: number = Number(configService.get<number>('server.port'));
  const prefix: string = String(configService.get<string>('server.prefix'));
  const host: string = String(configService.get<string>('server.host'));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // enables class-transformer @Transform
      whitelist: true, // strips properties not in DTO
      forbidNonWhitelisted: true, // optional: throw error if extra props
    }),
  );

  app.setGlobalPrefix(prefix);

  // Replies are gzipped: order lists shrink to a fraction over slow connections.
  app.use(compression());

  // Only the websites in CORS_ORIGINS may call the API from a browser.
  // X-Permissions-Version is exposed so they can read it (see RolesGuard).
  app.enableCors({
    origin: corsOrigin,
    // The website's sign-in cookie (see refresh-cookie.ts).
    credentials: true,
    exposedHeaders: ['X-Permissions-Version'],
  });

  // app.enableCors({
  //   origin: true,
  //   credentials: true,
  //   // exposedHeaders: ['set-cookie'],
  // });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Smart POS')
    .setDescription('Smart POS API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  // The API documentation lists every route: development only, unless
  // SWAGGER=on is set on purpose.
  const docs = !isProduction() || process.env.SWAGGER === 'on';
  if (docs) SwaggerModule.setup(`/${prefix}/doc`, app, documentFactory);

  const warning = missingOriginsWarning();

  await app.listen(port, () => {
    logger.log(`Server running on port ${port}`);
    if (docs) logger.log(`Swagger docs at ${host}/${prefix}/doc`);
    if (warning) logger.warn(warning);
  });
}
bootstrap();
