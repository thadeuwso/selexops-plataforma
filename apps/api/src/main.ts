import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const porta = Number(process.env.API_PORT ?? 3001);
  await app.listen(porta);
  console.log(`SelX API ouvindo em http://localhost:${porta}`);
}

void bootstrap();
