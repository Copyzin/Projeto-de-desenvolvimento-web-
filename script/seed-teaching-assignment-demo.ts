import "dotenv/config";
import { pool } from "../server/db";
import { seedTeachingAssignmentDemo } from "../server/teaching-assignment-demo-seed";

async function main() {
  const summary = await seedTeachingAssignmentDemo();

  console.log("Seed persistente de demonstracao concluida.");
  console.log(`Periodo ativo: ${summary.activeTerm.name} (${summary.activeTerm.code})`);
  console.log(`Curso demo: ${summary.course.name}`);
  console.log(`Turmas demo: ${summary.classSections.map((section) => section.code).join(", ")}`);
  console.log(`Slots publicados: ${summary.summary.publishedSlots}`);
  console.log(`Conflitos em rascunho: ${summary.summary.draftConflictCount}`);
  console.log(`Observacoes soft em rascunho: ${summary.summary.draftObservationCount}`);
  console.log(`Acesse: ${summary.summary.route}`);
  console.log(`Admin demo: ${summary.users.admin.email} / ${summary.users.admin.password}`);
  for (const teacher of summary.users.teachers) {
    console.log(`Professor demo: ${teacher.name} | ${teacher.email} / ${teacher.password}`);
  }
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Falha ao executar a seed de demonstracao.");
    console.error(error instanceof Error ? error.message : error);
    await pool.end();
    process.exit(1);
  });
