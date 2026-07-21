-- AlterTable
ALTER TABLE "TGPMOD" ADD COLUMN     "CODTEN" BIGINT;


-- Limpa os modelos criados por tenant antes desta correção: eles nasceram sem
-- CODTEN e estavam servindo de padrão global indevidamente. O modelo semeado
-- pela plataforma (versão 1) é preservado.
DELETE FROM "TGPMODPER" WHERE "CODMOD" IN (SELECT "CODMOD" FROM "TGPMOD" WHERE "VERSAO" > 1 AND "CODTEN" IS NULL);
DELETE FROM "TGPMOD" WHERE "VERSAO" > 1 AND "CODTEN" IS NULL
  AND "CODMOD" NOT IN (SELECT DISTINCT "CODMOD" FROM "TGPCONV");
