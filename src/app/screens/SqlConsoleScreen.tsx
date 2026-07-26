import { useState, useEffect } from "react";
import { DB, SqlQueryResult } from "../../db/database";
import { MONO } from "../utils/accounting";
import { PanelHeader } from "../components/HeaderBars";

export function SqlConsoleScreen({
  onEsc,
  onRefreshData,
}: {
  onEsc: () => void;
  onRefreshData: () => Promise<void>;
}) {
  const [query, setQuery] = useState("SELECT * FROM vouchers");
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sqlDump, setSqlDump] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const runQuery = async () => {
    setError(null);
    try {
      const res = await DB.executeSql(query);
      setResult(res);
    } catch (err: any) {
      setError(err.message || String(err));
      setResult(null);
    }
  };

  const loadAudit = async () => {
    const logs = await DB.getAuditLogs();
    setAuditLogs(logs.slice(0, 8));
  };

  useEffect(() => {
    runQuery();
    loadAudit();
  }, []);

  const handleExport = async () => {
    const dump = await DB.exportSqlDump();
    setSqlDump(dump);
  };

  const handleReset = async () => {
    if (confirm("Reset local database cache to initial default data?")) {
      await DB.resetDatabase();
      await onRefreshData();
      await runQuery();
      await loadAudit();
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#6b7c8c", fontFamily: MONO, overflow: "hidden" }}>
      <PanelHeader title="IndexedDB Local Cache Console & Debug Inspector" />

      <div style={{ padding: "8px 16px", background: "#ffffff", borderBottom: "1px solid #b0b0b0", display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ color: "#0066cc", fontSize: 12, fontWeight: 700 }}>SQL &gt;</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runQuery();
          }}
          style={{
            flex: 1,
            background: "#ffffff",
            border: "1px solid #b0b0b0",
            color: "#000000",
            padding: "4px 8px",
            fontFamily: MONO,
            fontSize: 12,
            outline: "none",
          }}
          placeholder="Enter SQL query (e.g. SELECT * FROM stock_items)"
        />
        <button
          onClick={runQuery}
          style={{ background: "#0066cc", color: "#ffffff", border: "none", padding: "4px 12px", fontFamily: MONO, fontSize: 12, cursor: "pointer", fontWeight: 700 }}
        >
          Execute SQL
        </button>
        <button
          onClick={handleExport}
          style={{ background: "#e0e0e0", color: "#000000", border: "1px solid #b0b0b0", padding: "4px 10px", fontFamily: MONO, fontSize: 11, cursor: "pointer" }}
        >
          Export Dump
        </button>
        <button
          onClick={handleReset}
          style={{ background: "#d9534f", color: "#ffffff", border: "none", padding: "4px 10px", fontFamily: MONO, fontSize: 11, cursor: "pointer", fontWeight: 700 }}
        >
          Reset Local Cache
        </button>
        <button
          onClick={onEsc}
          style={{ background: "#e0e0e0", color: "#333333", border: "1px solid #b0b0b0", padding: "4px 10px", fontFamily: MONO, fontSize: 11, cursor: "pointer" }}
        >
          Esc Back
        </button>
      </div>

      <div style={{ padding: "4px 16px", background: "#f4f8fb", fontSize: 10, color: "#555555", display: "flex", gap: 16, borderBottom: "1px solid #e0e0e0" }}>
        <span>Preset Queries:</span>
        <span onClick={() => { setQuery("SELECT * FROM stock_items"); }} style={{ color: "#0066cc", cursor: "pointer", textDecoration: "underline" }}>stock_items</span>
        <span onClick={() => { setQuery("SELECT * FROM vouchers"); }} style={{ color: "#0066cc", cursor: "pointer", textDecoration: "underline" }}>vouchers</span>
        <span onClick={() => { setQuery("SELECT * FROM parties"); }} style={{ color: "#0066cc", cursor: "pointer", textDecoration: "underline" }}>parties</span>
        <span onClick={() => { setQuery("SELECT * FROM sync_queue"); }} style={{ color: "#0066cc", cursor: "pointer", textDecoration: "underline" }}>sync_queue</span>
        <span onClick={() => { setQuery("SHOW TABLES"); }} style={{ color: "#0066cc", cursor: "pointer", textDecoration: "underline" }}>SHOW TABLES</span>
        <span onClick={() => { setQuery("DESCRIBE stock_items"); }} style={{ color: "#0066cc", cursor: "pointer", textDecoration: "underline" }}>DESCRIBE stock_items</span>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "8px 16px", background: "#ffffff" }}>
        {error && (
          <div style={{ background: "#fdf2f2", border: "1px solid #f8b4b4", color: "#9b1c1c", padding: "8px", fontSize: 12, marginBottom: 8 }}>
            SQL Error: {error}
          </div>
        )}

        {result && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #b0b0b0" }}>
            <div style={{ background: "#9bc5e2", padding: "6px 8px", color: "#000000", fontSize: 11, borderBottom: "1px solid #7eaac9", fontWeight: 700 }}>
              {result.message} ({result.rowCount} rows)
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#e2edf5", borderBottom: "1px solid #b0b0b0" }}>
                    {result.columns.map((c) => (
                      <th key={c} style={{ color: "#000000", padding: "6px 8px", textAlign: "left", borderRight: "1px solid #b0b0b0" }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f4f8fb", borderBottom: "1px solid #e0e0e0" }}>
                      {row.map((val, j) => (
                        <td key={j} style={{ padding: "4px 8px", borderRight: "1px solid #e0e0e0", color: "#333333" }}>{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {sqlDump && (
          <div style={{ marginTop: 8, height: 160, border: "1px solid #0066cc", background: "#f4f8fb", padding: "8px", overflow: "auto" }}>
            <div style={{ color: "#0066cc", fontSize: 11, marginBottom: 4, fontWeight: 700 }}>Generated SQL Data Dump:</div>
            <pre style={{ color: "#333333", fontSize: 10, fontFamily: MONO, margin: 0 }}>{sqlDump}</pre>
          </div>
        )}

        <div style={{ marginTop: 8, height: 120, border: "1px solid #b0b0b0", background: "#f4f8fb", padding: "4px 8px", overflow: "auto" }}>
          <div style={{ color: "#000000", fontSize: 10, fontWeight: 700, marginBottom: 4 }}>AUDIT LOG &amp; TRANSACTIONS</div>
          {auditLogs.map((a, i) => (
            <div key={i} style={{ fontSize: 10, color: "#555555", borderBottom: "1px solid #e0e0e0", padding: "2px 0" }}>
              <span style={{ color: "#0066cc", fontWeight: 700 }}>[{a.timestamp?.slice(11, 19)}]</span> <span style={{ color: "#000000", fontWeight: 700 }}>{a.action}:</span> {a.details}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
