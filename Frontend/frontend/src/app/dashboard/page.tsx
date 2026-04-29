"use client";

import { useDashboard } from "@/context/DashboardContext";
import ChatArea from "@/components/ChatArea";

export default function Home() {
  const { activeProject, messages, activeProjectId, sendMessage, isRightPanelOpen, setIsRightPanelOpen } = useDashboard() as any;
  const projectMessages = activeProjectId ? (messages[activeProjectId] || []) : [];

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-bg-base relative h-full animate-slide-up-fade">
      <ChatArea 
        activeProject={activeProject}
        messages={projectMessages}
        onSendMessage={sendMessage}
      />
    </main>
  );
}
