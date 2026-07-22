-- AlterTable
ALTER TABLE "TRECAND" ADD COLUMN     "PERFILCULTURALDH" TIMESTAMP(3),
ADD COLUMN     "PERFILCULTURALORIGEM" TEXT;

-- CreateTable
CREATE TABLE "TRECULEMP" (
    "CODCULEMP" BIGSERIAL NOT NULL,
    "CODTEN" BIGINT NOT NULL,
    "PERFILJSON" JSONB NOT NULL,
    "DHINC" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CODUSUINC" BIGINT,
    "DHALT" TIMESTAMP(3) NOT NULL,
    "CODUSUALT" BIGINT,

    CONSTRAINT "TRECULEMP_pkey" PRIMARY KEY ("CODCULEMP")
);

-- CreateTable
CREATE TABLE "TRECULPER" (
    "CODCULPER" BIGSERIAL NOT NULL,
    "DIMENSAO" TEXT NOT NULL,
    "TEXTO" TEXT NOT NULL,
    "REVERSA" CHAR(1) NOT NULL DEFAULT 'N',
    "ORDEM" INTEGER NOT NULL,
    "ATIVO" CHAR(1) NOT NULL DEFAULT 'S',
    "DHINC" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TRECULPER_pkey" PRIMARY KEY ("CODCULPER")
);

-- CreateTable
CREATE TABLE "TRECULRESP" (
    "CODCULRESP" BIGSERIAL NOT NULL,
    "CODTEN" BIGINT NOT NULL,
    "CODCAND" BIGINT NOT NULL,
    "CODCULPER" BIGINT NOT NULL,
    "VALOR" INTEGER NOT NULL,
    "DHINC" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TRECULRESP_pkey" PRIMARY KEY ("CODCULRESP")
);

-- CreateIndex
CREATE UNIQUE INDEX "TRECULEMP_CODTEN_key" ON "TRECULEMP"("CODTEN");

-- CreateIndex
CREATE INDEX "TRECULRESP_CODTEN_CODCAND_idx" ON "TRECULRESP"("CODTEN", "CODCAND");

-- CreateIndex
CREATE UNIQUE INDEX "TRECULRESP_CODCAND_CODCULPER_key" ON "TRECULRESP"("CODCAND", "CODCULPER");

-- AddForeignKey
ALTER TABLE "TRECULEMP" ADD CONSTRAINT "TRECULEMP_CODTEN_fkey" FOREIGN KEY ("CODTEN") REFERENCES "TSXTEN"("CODTEN") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TRECULRESP" ADD CONSTRAINT "TRECULRESP_CODTEN_fkey" FOREIGN KEY ("CODTEN") REFERENCES "TSXTEN"("CODTEN") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TRECULRESP" ADD CONSTRAINT "TRECULRESP_CODCAND_fkey" FOREIGN KEY ("CODCAND") REFERENCES "TRECAND"("CODCAND") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TRECULRESP" ADD CONSTRAINT "TRECULRESP_CODCULPER_fkey" FOREIGN KEY ("CODCULPER") REFERENCES "TRECULPER"("CODCULPER") ON DELETE RESTRICT ON UPDATE CASCADE;


-- SelX: RLS (ADR-0002). TRECULEMP e TRECULRESP são por tenant.
-- TRECULPER fica de fora de propósito: é catálogo global da plataforma, como
-- TGPPER — todo tenant lê as mesmas afirmações, ninguém as edita.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['TRECULEMP','TRECULRESP'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY politica_tenant ON %I USING ("CODTEN" = NULLIF(current_setting(''app.codten'', true), '''')::bigint) WITH CHECK ("CODTEN" = NULLIF(current_setting(''app.codten'', true), '''')::bigint)', t);
  END LOOP;
END $$;

-- Semente do questionário cultural (RN-REC-014): 2 afirmações por dimensão,
-- uma direta e uma reversa. A reversa pega quem responde tudo no mesmo extremo
-- — mesma razão do banco comportamental.
INSERT INTO "TRECULPER" ("DIMENSAO","TEXTO","REVERSA","ORDEM") VALUES
 ('autonomy','Prefiro decidir como fazer o trabalho sem precisar validar cada passo.','N',1),
 ('autonomy','Sinto-me mais confortável quando alguém define exatamente o que devo fazer.','S',2),
 ('pace','Gosto de ambientes em que as prioridades mudam com frequência.','N',3),
 ('pace','Trabalho melhor quando o ritmo é previsível e estável.','S',4),
 ('collaboration','Prefiro resolver problemas junto com outras pessoas a resolvê-los sozinho.','N',5),
 ('collaboration','Rendo mais quando posso trabalhar de forma independente.','S',6),
 ('structure','Processos e regras claras me ajudam a produzir melhor.','N',7),
 ('structure','Excesso de processo me atrapalha mais do que ajuda.','S',8),
 ('dataDriven','Costumo apoiar minhas decisões em dados e números.','N',9),
 ('dataDriven','Confio na minha experiência mesmo quando os dados apontam outra direção.','S',10),
 ('directCommunication','Prefiro dizer o que penso de forma direta, mesmo que soe desconfortável.','N',11),
 ('directCommunication','Evito apontar problemas abertamente para não gerar atrito.','S',12);
