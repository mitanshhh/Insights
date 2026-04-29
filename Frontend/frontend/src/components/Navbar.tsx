"use client";

import { Database, ShieldAlert, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavbarProps {
  isRightPanelOpen: boolean;
  setIsRightPanelOpen: (val: boolean) => void;
  onOpenSidebar?: () => void;
}

export default function Navbar({ isRightPanelOpen, setIsRightPanelOpen, onOpenSidebar }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleToggleSQL = () => {
    if (pathname === "/dashboard/analysis") {
      // Redirect back to chat and then toggle
      router.push("/dashboard");
      // Use a small timeout or just toggle if it's via context
      setIsRightPanelOpen(true);
    } else {
      setIsRightPanelOpen(!isRightPanelOpen);
    }
  };

  return (
    <div className="h-16 shrink-0 border-b border-border bg-bg-base/80 backdrop-blur-md flex items-center justify-end px-6 sticky top-0 z-10">
      <div className="flex items-center gap-6">
        
        <Link 
          href="/" 
          className="flex items-center gap-2 transition-colors text-sm font-medium hover:bg-white/5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-brand-primary"
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>

        <Link 
          href="/dashboard/analysis" 
          className={cn(
            "flex items-center gap-2 transition-colors text-sm font-medium hover:bg-white/5 px-3 py-1.5 rounded-lg",
            pathname === "/dashboard/analysis" ? "text-brand-primary bg-brand-primary/10" : "text-gray-400 hover:text-brand-primary"
          )}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Threat Analysis</span>
        </Link>

        <button 
          onClick={handleToggleSQL}
          className={cn(
            "flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5",
            isRightPanelOpen 
              ? "text-brand-primary bg-brand-primary/10" 
              : "text-gray-400 hover:text-brand-primary"
          )}
        >
          <Database className="w-4 h-4" />
          <span>SQL Investigation</span>
        </button>
      </div>
    </div>
  );
}
