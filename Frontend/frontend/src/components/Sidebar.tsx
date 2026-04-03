import { useState, useEffect } from "react";
import { Plus, User, Trash2, X, Upload, LogOut, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
  const [userProfile, setUserProfile] = useState<{name: string, username: string} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          setUserProfile(data);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = "/";
    } catch (err) {
      window.location.href = "/";
    }
  };

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
      <Link href="/dashboard" className="flex items-center gap-2 mb-8 px-2 cursor-pointer">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
          <span className="text-white font-bold text-lg">N</span>
        </div>
        <h1 className="text-xl font-semibold tracking-wide text-white">Insights</h1>
      </Link>

      {/* New Project Button */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-border text-gray-300 hover:text-white hover:border-gray-500 transition-all mb-6 group bg-[#1a1a1d] hover:bg-[#202024]"
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
              {/* Status indicator */}
              {project.status === "processing" && (
                <Loader2 className="w-3 h-3 text-yellow-400 animate-spin shrink-0" />
              )}
              {project.status === "ready" && (
                <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
              )}
              {project.status === "error" && (
                <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
              )}
              <span className="text-sm truncate">{project.name}</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
              className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-1"
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
           <Link href="/dashboard/analysis" className="px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
              Threat Analysis
           </Link>
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors mb-1"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>

        {/* User Profile */}
        <div 
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-border/50"
        >
          <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center border border-gray-600">
            <User className="w-5 h-5 text-gray-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{userProfile?.name || 'User'}</div>
            <div className="text-xs text-gray-500 truncate">{userProfile?.username || 'Analyst'}</div>
          </div>
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
                className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/5 text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={!newProjectName.trim()}
                className="px-5 py-2 rounded-xl text-sm font-medium bg-brand-primary hover:bg-brand-primary-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(249,115,22,0.3)]"
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
