"use client";

import { Play, Database, History, X, Terminal, Table as TableIcon, Loader2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
const API = "https://insights-aphh.onrender.com";
interface RightPanelProps {
  onKeepOpen?: boolean;
  onClose: () => void;
}

interface SQLResult {
  columns: string[];
  rows: Record<string, unknown>[];
}

export default function RightPanel({ onClose }: RightPanelProps) {
  const { activeProjectId } = useDashboard();
  const [query, setQuery] = useState("SELECT * FROM security_logs LIMIT 10;");
  const [result, setResult] = useState<SQLResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunQuery = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Prompt requirement: Wire "Run" button to POST /api/sql
      const res = await fetch(`${API}/api/sql`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: query, project_id: activeProjectId || "" }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || data.message || "Query failed.");
        return;
      }

      setResult({ columns: data.columns || [], rows: data.rows || [] });
    } catch (err) {
      setError("Network error — could not reach the backend.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-96 shrink-0 bg-bg-panel border-l border-border flex flex-col pt-4 pb-6 px-5 relative h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-white">
          <Database className="w-5 h-5 text-brand-primary" />
          <h2 className="font-semibold tracking-wide">SQL Investigation</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="text-gray-400 hover:text-white transition-colors p-1 flex items-center justify-center relative z-10 cursor-pointer" 
            title="Close Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex flex-col gap-2 mb-4">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Query Editor</label>
        <div className="relative group">
          <textarea 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-32 bg-[#1a1a1d] border border-border rounded-xl p-4 text-gray-300 font-mono text-sm resize-none focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all"
            spellCheck="false"
          />
          <Terminal className="absolute bottom-3 right-3 w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors pointer-events-none" />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500 font-mono">
            Use <span className="bg-[#1a1a1d] px-1.5 py-0.5 rounded text-gray-300 mx-1">security_logs</span>
          </div>
          <button 
            id="sql-run-btn"
            onClick={handleRunQuery}
            disabled={isLoading || !query.trim()}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)] cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-white pr-0.5" />
            )}
            {isLoading ? "Running..." : "Run Query"}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Results */}
      <div className="flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Results</label>
          {result && (
            <span className="text-xs text-gray-500 font-mono">
              {result.rows.length} row{result.rows.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {!result && !isLoading && !error && (
          <div className="flex-1 bg-[#1a1a1d] border border-border rounded-xl flex flex-col items-center justify-center text-center p-6">
            <TableIcon className="w-8 h-8 text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">Execute a query to view data.</p>
          </div>
        )}

        {isLoading && (
          <div className="flex-1 bg-[#1a1a1d] border border-border rounded-xl flex flex-col items-center justify-center text-center p-6">
            <Loader2 className="w-8 h-8 text-brand-primary/60 mb-3 animate-spin" />
            <p className="text-sm text-gray-400">Running query...</p>
          </div>
        )}

        {result && result.rows.length === 0 && (
          <div className="flex-1 bg-[#1a1a1d] border border-border rounded-xl flex flex-col items-center justify-center text-center p-6">
            <TableIcon className="w-8 h-8 text-gray-600 mb-3" />
            <p className="text-sm text-gray-400">Query returned no rows.</p>
          </div>
        )}

        {result && result.rows.length > 0 && (
          <div className="flex-1 bg-[#1a1a1d] border border-border rounded-xl overflow-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-[#111113] z-10">
                <tr>
                  {result.columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap border-b border-border"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-border/50 hover:bg-white/[0.03] transition-colors"
                  >
                    {result.columns.map((col) => (
                      <td
                        key={col}
                        className="px-3 py-2 text-gray-300 font-mono whitespace-nowrap max-w-[140px] truncate"
                        title={String(row[col] ?? "")}
                      >
                        {String(row[col] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
