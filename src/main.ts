import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './common/logger/logger.service';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  app.enableCors('*');

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
  SwaggerModule.setup(`/${prefix}/doc`, app, documentFactory);

  await app.listen(port, () => {
    logger.log(`Server running on port ${port}`);
    logger.log(`Swagger docs at ${host}/${prefix}/doc`);
  });
}
bootstrap();
