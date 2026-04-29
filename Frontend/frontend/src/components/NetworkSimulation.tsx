"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape from 'cytoscape';
import { 
  ShieldAlert, 
  Activity, 
  Database, 
  User as UserIcon, 
  Server, 
  Monitor, 
  ChevronRight,
  Loader2,
  X,
  Zap,
  Info
} from 'lucide-react';
import { cn } from "@/lib/utils";

// ── TYPES ──────────────────────────────────────────────────────────────────
interface AttackPathRes {
  attack_path: string[];
  risk: "Low" | "Medium" | "High";
  attack_type: string;
}

const INITIAL_NODES: cytoscape.ElementDefinition[] = [
  { data: { id: 'User-PC', label: 'User-PC', type: 'device', status: 'Safe' } },
  { data: { id: 'Auth-Server', label: 'Auth-Server', type: 'server', status: 'Safe' } },
  { data: { id: 'Database', label: 'Main-DB', type: 'database', status: 'Safe' } },
  { data: { id: 'Admin-WS', label: 'Admin-WS', type: 'device', status: 'Safe' } },
  { data: { id: 'Cloud-Gateway', label: 'Gateway', type: 'server', status: 'Safe' } },
  { data: { id: 'Active-Dir', label: 'Active-Dir', type: 'server', status: 'Safe' } },
  // Edges
  { data: { id: 'e1', source: 'User-PC', target: 'Auth-Server' } },
  { data: { id: 'e2', source: 'Auth-Server', target: 'Database' } },
  { data: { id: 'e3', source: 'Admin-WS', target: 'Auth-Server' } },
  { data: { id: 'e4', source: 'Cloud-Gateway', target: 'Auth-Server' } },
  { data: { id: 'e5', source: 'Auth-Server', target: 'Active-Dir' } }
];

const MOCK_MITRE_MAP: Record<string, string> = {
  'User-PC': 'T1204: User Execution',
  'Auth-Server': 'T1110: Brute Force',
  'Database': 'T1005: Data from Local System',
  'Active-Dir': 'T1484: Domain Policy Modification'
};

// ── COMPONENT ──────────────────────────────────────────────────────────────
export default function NetworkSimulation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [attackRes, setAttackRes] = useState<AttackPathRes | null>(null);
  const [logInput, setLogInput] = useState("");
  const [sessionId, setSessionId] = useState<string>("");

  // ── GRAPH INITIALIZATION ────────────────────────────────────────────────
  useEffect(() => {
    setSessionId(Math.random().toString(36).substring(7).toUpperCase());
    if (!containerRef.current) return;

    const elements: cytoscape.ElementDefinition[] = [
      { data: { id: 'User-PC', label: 'User-PC', type: 'device', status: 'Safe' } },
      { data: { id: 'Auth-Server', label: 'Auth-Server', type: 'server', status: 'Safe' } },
      { data: { id: 'Database', label: 'Main-DB', type: 'database', status: 'Safe' } },
      { data: { id: 'Admin-WS', label: 'Admin-WS', type: 'device', status: 'Safe' } },
      { data: { id: 'Cloud-Gateway', label: 'Gateway', type: 'server', status: 'Safe' } },
      { data: { id: 'Active-Dir', label: 'Active-Dir', type: 'server', status: 'Safe' } },
      { data: { id: 'e1', source: 'User-PC', target: 'Auth-Server' } },
      { data: { id: 'e2', source: 'Auth-Server', target: 'Database' } },
      { data: { id: 'e3', source: 'Admin-WS', target: 'Auth-Server' } },
      { data: { id: 'e4', source: 'Cloud-Gateway', target: 'Auth-Server' } },
      { data: { id: 'e5', source: 'Auth-Server', target: 'Active-Dir' } }
    ];

    let cy: cytoscape.Core;

    const initCy = () => {
      if (!containerRef.current) return;
      
      cy = cytoscape({
        container: containerRef.current,
        elements: elements,
        style: [
          {
            selector: 'node',
            style: {
              'label': 'data(label)',
              'color': '#000000',
              'text-outline-width': '0px',
              'font-size': '12px',
              'font-weight': 'bold',
              'background-color': '#f97316',
              'width': '60px',
              'height': '60px',
              'border-width': '3px',
              'border-color': '#ffffff',
              'text-valign': 'center',
              'text-halign': 'center',
              'overlay-opacity': 0,
              'transition-property': 'background-color, border-color, border-width, width, height',
              'transition-duration': '0.3s'
            } as any
          },
          {
            selector: 'edge',
            style: {
              'width': 3,
              'line-color': '#4b5563',
              'target-arrow-color': '#4b5563',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.6
            } as any
          },
          {
            selector: '.compromised',
            style: {
              'background-color': '#ef4444',
              'border-color': '#ffffff',
              'border-width': '5px',
              'width': '75px',
              'height': '75px',
              'text-outline-width': '0px',
              'z-index': 100
            } as any
          },
          {
            selector: '.attack-edge',
            style: {
              'line-color': '#ef4444',
              'target-arrow-color': '#ef4444',
              'width': 6,
              'opacity': 1,
              'line-style': 'dashed',
              'z-index': 50
            } as any
          }
        ],
        layout: {
          name: 'circle',
          padding: 50,
          fit: true,
          animate: true,
          animationDuration: 1000,
        } as any,
      });

      cy.on('tap', 'node', (evt) => {
        const node = evt.target;
        setSelectedNode({
          id: node.data('id'),
          label: node.data('label'),
          status: node.hasClass('compromised') ? 'Compromised' : 'Safe',
          mitre: MOCK_MITRE_MAP[node.data('id')] || 'No significant threats detected.',
          type: node.data('type')
        });
      });

      cyRef.current = cy;
      
      cy.resize();
      cy.fit();
      cy.center();
    };

    const timer = setTimeout(initCy, 200);

    return () => {
      clearTimeout(timer);
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []);



  // ── ATTACK SIMULATION ────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (!cyRef.current) return;
    setIsAnalyzing(true);
    setAttackRes(null);
    setSelectedNode(null);

    // Reset Graph State
    cyRef.current.elements().removeClass('compromised attack-edge');

    // Artificial Latency
    await new Promise(r => setTimeout(r, 1500));

    // Mock API Response
    const mockRes: AttackPathRes = {
      attack_path: ["User-PC", "Auth-Server", "Database"],
      risk: "High",
      attack_type: logInput.toLowerCase().includes("brute") ? "Brute Force" : "Lateral Movement"
    };

    setAttackRes(mockRes);

    // Animate Step-by-Step
    for (let i = 0; i < mockRes.attack_path.length; i++) {
        const nodeId = mockRes.attack_path[i];
        cyRef.current.getElementById(nodeId).addClass('compromised');
        
        if (i > 0) {
            const prevId = mockRes.attack_path[i-1];
            cyRef.current.edges(`[source="${prevId}"][target="${nodeId}"], [source="${nodeId}"][target="${prevId}"]`).addClass('attack-edge');
        }
        await new Promise(r => setTimeout(r, 600)); // Step delay
    }

    setIsAnalyzing(false);
  }, [logInput]);

  return (
    <div className="flex flex-col h-[80vh] md:h-[700px] w-full bg-bg-base border border-border rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Header Area */}
      <div className="h-16 shrink-0 border-b border-border bg-bg-sidebar/50 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 rounded-lg">
             <Activity className="w-5 h-5 text-brand-primary" />
          </div>
          <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            AI Security Digital Twin
          </h1>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-1.5 px-3 py-1 bg-border/40 rounded-full border border-border/60">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Realtime Engine</span>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Left Panel: Inputs */}
        <div className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-border bg-bg-sidebar/30 p-6 flex flex-col gap-6 z-10 md:overflow-y-auto min-h-[350px] md:min-h-0">
           <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                 <Zap className="w-3 h-3" />
                 Simulation Controller
              </label>
              <div className="relative group">
                <textarea 
                  value={logInput}
                  onChange={(e) => setLogInput(e.target.value)}
                  placeholder="Paste security logs or enter 'Brute force attempt on Auth Server'..."
                  className="w-full bg-bg-panel border border-border rounded-xl p-4 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-all h-32 resize-none"
                />
              </div>
              <button 
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="w-full py-3 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
              >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                {isAnalyzing ? "Analyzing Intent..." : "Run Propagation Sync"}
              </button>
           </div>

           {attackRes && (
             <div className="mt-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5 space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="flex items-center justify-between">
                   <span className="text-xs font-bold text-red-500 uppercase">Detection Alert</span>
                   <div className="px-2 py-0.5 rounded bg-red-500 text-[10px] font-black text-white">HIGH RISK</div>
                </div>
                <div className="space-y-2">
                   <div className="text-sm font-medium text-gray-100">{attackRes.attack_type}</div>
                   <div className="flex flex-col gap-1">
                      {attackRes.attack_path.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[13px] text-gray-400">
                           <div className="w-5 h-5 rounded-full border border-gray-700 flex items-center justify-center text-[10px]">{idx + 1}</div>
                           <span>{step}</span>
                           {idx < attackRes.attack_path.length - 1 && <ChevronRight className="w-3 h-3 text-gray-600" />}
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           <div className="mt-auto space-y-3">
              <div className="text-[10px] text-gray-600 uppercase font-black tracking-tighter">Legend</div>
              <div className="flex flex-col gap-2">
                 <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-border" />
                    <span>Neutral Endpoint</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                    <span>Compromised Node</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 min-h-[400px] md:min-h-0 relative bg-[radial-gradient(circle_at_center,_#111113_0%,_#0f0f11_100%)]">
           <div id="cy-container" ref={containerRef} className="absolute inset-0 w-full h-full z-50" />
           
           {/* Floating HUD elements */}
            <div className="absolute top-6 left-6 p-4 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-[10px] text-gray-500 font-mono pointer-events-none uppercase tracking-widest z-[60] shadow-2xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-ping" />
                <span className="text-gray-300">Session: SOC-DX-{sessionId || "INITIALIZING..."}</span>
              </div>
              <div className="opacity-50">MapMode: GRID-SYNC-CENTER</div>
           </div>
        </div>

        {/* Right Panel: Selected Node Details */}
        <div className="w-full md:w-80 shrink-0 border-t md:border-t-0 md:border-l border-border bg-bg-sidebar/30 flex flex-col z-10 min-h-[350px] md:min-h-0">
           {selectedNode ? (
             <div className="p-6 h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-start justify-between mb-8">
                   <div className="space-y-1">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Asset Details</div>
                      <h2 className="text-xl font-bold text-white">{selectedNode.label}</h2>
                   </div>
                   <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-white/5 rounded-md transition-colors text-gray-400">
                      <X className="w-5 h-5" />
                   </button>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <div className="text-[10px] text-gray-500 font-bold uppercase">Current Integrity</div>
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border",
                        selectedNode.status === 'Safe' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                      )}>
                         {selectedNode.status === 'Safe' ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                         {selectedNode.status}
                      </div>
                   </div>

                   <div className="p-4 rounded-xl bg-bg-panel border border-border space-y-4">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-gray-800 rounded-lg">
                            {selectedNode.type === 'database' ? <Database className="w-4 h-4 text-brand-primary" /> : selectedNode.type === 'server' ? <Server className="w-4 h-4 text-brand-primary" /> : <Monitor className="w-4 h-4 text-brand-primary" />}
                         </div>
                         <div className="text-sm font-medium text-gray-300 capitalize">{selectedNode.type} Node</div>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-border/50">
                         <div className="text-[10px] text-gray-600 font-bold uppercase">Behavioral Correlation</div>
                         <div className="text-xs text-gray-400 leading-relaxed italic">
                            "{selectedNode.mitre}"
                         </div>
                      </div>
                   </div>
                   
                   <div className="mt-auto pt-6 flex flex-col gap-3">
                      <button className="w-full py-2.5 rounded-lg border border-border text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                         Isolation Commands
                      </button>
                      <button className="w-full py-2.5 rounded-lg border border-border text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                         View Log History
                      </button>
                   </div>
                </div>
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center p-12 text-center">
                <Info className="w-10 h-10 text-gray-800 mb-4" />
                <div className="text-sm font-bold text-gray-600 uppercase tracking-widest mb-1">Asset Inspector</div>
                <p className="text-xs text-gray-700 leading-relaxed">
                   Select a node on the digital twin map to view metadata and threat history.
                </p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function CheckCircle2({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
        </svg>
    )
}
