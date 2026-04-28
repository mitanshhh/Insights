import { useState, useEffect } from "react";
import { Plus, Trash2, X, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Project } from "@/context/DashboardContext";
import { cn } from "@/lib/utils";

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
}

export default function Sidebar({ projects, activeProjectId, onSelectProject, onAddProject, onDeleteProject }: SidebarProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);


  const handleCreate = async () => {
    if (newProjectName.trim()) {
      await onAddProject(newProjectName.trim());
      setIsModalOpen(false);
      setNewProjectName("");
      setCsvFile(null);
    }
  };

  return (
    <div className="w-64 h-full bg-bg-sidebar border-r border-border flex flex-col pt-4 pb-6 px-4 shrink-0">
      {/* Header */}
      <Link href="/dashboard" className="flex items-center gap-3 mb-8 px-2 cursor-pointer group">
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
           <img src="/logo.png" alt="Insights Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white group-hover:text-brand-primary transition-colors">Insights</h1>
      </Link>

      {/* New Project Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-border text-gray-300 hover:text-white hover:border-gray-500 transition-all mb-6 group bg-[#1a1a1d] hover:bg-[#202024] cursor-pointer"
      >
        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
        <span className="font-medium text-sm">New Project</span>
      </button>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-1">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Projects</div>
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => {
              onSelectProject(project.id);
              router.push("/dashboard");
            }}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors group",
              activeProjectId === project.id ? "bg-white/10 text-white" : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm truncate">{project.name}</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
              className="hover:text-red-400 transition-colors p-1 text-gray-600 shrink-0 cursor-pointer border border-red-500/50 hover:border-red-400 rounded"
              title="Delete project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="text-sm text-gray-500 px-2 mt-4 text-center">No projects yet</div>
        )}
      </div>

      {/* Footer Area */}
      <div className="mt-auto pt-4 border-t border-border flex flex-col gap-2">
        {/* Navigation Links */}
        <div className="flex flex-col gap-1 mb-2">
           <Link href="/dashboard" className="px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
              Home
           </Link>
           <Link href="/dashboard" className="px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
              Chat
           </Link>
           <Link href="/dashboard/analysis" className="px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer">
              Threat Analysis
           </Link>
        </div>

      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-[#161618] border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Create New Project</h2>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); setIsModalOpen(false); }} 
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Project Name</label>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., Auth Logs Alpha"
                  className="w-full bg-[#0f0f11] border border-border rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
                  autoFocus
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/5 text-gray-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={!newProjectName.trim()}
                className="px-5 py-2 rounded-xl text-sm font-medium bg-brand-primary hover:bg-brand-primary-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(249,115,22,0.3)] cursor-pointer"
              >
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
