import { Module } from '@nestjs/common';
import { AvaliacaoComportamentalController } from './avaliacao-comportamental.controller';
import { BancoPerguntasController } from './banco-perguntas.controller';
import { AvaliacaoComportamentalPublicoController } from './avaliacao-comportamental-publico.controller';
import { PerfilComportamentalController } from './perfil-comportamental.controller';
import { PerfilComportamentalPadraoController } from './perfil-comportamental-padrao.controller';
import { PdiController } from './pdi.controller';
import { FeedbackController } from './feedback.controller';
import { AvaliacaoDesempenhoController } from './avaliacao-desempenho.controller';
import { AderenciaController } from './aderencia.controller';
import { Colaborador360Controller } from './colaborador-360.controller';
import { Avaliacao360Controller } from './avaliacao-360.controller';

@Module({
  controllers: [
    PerfilComportamentalController,
    BancoPerguntasController,
    PerfilComportamentalPadraoController,
    AvaliacaoComportamentalController,
    AvaliacaoComportamentalPublicoController,
    PdiController,
    FeedbackController,
    AvaliacaoDesempenhoController,
    AderenciaController,
    Colaborador360Controller,
    Avaliacao360Controller,
  ],
})
export class GestaoPessoasModule {}
