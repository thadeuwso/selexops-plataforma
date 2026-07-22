import { BadRequestException, Body, Controller, Get, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import type { Prisma } from '@prisma/client';
import { Permissoes, UsuarioAutenticado } from '../core/auth/autenticacao.guard';
import { PrismaService } from '../compartilhado/prisma/prisma.service';

const DIMENSOES = ['autonomy', 'pace', 'collaboration', 'structure', 'dataDriven', 'directCommunication'] as const;

const esquema = z.object({
  perfil: z.record(z.enum(DIMENSOES), z.coerce.number().int().min(1).max(5)),
});

type ReqAut = Request & { usuario: UsuarioAutenticado };

/**
 * Cultura padrão da empresa (RN-REC-014).
 *
 * Serve de fallback para a vaga que não define a própria — mesmo desenho do
 * Padrão Comportamental. A vaga continua podendo divergir: uma vaga de campo e
 * uma de escritório não pedem a mesma cultura, e forçar uma só apagaria a
 * diferença que o match precisa enxergar.
 */
@Controller('configuracoes/cultura')
export class CulturaEmpresaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissoes('recrutamento.vagas.ler')
  async consultar(@Req() req: ReqAut) {
    const cultura = await this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.culturaPadraoEmpresa.findFirst({ where: { codTen: req.usuario.codTen } }),
    );
    return { perfil: cultura?.perfilJson ?? null, definida: !!cultura, dhAlt: cultura?.dhAlt ?? null };
  }

  @Put()
  @Permissoes('recrutamento.vagas.criar')
  async definir(@Req() req: ReqAut, @Body() corpo: unknown) {
    let dados: z.infer<typeof esquema>;
    try {
      dados = esquema.parse(corpo);
    } catch (erro) {
      if (erro instanceof ZodError) {
        throw new BadRequestException({ mensagem: 'Dados inválidos', detalhes: erro.issues });
      }
      throw erro;
    }
    if (Object.keys(dados.perfil).length === 0) {
      throw new BadRequestException('Informe ao menos uma dimensão');
    }

    const salva = await this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.culturaPadraoEmpresa.upsert({
        where: { codTen: req.usuario.codTen },
        create: {
          codTen: req.usuario.codTen,
          perfilJson: dados.perfil as Prisma.InputJsonValue,
          codUsuInc: req.usuario.codUsu,
        },
        update: { perfilJson: dados.perfil as Prisma.InputJsonValue, codUsuAlt: req.usuario.codUsu },
      }),
    );
    // Vagas já criadas não são recalculadas: o match de uma candidatura é
    // fotografado no momento em que ela entra (RN-REC-006, `hashEntrada`).
    // Mudar a cultura da empresa não pode reescrever score de gente que já foi
    // avaliada sob outro critério.
    return { perfil: salva.perfilJson, definida: true, dhAlt: salva.dhAlt };
  }
}
