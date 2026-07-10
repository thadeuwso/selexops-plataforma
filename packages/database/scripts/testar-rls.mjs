/**
 * Prova de isolamento multi-tenant via RLS (ADR-0002).
 *
 * Cenário: dois tenants com uma empresa cada. Conectado como papel de
 * aplicação (selx_app, sem BYPASSRLS), o teste garante que:
 *   1. com app.codten = A, só se enxergam dados de A (mesmo pedindo os de B);
 *   2. INSERT com CODTEN de outro tenant é rejeitado (WITH CHECK);
 *   3. sem app.codten definido, nenhuma linha é visível;
 *   4. DELETE é negado ao papel de aplicação (exclusão física proibida).
 *
 * Sai com código 1 em qualquer violação — usado como gate no CI.
 */
import pg from "pg";

const urlAdmin =
  process.env.DATABASE_URL ?? "postgresql://selx:selx_dev@localhost:5433/selx";
const urlApp =
  process.env.DATABASE_URL_APP ??
  urlAdmin.replace(/\/\/[^@]+@/, "//selx_app:selx_app_dev@");

const falhas = [];
function verificar(descricao, condicao) {
  console.log(`${condicao ? "✅" : "❌"} ${descricao}`);
  if (!condicao) falhas.push(descricao);
}

const admin = new pg.Client({ connectionString: urlAdmin });
await admin.connect();

// Massa de teste (como admin, que não sofre RLS por ser dono/superuser)
const { rows: tenants } = await admin.query(`
  INSERT INTO "TSXTEN" ("NOMETEN", "DHALT") VALUES
    ('RLS Teste A', now()), ('RLS Teste B', now())
  RETURNING "CODTEN"`);
const [tenA, tenB] = tenants.map((r) => r.CODTEN);

const { rows: empresas } = await admin.query(
  `INSERT INTO "TSIEMP" ("CODTEN", "NOMEFANTASIA", "RAZAOSOCIAL", "DHALT") VALUES
     ($1, 'Empresa A', 'Empresa A LTDA', now()),
     ($2, 'Empresa B', 'Empresa B LTDA', now())
   RETURNING "CODEMP", "CODTEN"`,
  [tenA, tenB],
);
const empB = empresas.find((e) => e.CODTEN === tenB).CODEMP;

const app = new pg.Client({ connectionString: urlApp });
await app.connect();

try {
  // 1. Escopo do tenant A
  await app.query("BEGIN");
  await app.query("SELECT set_config('app.codten', $1, true)", [String(tenA)]);
  const soA = await app.query(
    `SELECT "NOMEFANTASIA" FROM "TSIEMP" WHERE "CODTEN" IN ($1, $2)`,
    [tenA, tenB],
  );
  verificar(
    "tenant A enxerga apenas as próprias empresas",
    soA.rows.length === 1 && soA.rows[0].NOMEFANTASIA === "Empresa A",
  );
  const roubo = await app.query(`SELECT 1 FROM "TSIEMP" WHERE "CODEMP" = $1`, [empB]);
  verificar("busca direta por empresa do tenant B retorna vazio", roubo.rows.length === 0);

  // 2. WITH CHECK: gravar no tenant alheio é rejeitado
  let insercaoNegada = false;
  try {
    await app.query(
      `INSERT INTO "TSIEMP" ("CODTEN", "NOMEFANTASIA", "RAZAOSOCIAL", "DHALT")
       VALUES ($1, 'Invasora', 'Invasora LTDA', now())`,
      [tenB],
    );
  } catch {
    insercaoNegada = true;
  }
  verificar("INSERT com CODTEN de outro tenant é rejeitado", insercaoNegada);
  await app.query("ROLLBACK");

  // 3. Sem contexto de tenant, nada é visível
  const semContexto = await app.query(`SELECT 1 FROM "TSIEMP"`);
  verificar("sem app.codten definido, nenhuma linha é visível", semContexto.rows.length === 0);

  // 4. DELETE negado ao papel de aplicação
  let deleteNegado = false;
  await app.query("BEGIN");
  await app.query("SELECT set_config('app.codten', $1, true)", [String(tenA)]);
  try {
    await app.query(`DELETE FROM "TSIEMP" WHERE "CODTEN" = $1`, [tenA]);
  } catch {
    deleteNegado = true;
  }
  verificar("DELETE físico é negado ao papel de aplicação", deleteNegado);
  await app.query("ROLLBACK");
} finally {
  await app.end();
  await admin.query(`DELETE FROM "TSIEMP" WHERE "CODTEN" = ANY($1)`, [[tenA, tenB]]);
  await admin.query(`DELETE FROM "TSXTEN" WHERE "CODTEN" = ANY($1)`, [[tenA, tenB]]);
  await admin.end();
}

if (falhas.length > 0) {
  console.error(`\n${falhas.length} violação(ões) de RLS — reprovado.`);
  process.exit(1);
}
console.log("\nIsolamento multi-tenant comprovado.");
