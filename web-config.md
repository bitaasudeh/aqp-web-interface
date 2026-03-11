# Web Interface Configuration

This document describes the connection between the web interface and the AQP middleware tool.

## Paths

All paths are configured in `server.js`:

| Variable        | Description                          | Default Value                                                    |
|-----------------|--------------------------------------|------------------------------------------------------------------|
| `AQP_BIN`       | Path to the AQP middleware binary    | `/home/bita/Project/AQP_middleware/build_release/aqp_middleware`  |
| `BENCHMARK_DIR` | Path to the JOB benchmark directory  | `/home/bita/Project/benchmarks/JOB4AQP`                          |
| `SCHEMA`        | SQL schema file for the IMDB dataset | `<BENCHMARK_DIR>/schema.sql`                                     |
| `FKEYS`         | Foreign keys definition file         | `<BENCHMARK_DIR>/fkeys.sql`                                      |

## Engine Connection Strings (ENGINE_DB)

Each engine requires a connection string passed via `--db` to the middleware binary:

```js
ENGINE_DB = {
  duckdb:     "<BENCHMARK_DIR>/imdb.db",
  postgresql: "host=localhost port=5433 dbname=imdb user=bita",
  umbra:      "host=localhost port=5432 user=postgres password=postgres",
  mariadb:    "host=localhost dbname=imdb user=imdb",
  opengauss:  "host=localhost port=7654 dbname=imdb user=imdb password=imdb_132",
};
```

## Split Strategy Mapping (SPLIT_MAP)

The frontend uses readable names that map to CLI values:

| Frontend Name    | CLI Value            |
|------------------|----------------------|
| FK-Center        | `relationshipcenter` |
| PK-Center        | `entitycenter`       |
| Min-Subquery     | `minsubquery`        |
| Node-Based       | `nodebased`          |

## CLI Flags

The backend constructs the middleware command with these flags:

| Flag                     | Description                                                    | When Used                        |
|--------------------------|----------------------------------------------------------------|----------------------------------|
| `--engine=<name>`        | Database engine to use                                         | Always                           |
| `--db=<connection>`      | Database connection string                                     | Always                           |
| `--schema=<path>`        | Path to schema file                                            | Always                           |
| `--fkeys=<path>`         | Path to foreign keys file                                      | Always                           |
| `--split=<strategy>`     | AQP split strategy                                             | Always                           |
| `--timing`               | Enable performance timing (writes to `time_log.csv`)           | Always                           |
| `--debug`                | Enable debug output (iteration details, temp table info)       | Always                           |
| `--print-sql`            | Print generated sub-SQL in output                              | Always                           |
| `--combine-sub-plans`    | Combine all sub-plan SQLs into a single executable script      | When Sub-SQL Combiner is ON      |
| `--no-update-temp-card`  | Disable cardinality estimator updates for temp tables           | When Cardinality Estimator is OFF |

## Ports

| Service  | Port | Description                              |
|----------|------|------------------------------------------|
| Frontend | 5173 | Vite dev server (React app)              |
| Backend  | 3001 | Express API server (proxied from Vite)   |

The Vite dev server proxies `/api/*` requests to the backend on port 3001.

## time_log.csv

The middleware writes timing data to `time_log.csv` in the working directory. The backend handles it as follows:

1. **Before each run**: Deletes `time_log.csv` to prevent stale data from previous executions
2. **After each run**: Reads the CSV and parses the timing breakdown

### CSV Column Format

```
[prepare_middleware, read_sql, parse_sql, preprocess, convert_plan_to_IR,
 [extract_next_sub-IR, generate_sub-SQL, execute_sub-SQL, extra_materialization, update_IR] x N iterations,
 (optional extra extract_next_sub-IR),
 generate_final_sub_sql, final_exe, show_output]
```

- Fixed start: 5 columns (indices 0-4)
- Repeating group: 5 columns per iteration
- Fixed end: 3 columns (generate_final_sub_sql, final_exe, show_output)

### Timing Categories

| Category       | Components                                  |
|----------------|---------------------------------------------|
| SQL Execution  | preprocess + execute_sub_sql + final_exe     |
| Fetch Tuples   | extra_materialization                        |
| Split Time     | extract_next_sub_IR + update_IR              |
| Others         | total - SQL Execution - Fetch Tuples - Split Time |

**Note (DuckDB):** For DuckDB with non-Node-Based strategies, `preprocess` and `convert_plan_to_IR` are swapped in the CSV. For DuckDB with Node-Based, `convert_plan_to_IR` is set to 0.
