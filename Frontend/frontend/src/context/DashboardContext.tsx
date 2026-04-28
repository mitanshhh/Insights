"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ProjectStatus = "processing" | "ready" | "error";

export type Project = {
  id: string;
  name: string;
  csvUploaded: boolean;
  status: ProjectStatus;
  createdAt: number;
};

export type Message = {
  id: string;
  role: "user" | "agent";
  content: string;
  jsonLog?: string;
};

interface DashboardContextType {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  messages: Record<string, Message[]>;
  isRightPanelOpen: boolean;
  setIsRightPanelOpen: (val: boolean) => void;
  setActiveProjectId: (id: string | null) => void;
  addProject: (name: string) => Promise<void>;
  uploadCSV: (projectId: string, csvFile: File) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  
  // Threat Analysis
  threatReport: any;
  isThreatLoading: boolean;
  runThreatSweep: (pIdToRun?: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

// ── All API calls go through the Next.js proxy (/api/...) ──────────────────
// next.config.ts rewrites /api/:path* → http://127.0.0.1:8000/api/:path*
// This avoids all CORS preflight issues for cross-origin requests including
// multipart/form-data file uploads.
const API = "";  // empty = same-origin, proxy handles routing

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('insights_messages');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  
  // Threat Analysis Storage (Keyed by project ID)
  const [threatReports, setThreatReports] = useState<Record<string, any>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('insights_threat_reports');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });
  const [isThreatLoading, setIsThreatLoading] = useState(false);

  // Auto-persist to localStorage
  useEffect(() => {
    localStorage.setItem('insights_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('insights_threat_reports', JSON.stringify(threatReports));
  }, [threatReports]);
  
  const threatReport = activeProjectId ? threatReports[activeProjectId] : null;

  const getAuthHeaders = (): Record<string, string> => {
    let sid = "";
    if (typeof window !== "undefined") {
        sid = localStorage.getItem("insights_session_id") || "";
        if (!sid) {
            sid = Math.random().toString(36).substring(2) + Date.now().toString(36);
            localStorage.setItem("insights_session_id", sid);
        }
    }
    return { "Authorization": `Bearer ${sid}` };
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API}/api/projects`, { 
          headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = data.map((p: any) => ({
          ...p,
          csvUploaded: !!p.csvUploaded
        }));
        setProjects(normalized);
        if (normalized.length > 0 && !activeProjectId) {
          setActiveProjectId(normalized[0].id);
        }
      }
    } catch (e) {
      console.error("Error fetching projects:", e);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  const addProject = async (name: string) => {
    try {
      const res = await fetch(`${API}/api/project`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(prev => [{ ...data, csvUploaded: false }, ...prev]);
        setActiveProjectId(data.id);
      }
    } catch (e) {
      console.error("Error creating project:", e);
    }
  };

  // ── Upload CSV for a project ──────────────────────────────────────────────
  const uploadCSV = async (projectId: string, csvFile: File) => {
    setProjects(prev =>
      prev.map(p => p.id === projectId ? { ...p, status: "processing" } : p)
    );

    try {
      const formData = new FormData();
      formData.append("project_id", projectId);
      formData.append("csv", csvFile);

      // Go through the Next.js proxy — avoids CORS for FormData uploads
      const res = await fetch(`${API}/api/project/upload`, {
        method: "POST",
        headers: getAuthHeaders(),  // DO NOT set Content-Type — browser sets it with boundary
        body: formData,
      });

      // Safely parse — response may be plain text on proxy/server errors
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        const raw = await res.text().catch(() => "");
        console.error("Upload: non-JSON response from server:", raw);
        data = { message: raw || `Server error (${res.status})` };
      }

      if (res.ok) {
        setProjects(prev =>
          prev.map(p => p.id === projectId ? { ...p, status: "ready", csvUploaded: true } : p)
        );
        // Clear any stale threat report for this project — sweep must be re-run manually
        setThreatReports(prev => ({ ...prev, [projectId]: null }));
      } else {
        const msg = data.message || `Upload failed (${res.status})`;
        console.error("Upload failed:", msg);
        setProjects(prev =>
          prev.map(p => p.id === projectId ? { ...p, status: "error" } : p)
        );
        // Show error in chat so user knows what happened
        setMessages(prev => ({
          ...prev,
          [projectId]: [...(prev[projectId] || []), {
            id: Date.now().toString(),
            role: "agent" as const,
            content: `❌ Upload failed: ${msg}\n\nPlease make sure your backend is running and the CSV file is valid.`
          }]
        }));
      }
    } catch (err: any) {
      const msg = err?.message || "Network error";
      console.error("Upload error:", msg);
      setProjects(prev =>
        prev.map(p => p.id === projectId ? { ...p, status: "error" } : p)
      );
      setMessages(prev => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), {
          id: Date.now().toString(),
          role: "agent" as const,
          content: `❌ Could not reach backend: ${msg}\n\nMake sure the Flask backend is running on port 8000.`
        }]
      }));
    }
  };

  // ── Run Threat Sweep (Analysis) ──────────────────────────────────────────
  const runThreatSweep = React.useCallback(async (pIdToRun?: string) => {
    const pId = pIdToRun || activeProjectId;
    if (!pId) return;
    
    setIsThreatLoading(true);
    try {
      console.log(`[DASHBOARD_CONTEXT] Fetching threat sweep for ${pId}...`);
      const res = await fetch(`${API}/api/project/${pId}/threat-sweep`, { 
          headers: getAuthHeaders(),
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || `Server Error (${res.status})`);
      }

      if (data.error) throw new Error(data.error);
      setThreatReports(prev => ({ ...prev, [pId]: data }));
    } catch (e: any) {
      console.error("[DASHBOARD_CONTEXT] Analysis failed:", e);
      // Store the error in the report state to prevent infinite retry loops in components
      setThreatReports(prev => ({ ...prev, [pId]: { error: e.message || "Unknown error" } }));
      throw e;
    } finally {
      setIsThreatLoading(false);
    }
  }, [activeProject, activeProjectId]);

  const deleteProject = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/project/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== id));
        if (activeProjectId === id) setActiveProjectId(null);
      }
    } catch (e) {
      console.error("Error deleting project:", e);
    }
  };

  // ── Send message → real AI query ──────────────────────────────────────────
  const sendMessage = async (content: string) => {
    if (!activeProjectId) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content };
    setMessages(prev => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] || []), userMsg],
    }));

    const thinkingId = (Date.now() + 1).toString();
    const thinkingMsg: Message = { id: thinkingId, role: "agent", content: "⏳ Analysing..." };
    setMessages(prev => ({
      ...prev,
      [activeProjectId]: [...(prev[activeProjectId] || []), thinkingMsg],
    }));

    try {
      const res = await fetch(`${API}/api/project/${activeProjectId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ question: content }),
      });

      const data = await res.json();
      const answer = data?.answer ?? {};
      const actualAnswer: string = answer.actual_answer ?? data.message ?? "No response received.";
      const jsonLogs: unknown[] = answer.json_logs ?? [];

      const agentMsg: Message = {
        id: thinkingId,
        role: "agent",
        content: actualAnswer,
        jsonLog: jsonLogs.length > 0 ? JSON.stringify(jsonLogs, null, 2) : undefined,
      };

      setMessages(prev => ({
        ...prev,
        [activeProjectId]: (prev[activeProjectId] || []).map(m =>
          m.id === thinkingId ? agentMsg : m
        ),
      }));
    } catch (err) {
      const errMsg: Message = {
        id: thinkingId,
        role: "agent",
        content: "❌ Network error — could not reach the AI engine.",
      };
      setMessages(prev => ({
        ...prev,
        [activeProjectId]: (prev[activeProjectId] || []).map(m =>
          m.id === thinkingId ? errMsg : m
        ),
      }));
    }
  };

  return (
    <DashboardContext.Provider value={{
      projects, activeProjectId, activeProject, messages,
      isRightPanelOpen, setIsRightPanelOpen,
      setActiveProjectId, addProject, uploadCSV, deleteProject, sendMessage,
      threatReport, isThreatLoading, runThreatSweep
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error("useDashboard must be used within DashboardProvider");
  return context;
}
