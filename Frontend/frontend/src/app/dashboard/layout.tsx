"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const { 
    projects, 
    activeProjectId, 
    setActiveProjectId, 
    addProject, 
    deleteProject,
    isRightPanelOpen,
    setIsRightPanelOpen
  } = useDashboard();


  return (
    <div className="flex h-screen w-full bg-bg-base text-white overflow-hidden font-sans animate-slide-up-fade">
      <Sidebar 
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onAddProject={addProject}
        onDeleteProject={deleteProject}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-bg-base relative overflow-hidden">
        <Navbar isRightPanelOpen={isRightPanelOpen} setIsRightPanelOpen={setIsRightPanelOpen} />
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
      {isRightPanelOpen && (
        <RightPanel onClose={() => setIsRightPanelOpen(false)} />
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardProvider>
  );
}
