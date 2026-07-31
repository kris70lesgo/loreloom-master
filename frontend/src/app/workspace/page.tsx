"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, Image as ImageIcon, Sparkles, Play, RefreshCw, Activity, Layers, ArrowUpRight, Zap, Coins } from "lucide-react";

const HUDCorners = () => (
  <>
    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-zinc-400 dark:border-cyan-500/50 pointer-events-none z-20" />
    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-zinc-400 dark:border-cyan-500/50 pointer-events-none z-20" />
    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-zinc-400 dark:border-cyan-500/50 pointer-events-none z-20" />
    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-zinc-400 dark:border-cyan-500/50 pointer-events-none z-20" />
  </>
);

type LogLevel = "INFO" | "AGENT" | "X402" | "ERROR";

interface LogEntry {
  type: "LOG";
  level: LogLevel;
  message: string;
  timestamp: number;
}

interface ReceiptEntry {
  type: "RECEIPT";
  provider: string;
  category: string;
  cost: string;
  txHash: string;
  status: "SUCCESS" | "REROUTED" | "FAILED";
}

interface ResultEntry {
  type: "RESULT";
  imageUrl: string;
  dimensions: string;
  generationTimeMs: number;
  provider: string;
  chapterId?: string;
}

import { useStory } from "../../context/StoryContext";

export default function ProducerDashboard() {
  const { activeWorld, switchWorld, fetchWorld } = useStory();
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const worldId = params.get("worldId");
      if (worldId && (!activeWorld || activeWorld.id !== worldId)) {
        switchWorld(worldId);
      }
    }
  }, [activeWorld, switchWorld]);

  const [prompt, setPrompt] = useState(
    activeWorld?.premise || activeWorld?.name || "A heroic space opera"
  );
  const [budget, setBudget] = useState(60);
  const [chaosMode, setChaosMode] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [receipts, setReceipts] = useState<ReceiptEntry[]>([]);
  const [result, setResult] = useState<ResultEntry | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasEditedPrompt, setHasEditedPrompt] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeWorld && !hasEditedPrompt) {
      const defaultPrompt = activeWorld.premise || activeWorld.name || "A heroic space opera";
      setPrompt(defaultPrompt);
    }
  }, [activeWorld, hasEditedPrompt]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value);
    setHasEditedPrompt(true);
  };

  const totalSpent = receipts.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    return () => clearTimeout(timeout);
  }, [logs]);

  const authorizeProduction = () => {
    if (!activeWorld) {
      setLogs([{ type: "LOG", level: "ERROR", message: "Select a world before producing artwork so it can be saved.", timestamp: Date.now() }]);
      return;
    }

    setLogs([]);
    setReceipts([]);
    setResult(null);
    setIsRunning(true);

    const eventSource = new EventSource(
      `http://localhost:4000/api/production/stream?prompt=${encodeURIComponent(prompt)}&budget=${budget}&chaos=${chaosMode}&worldId=${encodeURIComponent(activeWorld.id)}`
    );

    eventSource.onmessage = (event) => {
      if (event.data === "[DONE]") {
        eventSource.close();
        setIsRunning(false);
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (data.type === "LOG") {
          setLogs(prev => [...prev, data as LogEntry]);
        } else if (data.type === "RECEIPT") {
          setReceipts(prev => [...prev, data as ReceiptEntry]);
        } else if (data.type === "RESULT") {
          setResult(data as ResultEntry);
          if (activeWorld?.id) {
            void fetchWorld(activeWorld.id);
          }
        }
      } catch (err) {
        console.error("Failed to parse log", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setIsRunning(false);
    };
  };

  const renderLogMessage = (log: LogEntry, index: number) => {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
    let levelBadge = "";
    let styleClass = "";
    
    switch (log.level) {
      case "INFO": 
        styleClass = "text-zinc-400"; 
        levelBadge = "SYS";
        break;
      case "AGENT": 
        styleClass = "text-cyan-400 font-medium"; 
        levelBadge = "AGT";
        break;
      case "X402": 
        styleClass = "text-emerald-400 font-medium"; 
        levelBadge = "X402";
        break;
      case "ERROR": 
        styleClass = "text-rose-400 bg-rose-950/20 px-2 py-0.5 rounded border border-rose-900/30"; 
        levelBadge = "ERR";
        break;
      default: 
        styleClass = "text-zinc-400"; 
        levelBadge = "SYS";
    }

    return (
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        key={index} 
        className="flex items-start gap-2.5 w-full min-w-0 font-mono text-xs tracking-wide leading-relaxed pl-1"
      >
        <span className="text-zinc-600 select-none shrink-0 font-bold w-6 text-right">
          {String(index + 1).padStart(3, '0')}
        </span>
        <span className="text-zinc-500 shrink-0 select-none">[{timestamp}]</span>
        <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded shrink-0 border uppercase tracking-wider select-none ${
          log.level === 'INFO' ? 'bg-zinc-900 border-zinc-800 text-zinc-400' :
          log.level === 'AGENT' ? 'bg-cyan-950/30 border-cyan-900/30 text-cyan-400' :
          log.level === 'X402' ? 'bg-emerald-950/30 border-emerald-900/30 text-emerald-400' :
          'bg-rose-950/40 border-rose-900/40 text-rose-400'
        }`}>
          {levelBadge}
        </span>
        <span className={`${styleClass} min-w-0 break-words flex-1`}>{log.message}</span>
      </motion.div>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .scanline-overlay::after {
          content: "";
          display: block;
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.08) 2px,
            rgba(0,0,0,0.08) 4px
          );
          pointer-events: none;
          z-index: 1;
        }
      `}} />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-200 dark:border-white/8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Producer Console</h1>
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400/80 tracking-widest uppercase font-semibold">Autonomous x402 Procurement Interface</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono px-3 py-1.5 rounded-full shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
          CORE CONNECTED
        </div>
      </div>

      {/* ── Control Bar ────────────────────────────────────────────── */}
      <div className="w-full bg-white/80 dark:bg-[#0D0D11]/90 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-2xl relative min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5 items-end">

          {/* Prompt */}
          <div className="col-span-1 md:col-span-2 lg:col-span-6 flex flex-col gap-2">
            <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-600 dark:text-zinc-500">Production Prompt</label>
            <input
              type="text"
              value={prompt}
              onChange={handlePromptChange}
              placeholder="Describe your scene, character, or world…"
              className="w-full h-[46px] bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-white/10 focus:border-cyan-500 dark:focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 rounded-xl px-4 text-sm outline-none transition-all"
            />
          </div>

          {/* Budget */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-2">
            <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-600 dark:text-zinc-500">Budget (HBAR)</label>
            <div className="relative">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full h-[46px] bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-white/10 focus:border-cyan-500 dark:focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 text-slate-900 dark:text-white rounded-xl pl-4 pr-8 text-sm font-mono outline-none transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 font-mono text-sm">ℏ</span>
            </div>
          </div>

          {/* Chaos Toggle */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-2">
            <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-600 dark:text-zinc-500 opacity-0 select-none">Mode</label>
            <button
              onClick={() => setChaosMode(!chaosMode)}
              className={`w-full h-[46px] rounded-xl flex items-center justify-center gap-2 font-mono text-xs font-semibold transition-all border ${
                chaosMode
                  ? "bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 shadow-sm dark:shadow-[0_0_20px_rgba(244,63,94,0.2)] font-bold"
                  : "bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:border-slate-400 dark:hover:border-white/20 hover:text-slate-800 dark:hover:text-zinc-200"
              }`}
            >
              {chaosMode && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
              {chaosMode ? "CHAOS: ON" : "Chaos Mode"}
            </button>
          </div>

          {/* Authorize */}
          <div className="col-span-1 lg:col-span-2 flex flex-col gap-2">
            <label className="text-[10px] font-mono font-semibold uppercase tracking-widest text-slate-600 dark:text-zinc-500 opacity-0 select-none">Action</label>
            <button
              onClick={authorizeProduction}
              disabled={isRunning}
              className={`w-full h-[46px] rounded-xl font-mono font-bold tracking-widest uppercase text-xs transition-all duration-300 flex items-center justify-center gap-2 ${
                isRunning
                  ? "bg-slate-200 dark:bg-zinc-900 text-slate-400 dark:text-zinc-600 border border-slate-300 dark:border-zinc-800 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-600 to-cyan-600 dark:from-emerald-500 dark:to-cyan-500 hover:opacity-95 text-white font-semibold shadow-md shadow-emerald-500/20 dark:shadow-[0_0_24px_rgba(16,185,129,0.3)] active:scale-[0.99]"
              }`}
            >
              {isRunning ? (
                <><RefreshCw className="animate-spin h-3.5 w-3.5" /><span>RUNNING</span></>
              ) : (
                <><Play size={12} className="fill-current" /><span>AUTHORIZE</span></>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Dual Workspace: Terminal + Canvas ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full min-w-0">

        {/* Agent Execution Terminal */}
        <div className="flex flex-col h-[500px] min-w-0">
          <div className="w-full h-full bg-slate-950 dark:bg-black/90 border border-slate-800 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-xl relative">

            {/* Running progress bar */}
            <div className="h-[2px] w-full bg-slate-800 dark:bg-white/5 shrink-0">
              {isRunning && (
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 10, ease: "linear", repeat: Infinity }}
                />
              )}
            </div>

            {/* Terminal header */}
            <div className="px-6 py-3 bg-slate-900 dark:bg-[#141414] border-b border-slate-800 dark:border-white/8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                  <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                  <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                </div>
                <div className="font-mono font-bold text-xs tracking-wider text-white flex items-center gap-2">
                  <Terminal size={13} className="text-cyan-400" />
                  AGENT EXECUTION LOGS
                </div>
              </div>
              {isRunning ? (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest">LIVE STREAM</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-zinc-700" />
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">STANDBY</span>
                </div>
              )}
            </div>

            {/* Terminal body */}
            <div className="p-6 flex-1 overflow-y-auto font-mono text-xs space-y-2 relative scanline-overlay"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
              {logs.length === 0 && !isRunning && (
                <div className="text-zinc-600 flex h-full items-center justify-center italic tracking-widest uppercase">
                  [ Awaiting runtime authorization ]
                </div>
              )}
              {logs.map((log, i) => renderLogMessage(log, i))}
              {isRunning && (
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs mt-2 pl-7 animate-pulse">
                  <span className="text-cyan-600 font-bold">&gt;&gt;</span>
                  <span>PIPELINE RUNNING</span>
                  <span className="inline-block w-1.5 h-3 bg-cyan-400 animate-[blink_1s_step-start_infinite] align-middle" />
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex flex-col h-[500px] min-w-0">
          <div className="w-full h-full bg-white dark:bg-[#0A0A0E] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-xl shadow-slate-200/50 dark:shadow-2xl relative">

            {/* Canvas header */}
            <div className="px-6 py-3 bg-slate-100 dark:bg-[#141414] border-b border-slate-200 dark:border-white/8 flex items-center justify-between shrink-0">
              <h2 className="text-xs font-mono font-semibold text-slate-700 dark:text-zinc-400 flex items-center gap-2">
                <ImageIcon size={13} className="text-cyan-500 dark:text-cyan-400" />
                MAIN CANVAS
              </h2>
              {result ? (
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold tracking-widest">
                  RENDER COMPLETE
                </span>
              ) : isRunning ? (
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold tracking-widest animate-pulse">
                  SYNTHESIZING
                </span>
              ) : (
                <span className="bg-slate-200/70 dark:bg-white/5 text-slate-500 dark:text-zinc-500 border border-slate-300 dark:border-white/8 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold tracking-widest">
                  AWAITING RUN
                </span>
              )}
            </div>

            {/* Canvas body */}
            <div className="relative w-full flex-1 bg-slate-50/50 dark:bg-black/40 flex items-center justify-center p-6 overflow-hidden">
              {!result ? (
                <div className="flex flex-col items-center justify-center gap-4 w-full h-full">
                  {isRunning ? (
                    <div className="loader-wrapper">
                      <span className="loader-letter">S</span>
                      <span className="loader-letter">y</span>
                      <span className="loader-letter">n</span>
                      <span className="loader-letter">t</span>
                      <span className="loader-letter">h</span>
                      <span className="loader-letter">e</span>
                      <span className="loader-letter">s</span>
                      <span className="loader-letter">i</span>
                      <span className="loader-letter">s</span>
                      <div className="loader" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full border border-dashed border-slate-300 dark:border-zinc-700 flex items-center justify-center">
                        <ImageIcon size={22} className="text-slate-400 dark:text-zinc-600" />
                      </div>
                      <span className="font-mono text-[10px] tracking-[0.25em] text-slate-400 dark:text-zinc-600 uppercase select-none">
                        Awaiting Production
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative w-full h-full flex flex-col items-center justify-center group"
                >
                  <img
                    src={result.imageUrl}
                    alt="Generated Artwork"
                    className="max-h-full max-w-full rounded-xl shadow-2xl object-contain border border-white/10 group-hover:scale-[1.02] transition-transform duration-500"
                  />
                  <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                    <div className="bg-black/70 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-white font-mono text-[10px] font-bold tracking-wider">{result.provider}</span>
                    </div>
                    <div className="bg-black/70 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-lg flex items-center gap-2 text-zinc-400 font-mono text-[10px]">
                      <span>{result.dimensions}</span>
                      <span className="w-px h-3 bg-white/20" />
                      <span>{(result.generationTimeMs / 1000).toFixed(1)}s</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Supply Chain Receipts ───────────────────────────────────── */}
      {receipts.length > 0 && (
        <div className="w-full min-w-0">
          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity size={15} className="text-cyan-500 dark:text-cyan-400" />
              Creative Supply Chain &amp; Receipts
            </h3>
            <span className={`font-mono text-xs px-3 py-1.5 rounded-full border flex items-center gap-2 ${
              totalSpent > budget
                ? "bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-400"
                : "bg-slate-200/70 dark:bg-emerald-500/10 border-slate-300 dark:border-emerald-500/30 text-slate-700 dark:text-emerald-400"
            }`}>
              <Coins size={11} />
              Spent: <strong>{totalSpent.toFixed(2)}</strong> / {budget} ℏ
            </span>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
            <AnimatePresence>
              {receipts.map((r, i) => (
                <motion.div
                  key={r.txHash + i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-[#0D0D11]/80 backdrop-blur-md border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 rounded-xl p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col gap-3 min-w-0"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 flex items-center justify-center shrink-0">
                        <span className="text-cyan-700 dark:text-cyan-400 font-mono font-bold text-[10px]">{String(i + 1).padStart(2, '0')}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider truncate" title={r.provider}>
                        {r.provider}
                      </span>
                    </div>
                    {r.status === "FAILED" ? (
                      <span className="shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 uppercase">FAILED</span>
                    ) : r.status === "REROUTED" || r.provider.includes("Rerouted") ? (
                      <span className="shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 uppercase">RE-ROUTED</span>
                    ) : (
                      <span className="shrink-0 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 uppercase">PURCHASED</span>
                    )}
                  </div>

                  {/* Cost */}
                  <div className={`font-mono text-lg font-bold leading-none ${r.status === 'FAILED' ? 'text-slate-400 dark:text-zinc-600 line-through' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {r.cost} ℏ
                  </div>

                  {/* HashScan link */}
                  <div className="border-t border-slate-100 dark:border-white/5 pt-3 mt-1">
                    <a
                      href={`https://hashscan.io/testnet/transaction/${r.txHash ? r.txHash.replace("@", "-").replace(/\.(?=[^.]*$)/, "-") : ""}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono flex items-center justify-between hover:underline transition-colors group"
                    >
                      <span className="truncate opacity-70 group-hover:opacity-100">{r.txHash}</span>
                      <ArrowUpRight size={11} className="shrink-0 ml-1" />
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </>
  );
}
