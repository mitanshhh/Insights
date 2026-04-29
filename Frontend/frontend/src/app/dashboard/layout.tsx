"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import RightPanel from "@/components/RightPanel";
import Navbar from "@/components/Navbar";
import { DashboardProvider, useDashboard } from "@/context/DashboardContext";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  // On mobile, sidebar is open by default so user sees it right away.
  // On desktop it's always visible (not a drawer), so this state is irrelevant.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // On desktop always treat sidebar as open; on mobile keep existing state
      if (!mobile) setIsSidebarOpen(true);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    addProject,
    deleteProject,
    isRightPanelOpen,
    setIsRightPanelOpen,
  } = useDashboard();

  return (
    <div className="flex h-screen w-full bg-bg-base text-white overflow-hidden font-sans animate-slide-up-fade relative">
      
      {/* ── Sidebar ─────────────────────────────────────────────────────────
          Desktop: always visible, part of flow (no overlay)
          Mobile:  slide-in drawer with backdrop, open by default            */}
      
      {/* Mobile backdrop */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        className={
          isMobile
            ? `fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`
            : "relative h-full" // Desktop: plain in-flow, NO z-index (avoids stacking context trapping the modal)
        }
      >
        <Sidebar
          projects={projects}
          activeProjectId={activeProjectId}
          onSelectProject={(id) => {
            setActiveProjectId(id);
            if (isMobile) setIsSidebarOpen(false);
          }}
          onAddProject={addProject}
          onDeleteProject={deleteProject}
          onCloseMobile={() => setIsSidebarOpen(false)}
          isMobile={isMobile}
        />
      </div>

      {/* ── Main content area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-base relative overflow-hidden">
        
        {/* Desktop navbar (hidden on mobile) */}
        <div className="hidden md:block">
          <Navbar
            isRightPanelOpen={isRightPanelOpen}
            setIsRightPanelOpen={setIsRightPanelOpen}
            onOpenSidebar={() => setIsSidebarOpen(true)}
          />
        </div>

        {/* Mobile top bar: just a hamburger to open the sidebar */}
        <div className="flex md:hidden h-14 shrink-0 items-center px-4 border-b border-border bg-bg-base/90 backdrop-blur-md z-10">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Open sidebar"
          >
            {/* Hamburger icon */}
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2 ml-3">
            <img src="/logo.png" alt="Insights" className="w-6 h-6 object-contain" />
            <span className="text-white font-bold tracking-tight">Insights</span>
          </div>
        </div>

        {/* Content + optional SQL panel (desktop only) */}
        <div className="flex-1 flex flex-row overflow-hidden">
          {/* Chat / page content – always takes remaining space */}
          <div className="flex-1 overflow-y-auto min-h-0 relative">
            {children}
          </div>

          {/* SQL Investigation panel — DESKTOP ONLY */}
          {isRightPanelOpen && !isMobile && (
            <div className="hidden md:flex w-96 shrink-0 border-l border-border">
              <RightPanel onClose={() => setIsRightPanelOpen(false)} />
            </div>
          )}
        </div>
      </div>
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
