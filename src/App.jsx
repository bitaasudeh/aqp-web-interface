import { useState } from "react";
import "./App.css";


/* ─── SQL Syntax Highlighter ─────────────────────────────────────────────── */
const SQL_KW = new Set([
  "SELECT","FROM","WHERE","AND","OR","AS","MIN","MAX","COUNT","SUM","AVG",
  "NOT","LIKE","IN","JOIN","INNER","LEFT","RIGHT","ON","GROUP","BY","ORDER",
  "HAVING","LIMIT","INSERT","UPDATE","DELETE","CREATE","DROP","ALTER","TABLE",
  "SET","INTO","VALUES","NULL","IS","BETWEEN","EXISTS","DISTINCT","UNION",
  "ALL","CASE","WHEN","THEN","ELSE","END","CAST","WITH","FETCH","OFFSET",
]);

function SqlBlock({ sql, accentColor = "#2563EB", fontSize = 11 }) {
  if (!sql) return null;
  const tokens = sql.split(/(\b\w+\b|'[^']*'|[^\w\s']+|\s+)/g).filter(Boolean);
  return (
    <pre className="sql-block" style={{ fontSize }}>
      <code>
        {tokens.map((tok, i) => {
          if (SQL_KW.has(tok.toUpperCase()))
            return <span key={i} className="sql-kw" style={{ color: accentColor }}>{tok}</span>;
          if (tok.startsWith("'"))
            return <span key={i} className="sql-str">{tok}</span>;
          return <span key={i}>{tok}</span>;
        })}
      </code>
    </pre>
  );
}

/* ─── Arrow components ───────────────────────────────────────────────────── */
function ArrowRight({ color = "#94A3B8", dashed = false, width = 50 }) {
  return (
    <svg width={width} height="20" viewBox={`0 0 ${width} 20`} className="arrow-h">
      <line x1="0" y1="10" x2={width - 8} y2="10"
        stroke={color} strokeWidth="2"
        strokeDasharray={dashed ? "6,4" : "none"} />
      <polygon points={`${width - 8},5 ${width},10 ${width - 8},15`} fill={color} />
    </svg>
  );
}

function ArrowDown({ color = "#94A3B8", dashed = false, height = 30 }) {
  return (
    <div className="arrow-down-wrap">
      <svg width="20" height={height} viewBox={`0 0 20 ${height}`}>
        <line x1="10" y1="0" x2="10" y2={height - 8}
          stroke={color} strokeWidth="2"
          strokeDasharray={dashed ? "6,4" : "none"} />
        <polygon points={`5,${height - 8} 10,${height} 15,${height - 8}`} fill={color} />
      </svg>
    </div>
  );
}

/* ─── Pipeline Round Row ─────────────────────────────────────────────────── */
function PipelineRound({ round }) {
  return (
    <div className="pipeline-round">
      <div className="round-flow">
        {/* IR box */}
        <div className="flow-box ir-box" style={{ borderColor: round.color }}>
          {round.irLabel}
        </div>

        <ArrowRight color={round.color} width={40} />

        {/* Sub-IR box */}
        <div className="flow-box subir-box"
          style={{ borderColor: round.color, backgroundColor: `${round.color}12` }}>
          {round.subIrLabel}
        </div>

        <ArrowRight color={round.color} width={40} />

        {/* Sub-SQL */}
        <div className="subsql-card" style={{ borderColor: round.color }}>
          <div className="subsql-title" style={{ color: round.color }}>
            {round.subSqlTitle}
          </div>
          <SqlBlock sql={round.subSql} accentColor={round.color} fontSize={10} />
        </div>

        <ArrowRight color={round.color} width={40} />

        {/* Temp table */}
        <div className="temp-card" style={{ borderColor: round.color, backgroundColor: `${round.color}12` }}>
          <div className="temp-name" style={{ color: round.color }}>{round.temp.name}</div>
          <div className="temp-detail">{round.temp.rows} rows</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────────── */
export default function App() {
  const [selectedDataset, setSelectedDataset] = useState("imdb");
  const [dataset, setDataset] = useState("job");
  const [selectedQuery, setSelectedQuery] = useState("1a");
  const [customSql, setCustomSql] = useState("");
  const [engine, setEngine] = useState("postgresql");
  const [splitStrategy, setSplitStrategy] = useState("relation-center");
  const [cardinalityEstimator, setCardinalityEstimator] = useState(true);
  const [mergeSubPlan, setMergeSubPlan] = useState(true);
  const [hasRun, setHasRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    setIsRunning(true);
    setHasRun(false);
    setError(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engine,
          split: splitStrategy,
          query: selectedQuery,
          customSql: customSql || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Server error");
      setData({
        sql: json.originalSql,
        rounds: json.rounds,
        output: {
          text: json.output.rows.length > 0
            ? `Output: ${json.output.rows.length} row(s) | ${json.output.rows[0].join(" | ")}`
            : "No results",
        },
      });
      setHasRun(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <h1 className="header-title">AQP Middleware Demo</h1>
        <div className="header-url">localhost:3000/aqp-middleware-demo</div>
      </header>

      {/* ── Body ── */}
      <div className="body-layout">
        {/* ── Left: Config ── */}
        <aside className="config-panel">
          <h2 className="section-title">Configuration</h2>

          {/* Dataset + Benchmark + Query selector */}
          <div className="select-row">
            <div className="select-col">
              <label className="field-label">Dataset:</label>
              <select className="field-select" value={selectedDataset}
                onChange={(e) => { setSelectedDataset(e.target.value); setHasRun(false); }}>
                <option value="imdb">IMDB</option>
              </select>
            </div>
            <div className="select-col">
              <label className="field-label">Benchmark:</label>
              <select className="field-select" value={dataset}
                onChange={(e) => { setDataset(e.target.value); setHasRun(false); }}>
                <option value="job">JOB</option>
              </select>
            </div>
            <div className="select-col">
              <label className="field-label">Query:</label>
              <select className="field-select" value={selectedQuery}
                onChange={(e) => { setSelectedQuery(e.target.value); setHasRun(false); }}>
                {["1a","1b","1c","1d","2a","2b","2c","2d","3a","3b","3c",
                  "4a","4b","4c","5a","5b","5c","6a","6b","6c","6d","6e","6f",
                  "7a","7b","7c","8a","8b","8c","8d","9a","9b","9c","9d",
                  "10a","10b","10c","11a","11b","11c","11d","12a","12b","12c",
                  "13a","13b","13c","13d","14a","14b","14c","15a","15b","15c","15d",
                  "16a","16b","16c","16d","17a","17b","17c","17d","17e","17f",
                  "18a","18b","18c","19a","19b","19c","19d","20a","20b","20c",
                  "21a","21b","21c","22a","22b","22c","22d","23a","23b","23c",
                  "24a","24b","25a","25b","25c","26a","26b","26c",
                  "27a","27b","27c","28a","28b","28c","29a","29b","29c",
                  "30a","30b","30c","31a","31b","31c","32a","32b",
                  "33a","33b","33c"].map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom SQL */}
          <label className="field-label">Or enter SQL manually:</label>
          <textarea className="field-textarea" rows={3}
            placeholder="Enter Your Custom Query Here"
            value={customSql}
            onChange={(e) => setCustomSql(e.target.value)} />

          {/* Engine */}
          <label className="field-label">Engine:</label>
          <div className="radio-grid-2x2">
            {[["postgresql","PostgreSQL"],["duckdb","DuckDB"],["umbra","Umbra"],["mariadb","MariaDB"]].map(([v,l])=>(
              <label key={v} className="radio-item">
                <input type="radio" name="engine" value={v} checked={engine===v}
                  onChange={()=>{setEngine(v);setHasRun(false);}} />
                <span>{l}</span>
              </label>
            ))}
          </div>

          {/* Split Strategy */}
          <label className="field-label">Split Strategy:</label>
          <div className="radio-grid-2x2">
            {[["relation-center","Relation-Center"],["entity-center","Entity-Center"],
              ["min-subquery","Min-Subquery"],["node-based","Node-Based"]].map(([v,l])=>(
              <label key={v} className="radio-item">
                <input type="radio" name="split" value={v} checked={splitStrategy===v}
                  onChange={()=>{setSplitStrategy(v);setHasRun(false);}} />
                <span>{l}</span>
              </label>
            ))}
          </div>

          {/* Integration Options */}
          <label className="field-label">Integration Options:</label>
          <div className="toggle-row">
            <span className="toggle-label">Cardinality Estimator</span>
            <button
              type="button"
              className={`toggle-switch ${cardinalityEstimator ? "toggle-on" : ""}`}
              onClick={() => { setCardinalityEstimator(!cardinalityEstimator); setHasRun(false); }}
              aria-pressed={cardinalityEstimator}
            >
              <span className="toggle-knob" />
            </button>
          </div>
          <div className="toggle-row">
            <span className="toggle-label">Merge Sub-Plan</span>
            <button
              type="button"
              className={`toggle-switch ${mergeSubPlan ? "toggle-on" : ""}`}
              onClick={() => { setMergeSubPlan(!mergeSubPlan); setHasRun(false); }}
              aria-pressed={mergeSubPlan}
            >
              <span className="toggle-knob" />
            </button>
          </div>

          {/* Run button */}
          <button className="run-btn" onClick={handleRun} disabled={isRunning}>
            {isRunning ? "⏳ Running..." : "▶ Run Query"}
          </button>

          {/* Result below Run button */}
          {hasRun && data && (
            <div className="run-result">
              {data.output.text}
            </div>
          )}
          {error && (
            <div className="run-error">{error}</div>
          )}

        </aside>

        {/* ── Right: Pipeline ── */}
        <main className="pipeline-panel">
          {hasRun && data ? (
            <div className="pipeline-content">
              {/* Title + Legend */}
              <div className="pipeline-header">
                <h2 className="pipeline-title">Pipeline</h2>
                <div className="pipeline-legend">
                  {data.rounds.map(r=>(
                    <span key={r.roundNum} className="legend-chip">
                      <span className="legend-dot" style={{background:r.color}} />
                      <span style={{color:r.color}}>
                        {r.roundNum === 1 ? "Round 1 (first split)" : `Round ${r.roundNum} (final)`}
                      </span>
                    </span>
                  ))}
                  <span className="legend-dots">. . .</span>
                </div>
              </div>

              {/* Input SQL */}
              <div className="input-sql-section">
                <div className="input-sql-label">Input SQL</div>
                <div className="input-sql-card">
                  <SqlBlock sql={data.sql} accentColor="#DC2626" fontSize={11} />
                </div>
              </div>

              <ArrowDown color="#64748B" />

              {/* Rounds */}
              {data.rounds.map((round, idx) => (
                <div key={round.roundNum}>
                  <PipelineRound round={round} />
                  {idx < data.rounds.length - 1 && (
                    <ArrowDown color="#64748B" dashed />
                  )}
                </div>
              ))}

            </div>
          ) : (
            <div className="empty-state">
              {isRunning ? (
                <>
                  <div className="empty-icon spin">⚙️</div>
                  <div className="empty-title">Processing query...</div>
                </>
              ) : (
                <>
                  {error ? (
                    <>
                      <div className="empty-icon">⚠️</div>
                      <div className="empty-title">Error</div>
                      <div className="empty-text">{error}</div>
                    </>
                  ) : (
                    <>
                      <div className="empty-icon">📊</div>
                      <div className="empty-title">Pipeline Visualization</div>
                      <div className="empty-text">
                        Select parameters and click <strong>Run Query</strong> to see the pipeline.
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
