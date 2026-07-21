-- Modelos criados por tenant antes da correção ficaram com CODTEN nulo e, por
-- terem versão maior que a do seed, seguiam servindo de padrão para TODOS os
-- tenants. Os sem uso já foram removidos na migration anterior; os que têm
-- convite vinculado (não podem ser apagados) são atribuídos ao tenant que de
-- fato os utilizou.
UPDATE "TGPMOD" m
   SET "CODTEN" = c."CODTEN"
  FROM (SELECT DISTINCT ON ("CODMOD") "CODMOD", "CODTEN" FROM "TGPCONV" ORDER BY "CODMOD", "CODCONV") c
 WHERE m."CODMOD" = c."CODMOD"
   AND m."CODTEN" IS NULL
   AND m."VERSAO" > 1;
