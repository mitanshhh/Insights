"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowRight, Bot, ChevronDown, ChevronUp, User, Upload, Loader2, FileText, CheckCircle2, Activity } from "lucide-react";
import { useDashboard, Project, Message } from "@/context/DashboardContext";
import { cn } from "@/lib/utils";

interface ChatAreaProps {
  activeProject: Project | null;
  messages: Message[];
  onSendMessage: (content: string) => void;
}

export default function ChatArea({ 
  activeProject, 
  messages, 
  onSendMessage
}: ChatAreaProps) {
  const { uploadCSV } = useDashboard() as any;
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeProject) {
      setIsUploading(true);
      await uploadCSV(activeProject.id, file);
      setIsUploading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && activeProject) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  if (!activeProject) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full">
        <Bot className="w-16 h-16 text-gray-700/50 mb-4" />
        <h2 className="text-xl font-medium text-gray-400">Select or create a project to start</h2>
        <p className="text-gray-600 mt-2 max-w-sm">Use the left sidebar to create a new log analysis project or select an existing one.</p>
      </div>
    );
  }

  // ── CSV Upload Flow ────────────────────────────────────────────────────────
  if (!activeProject.csvUploaded) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full bg-[#0d0d0f]">
        <div className="max-w-2xl w-full bg-[#161618] border border-border/60 rounded-3xl p-12 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-8 mx-auto shadow-[0_0_20px_rgba(249,115,22,0.1)]">
            {isUploading ? (
              <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-brand-primary" />
            )}
          </div>
          
          <h2 className="text-2xl font-semibold text-white mb-3">
             Initialize <span className="text-brand-primary">"{activeProject.name}"</span>
          </h2>
          <p className="text-gray-400 mb-10 leading-relaxed">
            Please upload a security log CSV file to start the analysis. 
            Insights will process and classify the logs for querying.
          </p>

          <div className="relative group overflow-hidden">
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className={cn(
              "w-full py-16 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center transition-all group-hover:border-brand-primary/50 group-hover:bg-brand-primary/5",
              isUploading && "opacity-50 cursor-not-allowed"
            )}>
              <div className="flex flex-col items-center gap-4">
                <FileText className="w-12 h-12 text-gray-600 group-hover:text-brand-primary/60 transition-colors" />
                <div className="text-lg text-gray-300 font-medium">
                  {isUploading ? "Processing Logs..." : "Click to select or drag CSV here"}
                </div>
                {!isUploading && <div className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Strictly .CSV format</div>}
              </div>
            </div>
          </div>
          
          {isUploading && (
            <div className="mt-8 flex items-center justify-center gap-3 text-brand-primary text-sm font-medium animate-pulse">
               <Activity className="w-4 h-4" />
               AI Engine is classifying logs...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-8 pb-32 pt-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
          
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center mt-32 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-white mb-3">Insights <span className="text-brand-primary">AI</span></h1>
              <p className="text-gray-400 text-lg mb-8 max-w-md">Ready to analyze logs for {activeProject.name}.</p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="mt-auto px-6 py-8 bg-gradient-to-t from-bg-base via-bg-base/95 to-transparent">
        <div className="max-w-4xl mx-auto">
          <form 
            onSubmit={handleSubmit}
            className="relative bg-[#1a1a1d] border border-border rounded-2xl flex items-center p-2 focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary transition-all shadow-lg"
          >
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Insights or enter query command..."
              className="flex-1 bg-transparent border-none text-white focus:ring-0 px-4 py-3 placeholder-gray-600 outline-none"
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className="p-3 m-1 bg-brand-primary hover:bg-brand-primary-hover disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-all shadow-[0_0_10px_rgba(249,115,22,0.3)]"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
          <div className="text-center mt-3 text-xs text-gray-600 font-medium tracking-wide">
            Insights AI can make mistakes. Verify critical security alerts.
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const [showLog, setShowLog] = useState(false);
  const isAgent = message.role === "agent";

  return (
    <div className={cn(
      "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
      isAgent ? "justify-start" : "justify-end"
    )}>
      <div className={cn(
        "flex gap-4 max-w-[85%]",
        isAgent ? "flex-row" : "flex-row-reverse"
      )}>
        {/* Avatar */}
        <div className="shrink-0 mt-1">
          {isAgent ? (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-600 flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-gray-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2">
          <div className={cn(
            "px-5 py-4 text-[15px] leading-relaxed shadow-sm",
            isAgent 
              ? "bg-[#161618] border border-border text-gray-200 rounded-2xl rounded-tl-sm" 
              : "bg-[#27272a] text-white rounded-2xl rounded-tr-sm"
          )}>
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>

          {/* JSON Log Dropdown (Only for Agent if jsonLog exists) */}
          {isAgent && message.jsonLog && (
            <div className="mt-1">
              <button 
                onClick={() => setShowLog(!showLog)}
                className="flex items-center gap-2 text-xs font-medium text-brand-primary hover:text-brand-primary-hover transition-colors px-1"
              >
                {showLog ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showLog ? "Hide JSON Log" : "View JSON Log"}
              </button>
              
              {showLog && (
                <div className="mt-2 p-4 bg-[#0a0a0c] border border-[#27272a] rounded-xl overflow-x-auto shadow-inner">
                  <pre className="text-[11px] font-mono text-gray-400">
                    {message.jsonLog}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
