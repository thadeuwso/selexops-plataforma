import { Module } from '@nestjs/common';
import { VagasController } from './vagas.controller';

@Module({
  controllers: [VagasController],
})
export class VagasModule {}
