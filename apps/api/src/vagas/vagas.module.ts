import { Module } from '@nestjs/common';
import { CandidatosController } from './candidatos.controller';
import { VagasController } from './vagas.controller';

@Module({
  controllers: [VagasController, CandidatosController],
})
export class VagasModule {}
