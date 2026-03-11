import { useState, useEffect } from "react";
import "./App.css";


/* ─── SQL Syntax Highlighter ─────────────────────────────────────────────── */
const SQL_KW = new Set([
  "SELECT","FROM","WHERE","AND","OR","AS","MIN","MAX","COUNT","SUM","AVG",
  "NOT","LIKE","IN","JOIN","INNER","LEFT","RIGHT","ON","GROUP","BY","ORDER",
  "HAVING","LIMIT","INSERT","UPDATE","DELETE","CREATE","DROP","ALTER","TABLE",
  "SET","INTO","VALUES","NULL","IS","BETWEEN","EXISTS","DISTINCT","UNION",
  "ALL","CASE","WHEN","THEN","ELSE","END","CAST","WITH","FETCH","OFFSET",
]);

const TEMP_TABLE_RE = /^temp\d+/i;

function SqlBlock({ sql, fontSize = 10.5, tempColors = {} }) {
  if (!sql) return null;
  const tokens = sql.split(/(\b\w+\b|'[^']*'|[^\w\s']+|\s+)/g).filter(Boolean);
  return (
    <pre className="sql-block" style={{ fontSize }}>
      <code>
        {tokens.map((tok, i) => {
          if (SQL_KW.has(tok.toUpperCase()))
            return <span key={i} className="sql-kw">{tok}</span>;
          if (/^temp\d+(_\d+)?$/i.test(tok)) {
            const baseTemp = tok.match(/^(temp\d+)/i)[1].toLowerCase();
            const color = tempColors[baseTemp];
            return <span key={i} className="sql-temp" style={color ? { color } : {}}>{tok}</span>;
          }
          if (tok.startsWith("'"))
            return <span key={i} className="sql-str">{tok}</span>;
          return <span key={i}>{tok}</span>;
        })}
      </code>
    </pre>
  );
}

/* ─── Arrow components ───────────────────────────────────────────────────── */
function ArrowRight({ color = "#94A3B8", dashed = false, width = 45 }) {
  return (
    <svg width={width} height="20" viewBox={`0 0 ${width} 20`} className="arrow-h">
      <line x1="0" y1="10" x2={width - 8} y2="10"
        stroke={color} strokeWidth="1.5"
        strokeDasharray={dashed ? "5,3" : "none"} />
      <polygon points={`${width - 7},5.5 ${width},10 ${width - 7},14.5`} fill={color} />
    </svg>
  );
}

function ArrowDown({ color = "#94A3B8", dashed = false, height = 28 }) {
  return (
    <div className="arrow-down-wrap">
      <svg width="20" height={height} viewBox={`0 0 20 ${height}`}>
        <line x1="10" y1="0" x2="10" y2={height - 7}
          stroke={color} strokeWidth="1.5"
          strokeDasharray={dashed ? "5,3" : "none"} />
        <polygon points={`5.5,${height - 7} 10,${height} 14.5,${height - 7}`} fill={color} />
      </svg>
    </div>
  );
}

/* ─── Pipeline Node (clickable) ──────────────────────────────────────────── */
function PipelineNode({ round, isActive, onClick }) {
  return (
    <button
      className={`pipeline-node ${isActive ? "pipeline-node-active" : ""}`}
      style={{
        borderColor: round.color,
        backgroundColor: isActive ? `${round.color}14` : "#fff",
        "--node-color": round.color,
      }}
      onClick={onClick}
    >
      <div className="node-title" style={{ color: round.color }}>{round.subSqlTitle}</div>
      <div className="node-meta">{round.temp.name} &middot; {round.temp.rows.toLocaleString()} rows</div>
      {round.temp.time != null && (
        <div className="node-meta">{round.temp.time.toFixed(1)} ms</div>
      )}
    </button>
  );
}

/* ─── Combined SQL Box (top-right corner, expandable) ───────────────────── */
function CombinedSqlBox({ sql, tempColors }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ position: "absolute", top: "10px", right: "10px", zIndex: 20 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "8px 20px", fontSize: "12px", fontWeight: 800,
          fontFamily: "var(--font-body)", border: "2px solid var(--accent-violet)",
          borderRadius: "var(--radius-md)", cursor: "pointer",
          background: expanded ? "var(--accent-violet)" : "var(--surface)",
          color: expanded ? "#fff" : "var(--accent-violet)",
          transition: "all 0.15s",
          boxShadow: "0 2px 8px rgba(124, 58, 237, 0.2)",
        }}
      >Combined SQL {expanded ? "▲" : "▼"}</button>
      {expanded && (
        <div style={{
          marginTop: "8px", width: "560px", maxHeight: "500px", overflowY: "auto",
          border: "2px solid var(--accent-violet)", borderRadius: "var(--radius-lg)",
          background: "var(--surface)", padding: "14px 18px",
          boxShadow: "0 8px 24px rgba(124, 58, 237, 0.15), 0 2px 6px rgba(0,0,0,0.08)",
        }}>
          <SqlBlock sql={sql} fontSize={11} tempColors={tempColors} />
        </div>
      )}
    </div>
  );
}

/* ─── Scenario Pipeline View ─────────────────────────────────────────────── */
function ScenarioPipeline({ data, activeNode, setActiveNode, useCombineArrow = false }) {
  if (!data) return null;
  if (data.error) return <div className="run-error">{data.error}</div>;

  const tempColors = {};
  data.rounds.forEach(r => {
    if (r.temp.name && r.temp.name !== "result") {
      tempColors[r.temp.name.toLowerCase()] = r.color;
    }
  });

  return (
    <div className="pipeline-content">
      <div className="pipeline-chain">
        {data.rounds.map((round, idx) => (
          <div key={round.roundNum} className="pipeline-chain-item">
            <PipelineNode
              round={round}
              isActive={activeNode === round.roundNum}
              onClick={() => setActiveNode(activeNode === round.roundNum ? null : round.roundNum)}
            />
            {idx < data.rounds.length - 1 && (
              useCombineArrow
                ? <span style={{ padding: "0 6px", fontWeight: 700, color: "#94A3B8", fontSize: "13px" }}>++=</span>
                : <ArrowRight color="#94A3B8" width={32} />
            )}
          </div>
        ))}
      </div>

      {activeNode != null && (() => {
        const round = data.rounds.find(r => r.roundNum === activeNode);
        if (!round) return null;
        return (
          <div className="node-detail" style={{ borderColor: round.color }}>
            <div className="node-detail-header">
              <span className="node-detail-title" style={{ color: round.color }}>{round.subSqlTitle}</span>
              <span className="node-detail-meta">
                {round.temp.name} &middot; {round.temp.rows.toLocaleString()} rows
                {round.temp.time != null && ` \u00b7 ${round.temp.time.toFixed(1)} ms`}
              </span>
            </div>
            <SqlBlock sql={round.subSql} fontSize={11} tempColors={tempColors} />
          </div>
        );
      })()}

      {data.combinedSql && <CombinedSqlBox sql={data.combinedSql} tempColors={tempColors} />}


      <div className="perf-section">
        <div className="perf-box">
          <div className="perf-row">
            <div className="perf-left">
              {data.output.rows.length > 0 && (
                <div className="perf-result-box">
                  <div className="perf-label">Query Result:</div>
                  <div className="perf-table-wrap">
                    <table className="perf-table">
                      <thead>
                        <tr>
                          {data.output.columns.length > 0
                            ? data.output.columns.map((c, i) => <th key={i}>{c}</th>)
                            : data.output.rows[0].map((_, i) => <th key={i}>col {i + 1}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {data.output.rows.slice(0, 5).map((row, i) => (
                          <tr key={i}>{row.map((val, j) => <td key={j}>{val}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            {data.timing && (
              <div className="perf-right">
                <div className="perf-label">Timing Breakdown:</div>
                <div className="perf-timing-grid">
                  <span>SQL Execution</span><span>{data.timing.sqlExecution?.toFixed(2)} ms</span>
                  <span>Fetch Tuples</span><span>{data.timing.fetchTuples?.toFixed(2)} ms</span>
                  <span>Split Time</span><span>{data.timing.splitTime?.toFixed(2)} ms</span>
                  <span>Others</span><span>{data.timing.others?.toFixed(2)} ms</span>
                  <span className="perf-timing-total">Total</span>
                  <span className="perf-timing-total">{data.timing.total?.toFixed(2)} ms</span>
                </div>
              </div>
            )}
          </div>
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
  const [engine, setEngine] = useState("duckdb");
  const [splitStrategy, setSplitStrategy] = useState("relation-center");
  const [cardinalityEstimator, setCardinalityEstimator] = useState(true);
  const [mergeSubPlan, setMergeSubPlan] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeNode, setActiveNode] = useState(null);
  const [activeTab, setActiveTab] = useState("Pipeline");
  const [activeEngine, setActiveEngine] = useState("DuckDB");
  const [activeStrategy, setActiveStrategy] = useState("FK-Center");
  const [activeOption, setActiveOption] = useState("CE On | Combiner On");
  const [scenarioData, setScenarioData] = useState({});
  const [scenarioNode, setScenarioNode] = useState(null);

  /* Load query SQL when selection changes */
  useEffect(() => {
    fetch(`/api/query/${selectedQuery}`)
      .then(r => r.json())
      .then(j => { if (j.sql) setCustomSql(j.sql.replace(/\s+/g, ' ').trim()); })
      .catch(() => {});
  }, [selectedQuery]);

  /* Helper: run a single query and return parsed data */
  const runOne = async (eng, split, ce = cardinalityEstimator, comb = mergeSubPlan) => {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ engine: eng, split, query: selectedQuery, customSql, cardinalityEstimator: ce, mergeSubPlan: comb }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Server error");
    const outputText = json.output.rows.length > 0
      ? `Output: ${json.output.rows.length} row(s) | ${json.output.rows[0].join(" | ")}`
      : "No results";
    return {
      sql: json.originalSql,
      rounds: json.rounds,
      output: { text: outputText, columns: json.output.columns || [], rows: json.output.rows || [] },
      timing: json.timing || null,
      totalTime: json.totalTime || null,
      combinedSql: json.combinedSql || null,
    };
  };

  const handleRun = async () => {
    setIsRunning(true);
    setHasRun(false);
    setError(null);
    setScenarioData({});
    setScenarioNode(null);
    try {
      if (activeTab === "Engines") {
        const engines = [["duckdb","DuckDB"],["postgresql","PostgreSQL"],["umbra","Umbra"],["mariadb","MariaDB"],["opengauss","OpenGauss"]];
        const results = {};
        for (const [eng, label] of engines) {
          try { results[label] = await runOne(eng, splitStrategy); }
          catch (e) { results[label] = { error: e.message }; }
        }
        setScenarioData(results);
        setHasRun(true);
      } else if (activeTab === "Strategies") {
        const strategies = [["relation-center","FK-Center"],["entity-center","PK-Center"],
          ["min-subquery","Min-Subquery"],["node-based","Node-Based"]];
        const results = {};
        for (const [split, label] of strategies) {
          try { results[label] = await runOne(engine, split); }
          catch (e) { results[label] = { error: e.message }; }
        }
        setScenarioData(results);
        setHasRun(true);
      } else if (activeTab === "Options") {
        const combos = [
          ["CE On | Combiner On", true, true],
          ["CE On | Combiner Off", true, false],
          ["CE Off | Combiner On", false, true],
          ["CE Off | Combiner Off", false, false],
        ];
        const results = {};
        for (const [label, ce, comb] of combos) {
          try { results[label] = await runOne(engine, splitStrategy, ce, comb); }
          catch (e) { results[label] = { error: e.message }; }
        }
        setScenarioData(results);
        setHasRun(true);
      } else {
        const result = await runOne(engine, splitStrategy);
        setData(result);
        setActiveNode(null);
        setHasRun(true);
      }
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
        <div className="header-tabs">
          {["Pipeline","Engines","Strategies","Options"].map(tab => (
            <button key={tab}
              className={`htab ${activeTab === tab ? "htab-active" : ""}`}
              onClick={() => {
                setActiveTab(tab);
                if (tab === "Engines") setSplitStrategy("relation-center");
                if (tab === "Strategies") setEngine("duckdb");
              }}>
              {tab}
            </button>
          ))}
        </div>
        <div className="header-url">localhost:5173/aqp-middleware-demo</div>
      </header>

      {/* ── Body ── */}
      <div className="body-layout">
        {/* ── Left: Config ── */}
        <aside className="config-panel">
          <div className="config-box">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <h2 className="config-box-title" style={{ marginBottom: 0 }}>Configuration</h2>
              <button className="run-btn" onClick={handleRun} disabled={isRunning}
                style={{ marginTop: 0, width: "auto", padding: "5px 40px", fontSize: "10px" }}>
                {isRunning ? "Running..." : "Run Query"}
              </button>
            </div>

            <div className="select-row">
              <div className="select-col">
                <label className="field-label">JOB Query</label>
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
              <div className="select-col">
                <label className="field-label">Scenario</label>
                <select className="field-select" value={activeTab}
                  onChange={(e) => {
                    const tab = e.target.value;
                    setActiveTab(tab);
                    if (tab === "Engines") setSplitStrategy("relation-center");
                    if (tab === "Strategies") setEngine("duckdb");
                    setHasRun(false);
                  }}>
                  <option value="Pipeline">Pipeline</option>
                  <option value="Engines">Scenario 1</option>
                  <option value="Strategies">Scenario 2</option>
                  <option value="Options">Scenario 3</option>
                </select>
              </div>
            </div>

            <label className="field-label">Vanilla SQL</label>
            <textarea className="field-textarea" rows={activeTab === "Pipeline" ? 16 : 18}
              placeholder="Enter your custom query here..."
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)} />

            <div className="select-row">
              {/* Engine — show on Pipeline, Strategies, Options */}
              {activeTab !== "Engines" && (
                <div className="select-col">
                  <select className="field-select" value={engine}
                    onChange={(e) => { setEngine(e.target.value); setHasRun(false); }}>
                    {[["postgresql","PostgreSQL"],["duckdb","DuckDB"],["umbra","Umbra"],["mariadb","MariaDB"],["opengauss","OpenGauss"]].map(([v,l])=>(
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* AQP Strategy — show on Pipeline, Engines, Options */}
              {activeTab !== "Strategies" && (
                <div className="select-col">
                  <select className="field-select" value={splitStrategy}
                    onChange={(e) => { setSplitStrategy(e.target.value); setHasRun(false); }}>
                    {[["relation-center","FK-Center"],["entity-center","PK-Center"],
                      ["min-subquery","Min-Subquery"],["node-based","Node-Based"]].map(([v,l])=>(
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Options — hide on Options tab */}
            {activeTab !== "Options" && (
              <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                <button
                  type="button"
                  style={{
                    flex: 1, padding: "5px 8px", fontSize: "10px", fontWeight: 600,
                    fontFamily: "var(--font-body)", border: "none", borderRadius: "var(--radius-sm)",
                    cursor: "pointer", transition: "all 0.15s",
                    background: cardinalityEstimator ? "#1B9C5A" : "#D8DEE8",
                    color: cardinalityEstimator ? "#fff" : "#697386",
                  }}
                  onClick={() => { setCardinalityEstimator(!cardinalityEstimator); setHasRun(false); }}
                >Cardinality Estimator</button>
                <button
                  type="button"
                  style={{
                    flex: 1, padding: "5px 8px", fontSize: "10px", fontWeight: 600,
                    fontFamily: "var(--font-body)", border: "none", borderRadius: "var(--radius-sm)",
                    cursor: "pointer", transition: "all 0.15s",
                    background: mergeSubPlan ? "#1B9C5A" : "#D8DEE8",
                    color: mergeSubPlan ? "#fff" : "#697386",
                  }}
                  onClick={() => { setMergeSubPlan(!mergeSubPlan); setHasRun(false); }}
                >Sub-SQL Combiner</button>
              </div>
            )}

          </div>


          {error && (
            <div className="run-error">{error}</div>
          )}

        </aside>

        {/* ── Right panel ── */}
        <main className="pipeline-panel">
          {activeTab === "Engines" ? (
            <div className="scenario-view">
              <div className="scenario-label">Same AQP strategy ({{"relation-center":"FK-Center","entity-center":"PK-Center","min-subquery":"Min-Subquery","node-based":"Node-Based"}[splitStrategy]}) across different engines</div>
              <div className="scenario-box">
                <div className="scenario-tabs">
                  {["DuckDB","PostgreSQL","Umbra","MariaDB","OpenGauss"].map(eng => (
                    <button key={eng}
                      className={`scenario-tab ${activeEngine === eng ? "scenario-tab-active" : ""}`}
                      onClick={() => { setActiveEngine(eng); setScenarioNode(null); }}>
                      {eng}
                    </button>
                  ))}
                </div>
                <div className="scenario-content">
                  {isRunning ? (
                    <div className="empty-state">
                      <div className="empty-icon spin">&#9881;</div>
                      <div className="empty-title">Processing query...</div>
                    </div>
                  ) : hasRun && scenarioData[activeEngine] ? (
                    <ScenarioPipeline data={scenarioData[activeEngine]} activeNode={scenarioNode} setActiveNode={setScenarioNode} />
                  ) : (
                    <div className="empty-state">
                      <div className="empty-text">Click <strong>Run Query</strong> to compare engines</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === "Strategies" ? (
            <div className="scenario-view">
              <div className="scenario-label">Same engine ({{"postgresql":"PostgreSQL","duckdb":"DuckDB","umbra":"Umbra","mariadb":"MariaDB","opengauss":"OpenGauss"}[engine]}) across different AQP strategies</div>
              <div className="scenario-box">
                <div className="scenario-tabs">
                  {["FK-Center","PK-Center","Min-Subquery","Node-Based"].map(s => (
                    <button key={s}
                      className={`scenario-tab ${activeStrategy === s ? "scenario-tab-active" : ""}`}
                      onClick={() => { setActiveStrategy(s); setScenarioNode(null); }}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className="scenario-content">
                  {isRunning ? (
                    <div className="empty-state">
                      <div className="empty-icon spin">&#9881;</div>
                      <div className="empty-title">Processing query...</div>
                    </div>
                  ) : hasRun && scenarioData[activeStrategy] ? (
                    <ScenarioPipeline data={scenarioData[activeStrategy]} activeNode={scenarioNode} setActiveNode={setScenarioNode} />
                  ) : (
                    <div className="empty-state">
                      <div className="empty-text">Click <strong>Run Query</strong> to compare strategies</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === "Options" ? (
            <div className="scenario-view">
              <div className="scenario-label">Same engine ({{"postgresql":"PostgreSQL","duckdb":"DuckDB","umbra":"Umbra","mariadb":"MariaDB","opengauss":"OpenGauss"}[engine]}) &amp; strategy ({{"relation-center":"FK-Center","entity-center":"PK-Center","min-subquery":"Min-Subquery","node-based":"Node-Based"}[splitStrategy]}) with different options</div>
              <div className="scenario-box">
                <div className="scenario-tabs">
                  {["CE On | Combiner On","CE On | Combiner Off","CE Off | Combiner On","CE Off | Combiner Off"].map(opt => (
                    <button key={opt}
                      className={`scenario-tab ${activeOption === opt ? "scenario-tab-active" : ""}`}
                      onClick={() => { setActiveOption(opt); setScenarioNode(null); }}>
                      {opt}
                    </button>
                  ))}
                </div>
                <div className="scenario-content">
                  {isRunning ? (
                    <div className="empty-state">
                      <div className="empty-icon spin">&#9881;</div>
                      <div className="empty-title">Processing query...</div>
                    </div>
                  ) : hasRun && scenarioData[activeOption] ? (
                    <ScenarioPipeline data={scenarioData[activeOption]} activeNode={scenarioNode} setActiveNode={setScenarioNode} useCombineArrow={activeOption.includes("Combiner On")} />
                  ) : (
                    <div className="empty-state">
                      <div className="empty-text">Click <strong>Run Query</strong> to compare options</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : hasRun && data ? (() => {
            /* Build temp table → color map: each temp gets the color of the round that created it */
            const tempColors = {};
            data.rounds.forEach(r => {
              if (r.temp.name && r.temp.name !== "result") {
                tempColors[r.temp.name.toLowerCase()] = r.color;
              }
            });
            return (
            <div className="pipeline-content">
              {/* Horizontal pipeline chain */}
              <div className="pipeline-chain">
                {data.rounds.map((round, idx) => (
                  <div key={round.roundNum} className="pipeline-chain-item">
                    <PipelineNode
                      round={round}
                      isActive={activeNode === round.roundNum}
                      onClick={() => setActiveNode(activeNode === round.roundNum ? null : round.roundNum)}
                    />
                    {idx < data.rounds.length - 1 && (
                      <ArrowRight color="#94A3B8" width={32} />
                    )}
                  </div>
                ))}
              </div>

              {/* Expanded SQL detail */}
              {activeNode != null && (() => {
                const round = data.rounds.find(r => r.roundNum === activeNode);
                if (!round) return null;
                return (
                  <div className="node-detail" style={{ borderColor: round.color }}>
                    <div className="node-detail-header">
                      <span className="node-detail-title" style={{ color: round.color }}>
                        {round.subSqlTitle}
                      </span>
                      <span className="node-detail-meta">
                        {round.temp.name} &middot; {round.temp.rows.toLocaleString()} rows
                        {round.temp.time != null && ` \u00b7 ${round.temp.time.toFixed(1)} ms`}
                      </span>
                    </div>
                    <SqlBlock sql={round.subSql} fontSize={11} tempColors={tempColors} />
                  </div>
                );
              })()}


              {/* Performance section */}
              <div className="perf-section">
                <div className="perf-box">
                  <div className="perf-row">
                    {/* Left: Query Result + Summary */}
                    <div className="perf-left">
                      {data.output.rows.length > 0 && (
                        <div className="perf-result-box">
                          <div className="perf-label">Query Result:</div>
                          <div className="perf-table-wrap">
                            <table className="perf-table">
                              <thead>
                                <tr>
                                  {data.output.columns.length > 0
                                    ? data.output.columns.map((c, i) => <th key={i}>{c}</th>)
                                    : data.output.rows[0].map((_, i) => <th key={i}>col {i + 1}</th>)
                                  }
                                </tr>
                              </thead>
                              <tbody>
                                {data.output.rows.slice(0, 5).map((row, i) => (
                                  <tr key={i}>
                                    {row.map((val, j) => <td key={j}>{val}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Timing Breakdown */}
                    {data.timing && (
                      <div className="perf-right">
                        <div className="perf-label">Timing Breakdown:</div>
                        <div className="perf-timing-grid">
                          <span>SQL Execution</span><span>{data.timing.sqlExecution?.toFixed(2)} ms</span>
                          <span>Fetch Tuples</span><span>{data.timing.fetchTuples?.toFixed(2)} ms</span>
                          <span>Split Time</span><span>{data.timing.splitTime?.toFixed(2)} ms</span>
                          <span>Others</span><span>{data.timing.others?.toFixed(2)} ms</span>
                          <span className="perf-timing-total">Total</span>
                          <span className="perf-timing-total">{data.timing.total?.toFixed(2)} ms</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
            );
          })() : (
            <div className="empty-state">
              {isRunning ? (
                <>
                  <div className="empty-icon spin">&#9881;</div>
                  <div className="empty-title">Processing query...</div>
                </>
              ) : (
                <>
                  {error ? (
                    <>
                      <div className="empty-icon">&#9888;</div>
                      <div className="empty-title">Error</div>
                      <div className="empty-text">{error}</div>
                    </>
                  ) : (
                    <>
                      <div className="empty-title">Pipeline Visualization</div>
                      <div className="empty-text">
                        Select parameters and click <strong>Run Query</strong> to see the query splitting pipeline.
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
