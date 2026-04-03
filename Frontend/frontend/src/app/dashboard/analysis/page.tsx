"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, TrendingUp, PieChart as PieIcon, Activity, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";

interface LogAnalysis {
  ip_address_or_identifier: string;
  threat_detected:          string;
  details:                  string;
  action:                   string;
}

interface ThreatReport {
  executive_summary: string;
  threat_level:      "Low" | "Medium" | "High" | "Critical";
  log_analyses:      LogAnalysis[];
  error?:            string;
}

const THREAT_COLOR: Record<string, string> = {
  Critical: "#ef4444",
  High:     "#f97316",
  Medium:   "#eab308",
  Low:      "#22c55e",
};

export default function ThreatAnalysisPage() {
  const { activeProjectId } = useDashboard();
  const [report,    setReport]    = useState<ThreatReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const fetchSweep = async () => {
    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      // Prompt requirement: fetch GET /api/threat/sweep
      const res = await fetch(`/api/threat/sweep`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || data.message || "Threat sweep failed.");
        return;
      }
      if (data.error) {
        setError(data.error);
        return;
      }
      setReport(data as ThreatReport);
    } catch {
      setError("Network error — could not reach the backend.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSweep();
  }, []);

  const totalEvents = report?.log_analyses?.length ?? 0;
  const threatLevel = report?.threat_level ?? "Unknown";

  return (
    <div className="flex-1 bg-bg-base text-foreground p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
              <ShieldAlert className="w-8 h-8 text-brand-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Threat Analysis</h1>
              <p className="text-gray-500 text-sm mt-1">Real-time security analytics and behavioral monitoring</p>
            </div>
          </div>
          <button
            id="threat-sweep-refresh-btn"
            onClick={fetchSweep}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-gray-400 hover:text-white hover:border-gray-500 transition-all text-sm bg-[#1a1a1d] hover:bg-[#202024] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Running sweep..." : "Re-run Sweep"}
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
            <p className="text-lg text-gray-400">Running automated threat sweep...</p>
            <p className="text-sm text-gray-600 mt-2">The AI is analyzing logs in logs.db.</p>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="flex items-start gap-3 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl mb-6">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400 mb-1">Sweep Failed</p>
              <p className="text-xs text-red-400/80 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Report */}
        {report && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Severity Card */}
            <div className="lg:col-span-1 bg-[#161618] border border-border rounded-2xl p-8 shadow-xl flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-8">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <PieIcon className="w-5 h-5 text-brand-primary" />
                  Threat Level
                </h2>
              </div>

              <div
                className="w-40 h-40 rounded-full flex items-center justify-center mb-8 border-4"
                style={{
                  borderColor: THREAT_COLOR[report.threat_level] ?? "#888",
                  boxShadow:   `0 0 30px ${THREAT_COLOR[report.threat_level] ?? "#888"}40`,
                }}
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{report.threat_level}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Risk Level</div>
                </div>
              </div>

              <div className="w-full space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total Threats Found</span>
                  <span className="font-medium text-white">{report.log_analyses.length}</span>
                </div>
                {Object.entries(THREAT_COLOR).map(([label, color]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
                      <span className="text-gray-400">{label}</span>
                    </div>
                    <span className="font-medium text-white" style={{ color: report.threat_level === label ? color : undefined }}>
                      {report.threat_level === label ? report.log_analyses.length : 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Activity Stream */}
            <div className="lg:col-span-2 bg-[#161618] border border-border rounded-2xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Activity className="w-5 h-5 text-brand-primary" />
                  Security Insight Stream
                </h2>
                <div className="flex items-center gap-2 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20 animate-pulse">
                  LIVE
                </div>
              </div>

              {/* Executive summary */}
              {report.executive_summary && (
                <div className="mb-6 p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl">
                  <p className="text-xs font-semibold text-brand-primary uppercase tracking-wider mb-1">Executive Summary</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{report.executive_summary}</p>
                </div>
              )}

              {/* Individual threat entries */}
              <div className="space-y-4 overflow-y-auto max-h-[520px] pr-1">
                {report.log_analyses.map((entry, i) => (
                  <div
                    key={i}
                    className="flex gap-4 items-start p-4 hover:bg-white/5 rounded-xl border border-transparent hover:border-border transition-all group"
                  >
                    <div className="p-2 rounded-lg bg-[#0f0f11] group-hover:bg-brand-primary/10 transition-colors shrink-0">
                      <TrendingUp className="w-5 h-5 text-gray-500 group-hover:text-brand-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <h3 className="text-sm font-medium text-white truncate">{entry.threat_detected}</h3>
                        <span
                          className="text-xs font-mono shrink-0 px-2 py-0.5 rounded-full border"
                          style={{
                            color:            THREAT_COLOR[report.threat_level] ?? "#888",
                            borderColor:      `${THREAT_COLOR[report.threat_level] ?? "#888"}40`,
                            backgroundColor:  `${THREAT_COLOR[report.threat_level] ?? "#888"}10`,
                          }}
                        >
                          {entry.ip_address_or_identifier}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed mb-2">{entry.details}</p>
                      <p className="text-xs text-brand-primary/80">
                        <span className="font-semibold text-brand-primary">Action: </span>
                        {entry.action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
