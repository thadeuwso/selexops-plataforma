import { Module } from '@nestjs/common';
import { FuncionariosController } from './funcionarios.controller';

@Module({
  controllers: [FuncionariosController],
})
export class FuncionariosModule {}
