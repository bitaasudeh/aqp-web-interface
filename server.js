import express from "express";
import cors from "cors";
import { execFile } from "child_process";
import { readFileSync } from "fs";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

/* ─── Paths ─────────────────────────────────────────────────────────────────── */
const AQP_BIN = "/home/bita/Project/AQP_middleware/build_release/aqp_middleware";
const BENCHMARK_DIR = "/home/bita/Project/benchmarks/JOB4AQP";
const SCHEMA = path.join(BENCHMARK_DIR, "schema.sql");
const FKEYS = path.join(BENCHMARK_DIR, "fkeys.sql");

/* Engine-specific DB connection strings */
const ENGINE_DB = {
  duckdb: path.join(BENCHMARK_DIR, "imdb.db"),
  postgresql: "host=localhost port=5432 dbname=imdb user=bita",
  umbra: "host=localhost port=5432 user=postgres password=postgres",
  mariadb: "host=localhost dbname=imdb user=imdb",
};

/* Map frontend split names to CLI values */
const SPLIT_MAP = {
  "relation-center": "relationshipcenter",
  "entity-center": "entity_center",
  "min-subquery": "min_subquery",
  "node-based": "top_down",
};

/* ─── Output parser ─────────────────────────────────────────────────────────── */
function parseMiddlewareOutput(stdout) {
  const result = {
    originalSql: "",
    rounds: [],
    finalSql: "",
    output: { columns: [], rows: [] },
  };

  /* Original SQL */
  const origMatch = stdout.match(/Original SQL:\n([\s\S]*?)\n\n/);
  if (origMatch) result.originalSql = origMatch[1].trim();

  /* Iterations — extract sub-SQL, temp table name + cardinality */
  const iterRegex = /========== Iteration (\d+) ==========[\s\S]*?=== Sub-Query SQL ===\n([\s\S]*?)(?=Executing sub-query)/g;
  const tempRegex = /\[Iteration (\d+)\] Created temp table: (\w+) \(index=\d+, cardinality=(\d+)\)/g;
  const timeRegex = /Iteration (\d+) completed in ([\d.]+) ms/g;

  /* Collect sub-SQLs */
  const subSqls = {};
  let m;
  while ((m = iterRegex.exec(stdout)) !== null) {
    subSqls[m[1]] = m[2].trim();
  }

  /* Collect temp tables */
  const temps = {};
  while ((m = tempRegex.exec(stdout)) !== null) {
    temps[m[1]] = { name: m[2], rows: parseInt(m[3]) };
  }

  /* Collect timings */
  const times = {};
  while ((m = timeRegex.exec(stdout)) !== null) {
    times[m[1]] = parseFloat(m[2]);
  }

  /* Build rounds */
  const colors = ["#2563EB", "#DC2626", "#8B5CF6", "#059669", "#D97706", "#EC4899"];
  const iterNums = Object.keys(subSqls).sort((a, b) => a - b);
  for (const num of iterNums) {
    const idx = parseInt(num) - 1;
    const temp = temps[num] || { name: `temp${num}`, rows: 0 };
    const tableCountMatch = stdout.match(
      new RegExp(`\\[Iteration ${num}\\] Extracted subquery with (\\d+) table`)
    );
    const tableCount = tableCountMatch ? parseInt(tableCountMatch[1]) : 0;

    result.rounds.push({
      roundNum: parseInt(num),
      color: colors[idx % colors.length],
      irLabel: idx === 0 ? `IR — ${tableCount} tables` : `Remaining IR ${num}`,
      subIrLabel: `Sub-IR ${num}`,
      subSqlTitle: `Sub-SQL ${num}`,
      subSql: subSqls[num],
      temp,
    });
  }

  /* Final SQL */
  const finalMatch = stdout.match(/=== Final Generated SQL ===\n([\s\S]*?)(?=\[IRQuerySplitter\])/);
  if (finalMatch) result.finalSql = finalMatch[1].trim();

  /* Final round (the final remaining IR execution) */
  if (result.finalSql) {
    const finalIdx = result.rounds.length;
    /* Get final result row count from Query Results */
    const rowMatch = stdout.match(/Rows: (\d+), Columns: (\d+)/);
    result.rounds.push({
      roundNum: finalIdx + 1,
      color: colors[finalIdx % colors.length],
      irLabel: `Remaining IR ${finalIdx + 1}`,
      subIrLabel: "Final Sub-IR",
      subSqlTitle: "Final SQL",
      subSql: result.finalSql,
      temp: { name: "result", rows: rowMatch ? parseInt(rowMatch[1]) : 0 },
    });
  }

  /* Query results */
  const resMatch = stdout.match(/=== Query Results ===\nRows: (\d+), Columns: (\d+)\n([\s\S]*?)(?=\n={3,})/);
  if (resMatch) {
    const dataLines = resMatch[3].trim().split("\n").filter(Boolean);
    if (dataLines.length > 0) {
      /* Values are pipe-separated with trailing pipe */
      result.output.rows = dataLines.map((line) =>
        line.replace(/\|$/, "").split("|")
      );
    }
  }

  return result;
}

/* ─── API endpoint ──────────────────────────────────────────────────────────── */
app.post("/api/run", (req, res) => {
  const { engine = "duckdb", split = "relation-center", query = "1a", customSql } = req.body;

  const splitArg = SPLIT_MAP[split] || "relationshipcenter";
  const dbArg = ENGINE_DB[engine] || ENGINE_DB.duckdb;
  const queryFile = path.join(BENCHMARK_DIR, "queries", `${query}.sql`);

  const args = [
    `--engine=${engine}`,
    `--db=${dbArg}`,
    `--schema=${SCHEMA}`,
    `--fkeys=${FKEYS}`,
    `--split=${splitArg}`,
    "--debug",
    queryFile,
  ];

  execFile(AQP_BIN, args, { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
    if (err && !stdout) {
      return res.status(500).json({ error: err.message, stderr });
    }

    try {
      const parsed = parseMiddlewareOutput(stdout);
      /* Read original SQL from file for display */
      if (!parsed.originalSql) {
        try {
          parsed.originalSql = readFileSync(queryFile, "utf-8").trim();
        } catch {}
      }
      res.json(parsed);
    } catch (parseErr) {
      res.status(500).json({ error: "Failed to parse output", raw: stdout });
    }
  });
});

/* ─── Start ─────────────────────────────────────────────────────────────────── */
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`AQP backend running on http://localhost:${PORT}`);
});
