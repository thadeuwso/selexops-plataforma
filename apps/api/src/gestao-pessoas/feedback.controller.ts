import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';

const TIPOS = ['POSITIVO', 'CONSTRUTIVO', 'NEUTRO'] as const;
const CONTEXTOS = ['RECONHECIMENTO', 'MELHORIA', 'ACOMPANHAMENTO', 'OUTRO'] as const;

const esquemaFeedback = z.object({
  codFun: z.coerce.bigint(),
  mensagem: z.string().min(2).max(4000),
  tipo: z.enum(TIPOS).default('NEUTRO'),
  contexto: z.enum(CONTEXTOS).default('ACOMPANHAMENTO'),
  codPdi: z.coerce.bigint().optional(),
});

function validar<T extends z.ZodTypeAny>(esquema: T, corpo: unknown): z.infer<T> {
  try {
    return esquema.parse(corpo);
  } catch (erro) {
    if (erro instanceof ZodError) {
      throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
    }
    throw erro;
  }
}

type ReqAut = Request & { usuario: UsuarioAutenticado };

/**
 * Feedback contínuo ao funcionário (RN-GP-021).
 *
 * Retorno ao longo do tempo, não o evento anual de avaliação. **Imutável por
 * desenho**: não há rota de editar nem apagar. Feedback é o que a pessoa de
 * fato recebeu; reescrevê-lo depois apagaria o registro real. Corrigir é dar
 * outro feedback, não reescrever o anterior.
 */
@Controller('gestao-pessoas/feedbacks')
export class FeedbackController {
  constructor(private readonly prisma: PrismaService) {}

  /** Feedbacks de um funcionário, do mais recente ao mais antigo. */
  @Get()
  @Permissoes('gestaopessoas.avaliacoes.ler')
  listar(@Req() req: ReqAut, @Query('codFun') codFun?: string) {
    if (!codFun) throw new BadRequestException('Informe o funcionário (codFun)');
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.feedback.findMany({
        where: { codFun: BigInt(codFun) },
        orderBy: { codFeed: 'desc' },
        include: {
          autor: { select: { nomeUsu: true } },
          plano: { select: { codPdi: true, titulo: true } },
        },
      }),
    );
  }

  @Post()
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async criar(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaFeedback, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const func = await tx.funcionario.findFirst({ where: { codFun: dados.codFun, ativo: 'S' } });
      if (!func) throw new BadRequestException('Funcionário inexistente neste tenant');

      // O plano informado precisa ser do mesmo funcionário — feedback preso ao
      // PDI de outra pessoa não faria sentido nenhum.
      if (dados.codPdi) {
        const plano = await tx.planoDesenvolvimento.findFirst({
          where: { codPdi: dados.codPdi, codFun: dados.codFun },
        });
        if (!plano) throw new BadRequestException('Plano inexistente ou de outro funcionário');
      }

      return tx.feedback.create({
        data: {
          codTen: req.usuario.codTen,
          codFun: dados.codFun,
          codPdi: dados.codPdi,
          tipo: dados.tipo,
          contexto: dados.contexto,
          mensagem: dados.mensagem,
          codUsuAutor: req.usuario.codUsu,
        },
      });
    });
  }

  /**
   * Ciência do funcionário. Idempotente: dar ciência de novo não muda a data da
   * primeira vez — foi quando a pessoa realmente viu.
   */
  @Patch(':codFeed/ciencia')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async darCiencia(@Req() req: ReqAut, @Param('codFeed') codFeed: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const feedback = await tx.feedback.findFirst({ where: { codFeed: BigInt(codFeed) } });
      if (!feedback) throw new BadRequestException('Feedback inexistente neste tenant');
      if (feedback.cienteFun === 'S') return { ok: true, jaCiente: true };
      await tx.feedback.update({
        where: { codFeed: feedback.codFeed },
        data: { cienteFun: 'S', dhCiente: new Date() },
      });
      return { ok: true, jaCiente: false };
    });
  }
}
