"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X, Database, MessageSquare, ShieldAlert } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Project } from "@/context/DashboardContext";
import { cn } from "@/lib/utils";

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onCloseMobile?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
  onDeleteProject,
  onCloseMobile,
  isMobile,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const handleCreate = async () => {
    if (newProjectName.trim()) {
      await onAddProject(newProjectName.trim());
      setIsModalOpen(false);
      setNewProjectName("");
      if (isMobile && onCloseMobile) onCloseMobile();
    }
  };

  const navLinks = [
    { href: "https://github.com/mitanshhh/Insights/blob/main/Sample%20Dataset/OpenSSH_structured.csv", label: "Sample Dataset", icon: <Database className="w-5 h-5" /> },
    { href: "/dashboard", label: "Chat", icon: <MessageSquare className="w-5 h-5" /> },
    { href: "/dashboard/analysis", label: "Threat Analysis", icon: <ShieldAlert className="w-5 h-5" /> },
  ];

  return (
    <div className="w-72 md:w-64 h-full bg-bg-sidebar border-r border-border flex flex-col pt-4 pb-6 px-4 shrink-0">
      
      {/* ── Header: logo + close button (mobile only) ─────────────────── */}
      <div className="flex items-center justify-between mb-6 px-2">
        <Link href="/dashboard" className="flex items-center gap-3 group" onClick={() => isMobile && onCloseMobile?.()}>
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
            <img src="/logo.png" alt="Insights Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white group-hover:text-brand-primary transition-colors">
            Insights
          </h1>
        </Link>

        {isMobile && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── New Project Button ─────────────────────────────────────────── */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-brand-primary/40 text-brand-primary hover:text-white hover:border-brand-primary hover:bg-brand-primary/10 transition-all mb-5 md:mt-4 group bg-brand-primary/5 cursor-pointer"
      >
        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
        <span className="font-semibold text-sm">New Project</span>
      </button>

      {/* ── Projects List ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-3 px-2">
          Projects
        </div>
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => {
              onSelectProject(project.id);
              router.push("/dashboard");
            }}
            className={cn(
              "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors group",
              activeProjectId === project.id
                ? "bg-white/10 text-white"
                : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0",
                activeProjectId === project.id ? "bg-brand-primary" : "bg-gray-700"
              )} />
              <span className="text-sm truncate">{project.name}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteProject(project.id);
              }}
              className="hover:text-red-400 transition-colors p-1 text-gray-700 shrink-0 cursor-pointer rounded hover:bg-red-500/10"
              title="Delete project"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="text-sm text-gray-600 px-2 py-6 text-center">
            No projects yet.<br />
            <span className="text-gray-500">Create one above to get started.</span>
          </div>
        )}
      </div>

      {/* ── Navigation Links (pinned to bottom) ───────────────────────── */}
      <nav className="mt-4 pt-4 border-t border-border flex flex-col gap-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => isMobile && onCloseMobile?.()}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-brand-primary/15 text-brand-primary border border-brand-primary/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <span className={cn(isActive ? "text-brand-primary" : "text-gray-500")}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Create Project Modal ───────────────────────────────────────── */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-[#161618] border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Create New Project</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
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
        </div>,
        document.body
      )}
    </div>
  );
}
