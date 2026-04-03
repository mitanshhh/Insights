"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AccountPage() {
  return (
    <div className="min-h-screen bg-bg-base text-white p-8 flex flex-col items-center">
      <div className="max-w-2xl w-full">
        <div className="flex items-center gap-4 mb-10">
          <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-400 hover:text-white transition-colors" />
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Account Overview</h1>
        </div>
        
        <div className="bg-[#161618] border border-border rounded-2xl p-8 shadow-xl text-center">
          <p className="text-gray-400">Account management section coming soon.</p>
        </div>
      </div>
    </div>
  );
}
