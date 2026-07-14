import { BadRequestException, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Publico } from '../auth/autenticacao.guard';
import { PrismaService } from '../../compartilhado/prisma/prisma.service';

/**
 * Assinatura pública por token opaco (ADR-0004 §5) — sem exigir login do
 * funcionário, já que ainda não existe portal do colaborador. Assinatura
 * "simples" (Lei 14.063/2020): consentimento + hash do conteúdo + IP + timestamp.
 * Acesso só a operações de plataforma (prisma.admin) — mesmo padrão do lookup
 * de login por e-mail em auth.service.ts.
 */
@Controller('assinaturas/publico')
export class AssinaturasPublicasController {
  constructor(private readonly prisma: PrismaService) {}

  @Publico()
  @Get(':token')
  async consultar(@Param('token') token: string) {
    const assinatura = await this.prisma.admin.assinatura.findUnique({
      where: { tokenPub: token },
      select: {
        status: true,
        conteudoRenderizado: true,
        dhAssinatura: true,
        documento: { select: { nomeDoc: true } },
        funcionario: { select: { nomeFun: true } },
      },
    });
    if (!assinatura) throw new BadRequestException('Link inválido ou expirado');
    return assinatura;
  }

  @Publico()
  @Post(':token/assinar')
  async assinar(@Req() req: Request, @Param('token') token: string) {
    const assinatura = await this.prisma.admin.assinatura.findUnique({ where: { tokenPub: token } });
    if (!assinatura) throw new BadRequestException('Link inválido ou expirado');
    if (assinatura.status !== 'PENDENTE') {
      throw new BadRequestException(`Documento já está com status ${assinatura.status}`);
    }

    await this.prisma.admin.assinatura.update({
      where: { codAssin: assinatura.codAssin },
      data: { status: 'ASSINADO', dhAssinatura: new Date(), ipAssinatura: req.ip },
    });
    return { status: 'ASSINADO' };
  }
}
