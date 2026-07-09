import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class SaudeController {
  @Get()
  verificar() {
    return { ok: true, servico: 'selx-api', dataHora: new Date().toISOString() };
  }
}
