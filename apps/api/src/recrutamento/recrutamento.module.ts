import { Module } from '@nestjs/common';
import { FuncionariosModule } from '../core/funcionarios/funcionarios.module';
import { CandidatosController } from './candidatos.controller';
import { CurriculosController } from './curriculos.controller';
import { IaVagasController } from './ia-vagas.controller';
import { VagasController } from './vagas.controller';

@Module({
  imports: [FuncionariosModule], // RN-REC-007: hired -> admissão via FuncionariosService do Core
  controllers: [VagasController, CandidatosController, IaVagasController, CurriculosController],
})
export class RecrutamentoModule {}
