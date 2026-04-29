"use client";

import { useState, useEffect } from "react";
import { User, Mail, Lock, Save, LogOut } from "lucide-react";

const API = "https://insights-aphh.onrender.com";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API}/api/user/profile`);
        if (res.ok) {
          const data = await res.json();
          setName(data.name);
          setUsername(data.username);
        }
      } catch (err) { console.error(err); }
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "info", message: "Updating profile..." });
    try {
      const res = await fetch(`${API}/api/user/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({ name, username })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: "success", message: "Profile updated successfully!" });
        // Instead of immediate reload, wait 1 second so user sees success
        setTimeout(() => window.location.reload(), 1000); 
      } else {
        setStatus({ type: "error", message: data.message || "Failed to update profile" });
      }
    } catch (err) {
      setStatus({ type: "error", message: "Network error. Please try again." });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setStatus({ type: "info", message: "Updating password..." });
    try {
      const res = await fetch(`${API}/api/user/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: "success", message: "Password updated successfully!" });
        setPassword("");
      } else {
        setStatus({ type: "error", message: data.message || "Failed to update password" });
      }
    } catch (err) {
      setStatus({ type: "error", message: "Network error. Please try again." });
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch(`${API}/api/logout`, { method: 'POST' });
      window.location.href = "/";
    } catch (err) {
      window.location.href = "/";
    }
  };

  return (
    <div className="flex-1 bg-bg-base text-foreground p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-10">Account Settings</h1>

        {status.message && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${
            status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
            status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
            'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          }`}>
            {status.message}
          </div>
        )}

        <div className="space-y-8">
          {/* Profile Section */}
          <section className="bg-[#161618] border border-border rounded-2xl p-8 shadow-xl">
            <h2 className="text-lg font-medium mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-brand-primary" />
              General Information
            </h2>
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0f0f11] border border-border rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 block">Username</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-[#0f0f11] border border-border rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
              </div>

              <button type="submit" className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-brand-primary hover:bg-brand-primary-hover text-white transition-all shadow-lg active:scale-[0.98]">
                <Save className="w-4 h-4" />
                Update Profile
              </button>
            </form>
          </section>

          {/* Security Section */}
          <section className="bg-[#161618] border border-border rounded-2xl p-8 shadow-xl">
            <h2 className="text-lg font-medium mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-brand-primary" />
              Security
            </h2>
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 block">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full bg-[#0f0f11] border border-border rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors"
                  />
                </div>
              </div>
              <button type="submit" disabled={!password} className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-white transition-all border border-border disabled:opacity-50">
                Update Password
              </button>
            </form>
          </section>

          {/* Danger Zone */}
          <section className="pt-4">
             <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out from Account
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
