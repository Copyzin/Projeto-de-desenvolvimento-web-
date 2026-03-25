import "dotenv/config";
import { spawn } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

function assertLocalDatabase(url: URL) {
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("Bootstrap isolado permitido apenas para banco local.");
  }
}

function spawnCommand(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Processo finalizou com codigo ${code ?? "desconhecido"}.`));
    });
    child.on("error", reject);
  });
}

async function cloneBaseTables(client: pg.Client, schemaName: string) {
  const baseTables = [
    "users",
    "courses",
    "subjects",
    "course_subjects",
    "academic_terms",
    "class_sections",
    "class_section_teachers",
    "enrollments",
    "course_materials",
    "user_pinned_materials",
  ];

  for (const tableName of baseTables) {
    await client.query(`CREATE TABLE "${schemaName}"."${tableName}" (LIKE public."${tableName}" INCLUDING ALL)`);
  }
}

async function runMigrations(databaseUrl: string, schemaName?: string, onlyFiles?: string[]) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    if (schemaName) {
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      await client.query(`SET search_path TO "${schemaName}", public`);
    }

    const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../migrations");
    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort()
      .filter((file) => (onlyFiles ? onlyFiles.includes(file) : true));

    for (const file of files) {
      const sql = await readFile(path.join(migrationsDir, file), "utf8");
      console.log(`[INFO] Aplicando migration ${file}`);
      await client.query(sql);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error("DATABASE_URL nao configurada.");
  }

  const parsedBaseUrl = new URL(baseUrl);
  assertLocalDatabase(parsedBaseUrl);

  const timestamp = Date.now();
  const testDatabaseName = `${parsedBaseUrl.pathname.replace(/^\//, "")}_teaching_assignment_test_${timestamp}`;
  const isolatedSchemaName = `teaching_assignment_test_${timestamp}`;
  const adminUrl = new URL(baseUrl);
  adminUrl.pathname = "/postgres";

  const testUrl = new URL(baseUrl);
  testUrl.pathname = `/${testDatabaseName}`;

  const adminClient = new Client({ connectionString: adminUrl.toString() });
  const baseClient = new Client({ connectionString: baseUrl });
  await adminClient.connect();
  await baseClient.connect();
  let usingSchemaIsolation = false;

  try {
    let executionUrl = testUrl.toString();
    let pgOptions = process.env.PGOPTIONS;

    try {
      console.log(`[INFO] Criando banco temporario ${testDatabaseName}`);
      await adminClient.query(`CREATE DATABASE "${testDatabaseName}"`);
      await runMigrations(executionUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes("permiss")) {
        throw error;
      }

      usingSchemaIsolation = true;
      executionUrl = baseUrl;
      pgOptions = `-c search_path=${isolatedSchemaName},public`;
      console.log(`[INFO] Sem permissao para criar banco; usando schema temporario ${isolatedSchemaName}`);
      await baseClient.query(`CREATE SCHEMA IF NOT EXISTS "${isolatedSchemaName}"`);
      await cloneBaseTables(baseClient, isolatedSchemaName);
      await runMigrations(executionUrl, isolatedSchemaName, [
        "0005_phase5_1_teacher_subject_compatibility.sql",
        "0006_phase5_2_teaching_assignment_schedule.sql",
      ]);
    }

    await spawnCommand("npx", ["tsx", "script/validate-teaching-assignment.ts"], {
      ...process.env,
      DATABASE_URL: executionUrl,
      PGOPTIONS: pgOptions,
      ALLOW_ASSIGNMENT_TEST_DATABASE: "true",
      TEACHING_ASSIGNMENT_TEST_NAMESPACE: `isolated-${timestamp}`,
    });
  } finally {
    try {
      if (usingSchemaIsolation) {
        await baseClient.query(`DROP SCHEMA IF EXISTS "${isolatedSchemaName}" CASCADE`);
        console.log(`[INFO] Schema temporario ${isolatedSchemaName} removido`);
      }
      await adminClient.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [testDatabaseName],
      );
      await adminClient.query(`DROP DATABASE IF EXISTS "${testDatabaseName}"`);
      console.log(`[INFO] Banco temporario ${testDatabaseName} removido`);
    } finally {
      await baseClient.end();
      await adminClient.end();
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
