import { Module } from '@nestjs/common';
import { AssinaturasPublicasController } from './assinaturas-publicas.controller';
import { DocumentosController } from './documentos.controller';

@Module({
  controllers: [DocumentosController, AssinaturasPublicasController],
})
export class DocumentosModule {}
