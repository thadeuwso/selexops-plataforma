import { BadRequestException, Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { ZodError, z } from 'zod';
import { Permissoes, UsuarioAutenticado } from '../auth/autenticacao.guard';
import { PrismaService } from '../../compartilhado/prisma/prisma.service';
import { renderizarModelo } from './renderizar-modelo';

const esquemaModelo = z.object({
  nomeDoc: z.string().min(3),
  conteudoModelo: z.string().min(10),
});

const esquemaEnvio = z.object({ codDoc: z.coerce.bigint() });

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

@Controller()
export class DocumentosController {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Modelos de documento =====
  @Get('documentos-modelo')
  @Permissoes('core.documentos.ler')
  listarModelos(@Req() req: ReqAut) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.documentoModelo.findMany({ where: { ativo: 'S' }, orderBy: { codDoc: 'asc' } }),
    );
  }

  /** Modelo com placeholders {{nomeFun}}, {{cgc}}, {{nomeEmpresa}}, {{nomeCargo}}, {{nomeDepartamento}}, {{dtAdm}}, {{vlrSal}}, {{tipoContrato}}. */
  @Post('documentos-modelo')
  @Permissoes('core.documentos.editar')
  criarModelo(@Req() req: ReqAut, @Body() corpo: unknown) {
    const dados = validar(esquemaModelo, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.documentoModelo.create({
        data: { codTen: req.usuario.codTen, ...dados, codUsuInc: req.usuario.codUsu },
      }),
    );
  }

  // ===== Envio para assinatura =====
  @Get('funcionarios/:codFun/assinaturas')
  @Permissoes('core.documentos.ler')
  listarAssinaturas(@Req() req: ReqAut, @Param('codFun') codFun: string) {
    return this.prisma.executarNoTenant(req.usuario.codTen, (tx) =>
      tx.assinatura.findMany({
        where: { codFun: BigInt(codFun) },
        orderBy: { codAssin: 'desc' },
        select: {
          codAssin: true,
          status: true,
          dhEnvio: true,
          dhAssinatura: true,
          tokenPub: true,
          documento: { select: { nomeDoc: true } },
        },
      }),
    );
  }

  /** Renderiza o modelo com os dados do funcionário e gera link público de assinatura (token opaco — ADR-0004 §5). */
  @Post('funcionarios/:codFun/assinaturas')
  @Permissoes('core.documentos.criar')
  enviarParaAssinatura(@Req() req: ReqAut, @Param('codFun') codFun: string, @Body() corpo: unknown) {
    const dados = validar(esquemaEnvio, corpo);
    return this.prisma.executarNoTenant(req.usuario.codTen, async (tx) => {
      const funcionario = await tx.funcionario.findFirst({
        where: { codFun: BigInt(codFun), ativo: 'S' },
        include: { empresa: true, cargo: true, departamento: true },
      });
      if (!funcionario) throw new BadRequestException('Funcionário inexistente neste tenant');

      const modelo = await tx.documentoModelo.findFirst({ where: { codDoc: dados.codDoc, ativo: 'S' } });
      if (!modelo) throw new BadRequestException('Modelo de documento inexistente neste tenant');

      const conteudoRenderizado = renderizarModelo(modelo.conteudoModelo, funcionario);
      const hashConteudo = createHash('sha256').update(conteudoRenderizado).digest('hex');
      const tokenPub = randomBytes(24).toString('hex');

      const assinatura = await tx.assinatura.create({
        data: {
          codTen: req.usuario.codTen,
          codDoc: modelo.codDoc,
          codFun: funcionario.codFun,
          conteudoRenderizado,
          hashConteudo,
          tokenPub,
          codUsuInc: req.usuario.codUsu,
        },
        select: { codAssin: true, tokenPub: true, status: true },
      });
      return assinatura;
    });
  }
}
