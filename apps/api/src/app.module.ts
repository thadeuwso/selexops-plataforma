import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SaudeModule } from './saude/saude.module';

/**
 * Monólito modular (FOUNDATION §5): cada domínio (Core, Recrutamento,
 * Gestão de Pessoas, Benefícios, Auditoria da Folha, Analytics, Integrações)
 * entrará como um módulo Nest com fronteira explícita.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), SaudeModule],
})
export class AppModule {}
