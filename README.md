# AQP Middleware Demo — Web Interface

A web-based demo interface for the first middleware for plan-based Adaptive Query Processing (AQP). It allows interactive exploration of AQP strategies across five different DBMSs through three scenarios: comparing engines, comparing AQP strategies, and comparing integration levels.

## Prerequisites

- Node.js (v18+)
- The [AQP middleware](https://github.com/) binary (built in release mode)
- JOB benchmark query files and schema
- At least one supported database engine running with the IMDB dataset loaded

## Remote Access (SSH Port Forwarding)

If the web interface is running on a remote server, use `ssh -L` to create a tunnel that forwards remote ports to your local machine. This lets your local browser access the web interface as if it were running locally.

```bash
ssh -L 5173:localhost:5173 -L 3001:localhost:3001 user@remote-server
```

- `-L 5173:localhost:5173` maps your local port 5173 to the remote server's port 5173 (frontend)
- `-L 3001:localhost:3001` maps your local port 3001 to the remote server's port 3001 (backend)

After connecting, open [http://localhost:5173](http://localhost:5173) in your local browser.

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/bitaasudeh/aqp-web-interface.git
cd aqp-web-interface

# 2. Install dependencies
npm install

# 3. Start the backend server (Express, port 3001)
node server.js

# 4. In another terminal, start the frontend (Vite, port 5173)
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## DBMS Configuration

The following database engines are supported. Each engine must have the IMDB dataset loaded.

| Engine     | Port | Connection Details                                              |
|------------|------|-----------------------------------------------------------------|
| DuckDB     | —    | File-based: `<benchmark_dir>/imdb.db`                           |
| PostgreSQL | 5433 | `host=localhost port=5433 dbname=imdb user=bita`                |
| Umbra      | 5432 | `host=localhost port=5432 user=postgres password=postgres`      |
| MariaDB    | —    | `host=localhost dbname=imdb user=imdb`                          |
| OpenGauss  | 7654 | `host=localhost port=7654 dbname=imdb user=imdb password=imdb_132` |

Connection strings can be updated in `server.js` under `ENGINE_DB`. See [web-config.md](web-config.md) for full configuration details.

## Stack

- **Frontend:** React 18 + Vite (port 5173)
- **Backend:** Express / Node.js (port 3001)
- **Middleware:** AQP middleware C++ binary
