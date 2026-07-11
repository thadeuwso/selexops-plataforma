/**
 * Regrant: garante que todo papel "Administrador" tenha TODAS as permissões
 * do catálogo (papéis congelam o catálogo do momento do cadastro do tenant).
 * Roda com papel administrativo (sem RLS). Idempotente.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const permissoes = await prisma.permissao.findMany();
const papeis = await prisma.papel.findMany({ where: { nomePap: "Administrador", ativo: "S" } });
let concedidas = 0;
for (const papel of papeis) {
  for (const perm of permissoes) {
    const existe = await prisma.papelPermissao.findUnique({
      where: { codPap_codPerm: { codPap: papel.codPap, codPerm: perm.codPerm } },
    });
    if (!existe) {
      await prisma.papelPermissao.create({
        data: { codTen: papel.codTen, codPap: papel.codPap, codPerm: perm.codPerm },
      });
      concedidas++;
    }
  }
}
console.log(`Regrant: ${papeis.length} papel(is) Administrador, ${concedidas} permissão(ões) concedida(s).`);
await prisma.$disconnect();
