import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';
import { quadrante9box } from './potencial';

type ReqAut = Request & { usuario: UsuarioAutenticado };

const esquemaPotencial = z.object({
  desempenhoEixo: z.coerce.number().int().min(1).max(3),
  potencialEixo: z.coerce.number().int().min(1).max(3),
  nivelConfianca: z.enum(['BAIXO', 'MEDIO', 'ALTO']).default('MEDIO'),
  evidencias: z.string().max(4000).optional(),
  cargoAlvo: z.string().max(160).optional(),
  prontidao: z.enum(['PRONTO', 'UM_A_DOIS_ANOS', 'EM_DESENVOLVIMENTO']).optional(),
});

function validar<T extends z.ZodTypeAny>(esquema: T, corpo: unknown): z.infer<T> {
  try {
    return esquema.parse(corpo);
  } catch (erro) {
    if (erro instanceof ZodError) throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
    throw erro;
  }
}

/**
 * Perfil comportamental (integração) e potencial/9-box (performance-360, Fase 8).
 *
 * O perfil comportamental é **só leitura** e vem do módulo do recrutamento pela
 * ponte candidatura → convite → sessão → resultado. Nunca vira nota nem decide
 * promoção; acompanha um aviso metodológico. O potencial é classificação
 * preliminar com revisão humana.
 */
@Controller('gestao-pessoas')
export class PerfilPotencialController {
  constructor(private readonly prisma: PrismaService) {}

  /** Perfil comportamental do colaborador (via a candidatura que o admitiu). */
  @Get('colaboradores/:codFun/comportamental')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async comportamental(@Req() req: ReqAut, @Param('codFun') codFunParam: string) {
    const codFun = BigInt(codFunParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const resultado = await tx.resultadoComportamental.findFirst({
        where: { sessao: { convite: { candidatura: { codFun } } } },
        orderBy: { dhCalc: 'desc' },
        select: {
          versaoAlgoritmo: true,
          versaoMod: true,
          indicadorConsistencia: true,
          percRespNeutras: true,
          percRespUniformes: true,
          dhCalc: true,
          fatores: {
            select: {
              percentualNormalizado: true,
              media: true,
              desvio: true,
              faixaInterpretativa: true,
              fator: { select: { sigla: true, nome: true, ordem: true } },
            },
          },
        },
      });
      if (!resultado) return { temPerfil: false };

      return {
        temPerfil: true,
        versaoMetodologia: `${resultado.versaoAlgoritmo} · modelo v${resultado.versaoMod}`,
        indicadorConsistencia: resultado.indicadorConsistencia,
        percRespNeutras: Number(resultado.percRespNeutras),
        percRespUniformes: Number(resultado.percRespUniformes),
        dhCalc: resultado.dhCalc,
        fatores: resultado.fatores
          .map((f) => ({
            sigla: f.fator.sigla,
            nome: f.fator.nome,
            ordem: f.fator.ordem,
            percentual: Number(f.percentualNormalizado),
            faixa: f.faixaInterpretativa,
          }))
          .sort((a, b) => a.ordem - b.ordem),
      };
    });
  }

  /** Última avaliação de potencial do colaborador (9-box). */
  @Get('colaboradores/:codFun/potencial')
  @Permissoes('gestaopessoas.avaliacoes.ler')
  async obterPotencial(@Req() req: ReqAut, @Param('codFun') codFunParam: string) {
    const codFun = BigInt(codFunParam);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const p = await tx.avaliacaoPotencial.findFirst({
        where: { codFun },
        orderBy: { codPot: 'desc' },
        include: { avaliador: { select: { nomeUsu: true } } },
      });
      if (!p) return { temPotencial: false };
      const q = quadrante9box(p.desempenhoEixo, p.potencialEixo);
      return {
        temPotencial: true,
        codPot: p.codPot,
        desempenhoEixo: p.desempenhoEixo,
        potencialEixo: p.potencialEixo,
        quadrante: q,
        nivelConfianca: p.nivelConfianca,
        evidencias: p.evidencias,
        revisaoHumana: p.revisaoHumana === 'S',
        cargoAlvo: p.cargoAlvo,
        prontidao: p.prontidao,
        avaliador: p.avaliador?.nomeUsu ?? null,
        dhInc: p.dhInc,
      };
    });
  }

  @Post('colaboradores/:codFun/potencial')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async definirPotencial(@Req() req: ReqAut, @Param('codFun') codFunParam: string, @Body() corpo: unknown) {
    const codFun = BigInt(codFunParam);
    const dados = validar(esquemaPotencial, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const func = await tx.funcionario.findFirst({ where: { codFun, ativo: 'S' } });
      if (!func) throw new BadRequestException('Colaborador inexistente neste tenant');
      // Nova linha (preserva histórico); nasce como rascunho (revisão pendente).
      return tx.avaliacaoPotencial.create({
        data: {
          codTen: req.usuario.codTen,
          codFun,
          desempenhoEixo: dados.desempenhoEixo,
          potencialEixo: dados.potencialEixo,
          nivelConfianca: dados.nivelConfianca,
          evidencias: dados.evidencias,
          cargoAlvo: dados.cargoAlvo,
          prontidao: dados.prontidao,
          codUsuAvaliador: req.usuario.codUsu,
          codUsuInc: req.usuario.codUsu,
        },
      });
    });
  }

  /** Marca a revisão humana — sem isso, a classificação é só um rascunho. */
  @Patch('potencial/:codPot/revisar')
  @Permissoes('gestaopessoas.avaliacoes.criar')
  async revisar(@Req() req: ReqAut, @Param('codPot') codPot: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const p = await tx.avaliacaoPotencial.findFirst({ where: { codPot: BigInt(codPot) } });
      if (!p) throw new NotFoundException('Avaliação de potencial inexistente neste tenant');
      await tx.avaliacaoPotencial.update({ where: { codPot: p.codPot }, data: { revisaoHumana: 'S' } });
      return { ok: true };
    });
  }
}
